import { describe, it, expect } from 'vitest';
import { createBookingSchema } from './booking.validators';

describe('createBookingSchema', () => {
  it('rejects a booking with no passengers', () => {
    const result = createBookingSchema.safeParse({
      flight_id: 1,
      passengers: [],
    });
    // console.log(result);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(
      'At least one passenger is required',
    );
  });
  it('it accepts with valid data', () => {
    const result = createBookingSchema.safeParse({
      flight_id: 1,
      passengers: [
        {
          full_name: 'Muhammed',
          date_of_birth: '1999-05-01',
          nationality: 'Indian',
          passport_number: '1234',
          email: 'test@test.com',
          contact_number: '7560996257',
        },
      ],
    });
    expect(result.success).toBe(true);
    
  });
});
