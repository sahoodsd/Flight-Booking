CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'failed');

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);

CREATE TABLE flights (
  id SERIAL PRIMARY KEY,
  airline VARCHAR(100) NOT NULL,
  origin VARCHAR(3) NOT NULL,
  destination VARCHAR(3) NOT NULL,
  departure_date TIMESTAMPTZ NOT NULL,
  fare_cents INTEGER NOT NULL,
  seats_total INTEGER NOT NULL,
  seats_available INTEGER NOT NULL
);
CREATE INDEX idx_flights_search ON flights(origin, destination, departure_date);

CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  flight_id INTEGER NOT NULL REFERENCES flights(id),
  status booking_status NOT NULL DEFAULT 'pending',
  stripe_payment_intent_id VARCHAR(255),
  total_amount_cents INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMPTZ
);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_status ON bookings(status);

CREATE TABLE passengers (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  date_of_birth DATE NOT NULL,
  nationality VARCHAR(100) NOT NULL,
  passport_number VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL,
  contact_number VARCHAR(50) NOT NULL
);
CREATE INDEX idx_passengers_booking_id ON passengers(booking_id);