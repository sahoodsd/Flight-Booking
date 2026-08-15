import { Request, Response } from 'express';
import * as bookingService from '../services/bookingService';

export async function list(req: Request, res: Response) {
  const { status, date, origin, destination, page, limit } =
    req.validated as any;
  const result = await bookingService.getAllBookingsAdmin(
    { status, date, origin, destination },
    page,
    limit,
  );
  res.json(result);
}

export async function dashboard(req: Request, res: Response) {
  const stats = await bookingService.getDashboardStats();
  res.json(stats);
}
