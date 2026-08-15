import { withTransaction } from '../../db/transaction';
import * as flightService from './flightService';
import { conflict, badRequest, forbidden, notFound } from '../utils/AppError';
import { stripe } from '../utils/stripeClient';
import pool from '../../db/pool';
import { paginationMeta } from '../utils/pagination';

interface PassengerInput {
  full_name: string;
  date_of_birth: string;
  nationality: string;
  passport_number: string;
  email: string;
  contact_number: string;
}

const CANCELLATION_CUTOFF_HOURS = 24;

export async function createBooking(
  userId: number,
  flightId: number,
  passengers: PassengerInput[],
) {
  const booking = await withTransaction(async (client) => {
    const { fare_cents } = await flightService.adjustSeats(
      flightId,
      -passengers.length,
      client,
    );
    const totalAmountCents = fare_cents * passengers.length;

    const bookingResult = await client.query(
      `INSERT INTO bookings (user_id, flight_id, status, total_amount_cents)
       VALUES ($1, $2, 'pending', $3) RETURNING *`,
      [userId, flightId, totalAmountCents],
    );
    const booking = bookingResult.rows[0];

    for (const p of passengers) {
      await client.query(
        `INSERT INTO passengers (booking_id, full_name, date_of_birth, nationality, passport_number, email, contact_number)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          booking.id,
          p.full_name,
          p.date_of_birth,
          p.nationality,
          p.passport_number,
          p.email,
          p.contact_number,
        ],
      );
    }

    return { ...booking, passengers };
  });

  const paymentIntent = await stripe.paymentIntents.create({
    amount: booking.total_amount_cents,
    currency: 'aed',
    metadata: { booking_id: String(booking.id) },
    automatic_payment_methods: {
      enabled: true,
      allow_redirects: 'never', // no return_url needed, card payments never redirect anyway
    },
  });

  await pool.query(
    `UPDATE bookings SET stripe_payment_intent_id = $1 WHERE id = $2`,
    [paymentIntent.id, booking.id],
  );

  return {
    ...booking,
    stripe_payment_intent_id: paymentIntent.id,
    client_secret: paymentIntent.client_secret,
  };
}

export async function getBookingById(
  bookingId: number,
  userId: number,
  role: 'user' | 'admin',
) {
  const result = await pool.query(
    `SELECT b.*, f.airline, f.origin, f.destination, f.departure_date
     FROM bookings b JOIN flights f ON f.id = b.flight_id
     WHERE b.id = $1`,
    [bookingId],
  );
  const booking = result.rows[0];
  if (!booking) throw notFound('Booking not found', 'BOOKING_NOT_FOUND');
  if (role !== 'admin' && booking.user_id !== userId) throw forbidden(); // never leaks existence to a non-owner
  return booking;
}

export async function getOwnBookings(
  userId: number,
  page: number,
  limit: number,
) {
  const offset = (page - 1) * limit;
  const result = await pool.query(
    `SELECT b.id, b.status, b.total_amount_cents, b.created_at, b.cancelled_at,
            f.airline, f.origin, f.destination, f.departure_date,
            COUNT(*) OVER() AS total_count
     FROM bookings b JOIN flights f ON f.id = b.flight_id
     WHERE b.user_id = $1
     ORDER BY b.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset],
  );
  const total = result.rows[0]?.total_count
    ? parseInt(result.rows[0].total_count, 10)
    : 0;
  return {
    bookings: result.rows.map(({ total_count, ...b }) => b),
    pagination: paginationMeta(page, limit, total),
  };
}

export interface AdminBookingFilters {
  status?: string;
  date?: string;
  origin?: string;
  destination?: string;
}

export async function getAllBookingsAdmin(
  filters: AdminBookingFilters,
  page: number,
  limit: number,
) {
  const conditions: string[] = [];
  const values: any[] = [];

  if (filters.status) {
    values.push(filters.status);
    conditions.push(`b.status = $${values.length}`);
  }
  if (filters.date) {
    values.push(filters.date);
    conditions.push(`f.departure_date::date = $${values.length}`);
  }
  if (filters.origin) {
    values.push(filters.origin);
    conditions.push(`f.origin = $${values.length}`);
  }
  if (filters.destination) {
    values.push(filters.destination);
    conditions.push(`f.destination = $${values.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;
  values.push(limit, offset);

  const result = await pool.query(
    `SELECT b.id, b.user_id, b.status, b.total_amount_cents, b.created_at, b.cancelled_at,
            f.airline, f.origin, f.destination, f.departure_date,
            COUNT(*) OVER() AS total_count
     FROM bookings b JOIN flights f ON f.id = b.flight_id
     ${where}
     ORDER BY b.created_at DESC
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values,
  );
  const total = result.rows[0]?.total_count
    ? parseInt(result.rows[0].total_count, 10)
    : 0;
  return {
    bookings: result.rows.map(({ total_count, ...b }) => b),
    pagination: paginationMeta(page, limit, total),
  };
}

export async function getDashboardStats() {
  // one query with FILTER clauses instead of three round trips — avoids the N+1-ish pattern
  const result = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE) AS bookings_today,
      COALESCE(SUM(total_amount_cents) FILTER (WHERE status = 'confirmed'), 0) AS revenue_cents,
      COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_count,
      COUNT(*) FILTER (WHERE status IN ('confirmed', 'cancelled')) AS relevant_count
    FROM bookings
  `);
  const row = result.rows[0];
  const relevant = parseInt(row.relevant_count, 10);
  const cancelled = parseInt(row.cancelled_count, 10);

  return {
    bookings_today: parseInt(row.bookings_today, 10),
    revenue_cents: parseInt(row.revenue_cents, 10),
    // cancellation rate = cancelled / (confirmed + cancelled) — bookings that never got past
    // 'pending'/'failed' aren't counted, since they were never real completed sales to begin with
    cancellation_rate:
      relevant === 0 ? 0 : Math.round((cancelled / relevant) * 1000) / 10,
  };
}

export async function confirmBookingPayment(paymentIntentId: string) {
  return withTransaction(async (client) => {
    const result = await client.query(
      `SELECT id, status FROM bookings WHERE stripe_payment_intent_id = $1 FOR UPDATE`,
      [paymentIntentId],
    );
    const booking = result.rows[0];
    if (!booking) return; // unknown payment intent — ignore, don't error the webhook
    if (booking.status !== 'pending') return; // ALREADY handled — this line is the idempotency guard

    await client.query(
      `UPDATE bookings SET status = 'confirmed' WHERE id = $1`,
      [booking.id],
    );
  });
}

export async function failBookingPayment(paymentIntentId: string) {
  return withTransaction(async (client) => {
    const result = await client.query(
      `SELECT id, status, flight_id FROM bookings WHERE stripe_payment_intent_id = $1 FOR UPDATE`,
      [paymentIntentId],
    );
    const booking = result.rows[0];
    if (!booking || booking.status !== 'pending') return;

    const passengerCount = await client.query(
      `SELECT COUNT(*) FROM passengers WHERE booking_id = $1`,
      [booking.id],
    );
    await flightService.adjustSeats(
      booking.flight_id,
      parseInt(passengerCount.rows[0].count, 10),
      client,
    ); // release seats
    await client.query(`UPDATE bookings SET status = 'failed' WHERE id = $1`, [
      booking.id,
    ]);
  });
}

export async function cancelBooking(
  bookingId: number,
  actingUserId: number,
  actingRole: 'user' | 'admin',
) {
  const result = await pool.query(
    `SELECT b.id, b.user_id, b.status, b.flight_id, b.stripe_payment_intent_id, f.departure_date
     FROM bookings b JOIN flights f ON f.id = b.flight_id
     WHERE b.id = $1`,
    [bookingId],
  );
  const booking = result.rows[0];
  if (!booking) throw notFound('Booking not found', 'BOOKING_NOT_FOUND');

  if (actingRole !== 'admin' && booking.user_id !== actingUserId)
    throw forbidden();

  if (booking.status !== 'confirmed') {
    throw conflict(
      'Only confirmed bookings can be cancelled',
      'INVALID_BOOKING_STATE',
    );
  }

  const cutoffMs = CANCELLATION_CUTOFF_HOURS * 60 * 60 * 1000;
  const withinPolicyWindow =
    new Date(booking.departure_date).getTime() - Date.now() > cutoffMs;

  if (actingRole !== 'admin' && !withinPolicyWindow) {
    throw badRequest(
      `Cancellations must be made at least ${CANCELLATION_CUTOFF_HOURS} hours before departure`,
      'CANCELLATION_WINDOW_PASSED',
    );
  }

  const updateResult = await pool.query(
    `UPDATE bookings SET status = 'cancelled', cancelled_at = now()
     WHERE id = $1 AND status = 'confirmed' RETURNING *`,
    [bookingId],
  );
  if (updateResult.rowCount === 0) {
    throw conflict(
      'Booking was already cancelled or is no longer eligible',
      'ALREADY_CANCELLED',
    );
  }

  if (booking.stripe_payment_intent_id) {
    await stripe.refunds.create({
      payment_intent: booking.stripe_payment_intent_id,
    });
  }

  const passengerCount = await pool.query(
    'SELECT COUNT(*) FROM passengers WHERE booking_id = $1',
    [bookingId],
  );
  await flightService.adjustSeats(
    booking.flight_id,
    parseInt(passengerCount.rows[0].count, 10),
  );

  return updateResult.rows[0];
}

async function pool_query(bookingId: number) {
  const pool = (await import('../../db/pool')).default;
  const result = await pool.query(`SELECT * FROM bookings WHERE id = $1`, [
    bookingId,
  ]);
  return result.rows[0];
}
