# Flight Booking

This is my submission for the Full Stack Developer. It's a small flight booking system — search flights, book them, pay with Stripe, cancel if you need to. Backend is Node/Express/TypeScript with plain SQL (no ORM), Postgres for the database, React on the frontend.

I've tried to keep things simple rather than clever

## Getting it running

You'll need Postgres running locally (any way you like — Docker, a native install, DBngin, whatever) and Node installed.

1. Install dependencies in both folders:
   ```
   cd backend && npm install
   cd frontend && npm install
   ```
2. Create a database, e.g. `flight_booking`.
3. Copy `.env.example` to `.env` in both `backend/` and `frontend/`, and fill in your actual values — see the table below for what each one means.
4. Set up the schema and load some mock flights:
   ```
   cd backend
   npm run migrate
   npm run seed
   ```
5. Run the backend and frontend in separate terminals:
   ```
   npm run dev     # in backend/
   npm run dev     # in frontend/
   ```
6. To actually test payments, you'll also need the Stripe CLI running in a third terminal:
   ```
   stripe listen --forward-to localhost:4000/webhooks/stripe
   ```
   It'll print a `whsec_...` value — drop that into `backend/.env` as `STRIPE_WEBHOOK_SECRET` and restart the backend so it picks it up.

To try it as an admin, register a normal account through the app, then promote it manually in the DB (there's deliberately no self-serve way to become an admin):

```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

You'll need to log out and back in afterwards — the role is baked into the JWT at login time, so it won't update on an already-issued token.

## Environment variables

**backend/.env**
| Variable | What it's for |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `JWT_ACCESS_SECRET` | Signs the short-lived access token |
| `STRIPE_SECRET_KEY` | Your Stripe test secret key |
| `STRIPE_WEBHOOK_SECRET` | From `stripe listen`, verifies webhook events are really from Stripe |
| `PORT` | Defaults to 4000 |

**frontend/.env**
| Variable | What it's for |
|---|---|
| `VITE_API_URL` | Where the backend is running, e.g. `http://localhost:4000` |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Your Stripe test publishable key (safe to expose client-side) |

## Mock data

Flights are seeded via `backend/db/seed.ts` — about 20 flights across a handful of routes. One of them is deliberately seeded with just 1 seat available, which is what I used to test the concurrent-booking scenario (two requests racing for the last seat).
