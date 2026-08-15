import { withTransaction } from '../../db/transaction';
import * as flightService from './flightService';
import { notFound, forbidden } from '../utils/AppError';

interface PassengerInput {
  full_name: string;
  date_of_birth: string;
  nationality: string;
  passport_number: string;
  email: string;
  contact_number: string;
}

export async function createBooking(userId: number, flightId: number, passengers: PassengerInput[]) {
  return withTransaction(async (client) => {
    // atomic: fails with SOLD_OUT if not enough seats — this is the concurrency guarantee
    const { fare_cents } = await flightService.adjustSeats(flightId, -passengers.length, client);
    const totalAmountCents = fare_cents * passengers.length;

    const bookingResult = await client.query(
      `INSERT INTO bookings (user_id, flight_id, status, total_amount_cents)
       VALUES ($1, $2, 'pending', $3) RETURNING *`,
      [userId, flightId, totalAmountCents]
    );
    const booking = bookingResult.rows[0];

    for (const p of passengers) {
      await client.query(
        `INSERT INTO passengers (booking_id, full_name, date_of_birth, nationality, passport_number, email, contact_number)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [booking.id, p.full_name, p.date_of_birth, p.nationality, p.passport_number, p.email, p.contact_number]
      );
    }

    return { ...booking, passengers };
  });
}

export async function getBookingById(bookingId: number, userId: number, role: 'user' | 'admin') {
  const result = await pool_query(bookingId);
  const booking = result;
  if (!booking) throw notFound('Booking not found', 'BOOKING_NOT_FOUND');
  if (role !== 'admin' && booking.user_id !== userId) throw forbidden(); // ownership check — Phase 8 leans on this too
  return booking;
}

// small helper kept separate so it's easy to reuse in Phase 8 without duplicating the query
async function pool_query(bookingId: number) {
  const pool = (await import('../../db/pool')).default;
  const result = await pool.query(`SELECT * FROM bookings WHERE id = $1`, [bookingId]);
  return result.rows[0];
}