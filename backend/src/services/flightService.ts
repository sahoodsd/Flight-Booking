import { PoolClient } from 'pg';
import pool from '../../db/pool';
import { notFound, conflict, badRequest } from '../utils/AppError';

export interface FlightSearchFilters {
  origin?: string;
  destination?: string;
  date?: string;
  passengers?: number;
}
export interface PaginationParams {
  page: number;
  limit: number;
}

const LIST_FIELDS = `id, airline, origin, destination, departure_date, fare_cents, seats_available`;

export async function searchFlights(filters: FlightSearchFilters, pagination: PaginationParams) {
  const conditions: string[] = [];
  const values: any[] = [];

  if (filters.origin) { values.push(filters.origin); conditions.push(`origin = $${values.length}`); }
  if (filters.destination) { values.push(filters.destination); conditions.push(`destination = $${values.length}`); }
  if (filters.date) { values.push(filters.date); conditions.push(`departure_date::date = $${values.length}`); }
  if (filters.passengers) { values.push(filters.passengers); conditions.push(`seats_available >= $${values.length}`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { page, limit } = pagination;
  const offset = (page - 1) * limit;

  values.push(limit, offset);
  const limitParam = values.length - 1;
  const offsetParam = values.length;

  // COUNT(*) OVER() gets the total alongside the page in one round trip instead of two queries
  const query = `
    SELECT ${LIST_FIELDS}, COUNT(*) OVER() AS total_count
    FROM flights
    ${where}
    ORDER BY departure_date ASC
    LIMIT $${limitParam} OFFSET $${offsetParam}
  `;

  const result = await pool.query(query, values);
  const total = result.rows[0]?.total_count ? parseInt(result.rows[0].total_count, 10) : 0;

  return {
    flights: result.rows.map(({ total_count, ...flight }) => flight),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getFlightById(id: number) {
  const result = await pool.query(`SELECT * FROM flights WHERE id = $1`, [id]);
  if (!result.rows[0]) throw notFound('Flight not found', 'FLIGHT_NOT_FOUND');
  return result.rows[0];
}

export async function adjustSeats(flightId: number, delta: number, client: PoolClient | typeof pool = pool) {
  const result = await client.query(
    `UPDATE flights SET seats_available = seats_available + $1
     WHERE id = $2 AND seats_available + $1 >= 0
     RETURNING seats_available, fare_cents`,
    [delta, flightId]
  );
  if (result.rowCount === 0) throw conflict('Not enough seats available', 'SOLD_OUT');
  return result.rows[0];
}

export async function createFlight(data: {
  airline: string; origin: string; destination: string;
  departure_date: string; fare_cents: number; seats_total: number;
}) {
  const { airline, origin, destination, departure_date, fare_cents, seats_total } = data;
  const result = await pool.query(
    `INSERT INTO flights (airline, origin, destination, departure_date, fare_cents, seats_total, seats_available)
     VALUES ($1,$2,$3,$4,$5,$6,$6) RETURNING *`,
    [airline, origin, destination, departure_date, fare_cents, seats_total]
  );
  return result.rows[0];
}

export async function updateFlight(id: number, data: Record<string, any>) {
  const fields = Object.keys(data);
  if (!fields.length) throw badRequest('No fields to update', 'EMPTY_UPDATE');

  const setClauses = fields.map((f, i) => `${f} = $${i + 1}`);
  const values = fields.map(f => data[f]);
  values.push(id);

  const result = await pool.query(
    `UPDATE flights SET ${setClauses.join(', ')} WHERE id = $${values.length} RETURNING *`,
    values
  );
  if (!result.rows[0]) throw notFound('Flight not found', 'FLIGHT_NOT_FOUND');
  return result.rows[0];
}

export async function deleteFlight(id: number) {
  const result = await pool.query(`DELETE FROM flights WHERE id = $1 RETURNING id`, [id]);
  if (!result.rowCount) throw notFound('Flight not found', 'FLIGHT_NOT_FOUND');
}