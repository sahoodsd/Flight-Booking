import { z } from 'zod';

export const searchFlightsSchema = z.object({
  origin: z.string().length(3).optional(),
  destination: z.string().length(3).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD').optional(),
  passengers: z.coerce.number().int().min(1).max(9).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const createFlightSchema = z.object({
  airline: z.string().min(1),
  origin: z.string().length(3),
  destination: z.string().length(3),
  departure_date: z.string(), // ISO datetime string, e.g. "2026-09-01T10:00:00Z"
  fare_cents: z.number().int().positive(),
  seats_total: z.number().int().positive(),
});

export const updateFlightSchema = createFlightSchema.partial();