import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import healthRoutes from './routes/health.routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(cookieParser());
app.use(express.json());

app.use('/health', healthRoutes);
// later phases mount here: app.use('/auth', authRoutes); app.use('/flights', flightRoutes); etc.

app.use(notFoundHandler);
app.use(errorHandler); // must be last

export default app;