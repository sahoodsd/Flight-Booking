import { z } from 'zod';

const passengerSchema = z.object({
  full_name: z.string().min(1),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date_of_birth must be YYYY-MM-DD'),
  nationality: z.string().min(1),
  passport_number: z.string().min(1),
  email: z.string().email(),
  contact_number: z.string().min(1),
});

export const createBookingSchema = z.object({
  flight_id: z.number().int().positive(),
  passengers: z.array(passengerSchema).min(1, 'At least one passenger is required'),
});