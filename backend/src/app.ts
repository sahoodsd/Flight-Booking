import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';
import flightRoutes from './routes/flight.routes';
import adminFlightRoutes from './routes/adminFlight.routes';
import bookingRoutes from './routes/booking.routes';
import webhookRoutes from './routes/webhook.routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import adminBookingRoutes from './routes/adminBooking.routes';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  }),
);
app.use(cookieParser());

// must come BEFORE express.json() — Stripe needs the raw body for signature verification
app.use('/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

app.use(express.json());

app.use('/health', healthRoutes);
app.use('/auth', authRoutes);
app.use('/flights', flightRoutes);
app.use('/admin/flights', adminFlightRoutes);
app.use('/bookings', bookingRoutes);
app.use('/admin/bookings', adminBookingRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
