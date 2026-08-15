import { withTransaction } from '../../db/transaction';
import * as flightService from './flightService';
import { notFound, forbidden } from '../utils/AppError';
import { stripe } from '../utils/stripeClient';
import pool from '../../db/pool';

interface PassengerInput {
  full_name: string;
  date_of_birth: string;
  nationality: string;
  passport_number: string;
  email: string;
  contact_number: string;
}

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
  const result = await pool_query(bookingId);
  const booking = result;
  if (!booking) throw notFound('Booking not found', 'BOOKING_NOT_FOUND');
  if (role !== 'admin' && booking.user_id !== userId) throw forbidden();
  return booking;
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

async function pool_query(bookingId: number) {
  const pool = (await import('../../db/pool')).default;
  const result = await pool.query(`SELECT * FROM bookings WHERE id = $1`, [
    bookingId,
  ]);
  return result.rows[0];
}
