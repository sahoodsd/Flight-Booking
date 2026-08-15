import { Request, Response } from 'express';
import * as bookingService from '../services/bookingService';

export async function create(req: Request, res: Response) {
  const { flight_id, passengers } = req.body;
  const booking = await bookingService.createBooking(
    req.user!.userId,
    flight_id,
    passengers,
  );
  res.status(201).json({ booking });
}

export async function cancel(req: Request, res: Response) {
  const booking = await bookingService.cancelBooking(
    Number(req.params.id),
    req.user!.userId,
    req.user!.role,
  );
  res.json({ booking });
}

export async function listMine(req: Request, res: Response) {
  const { page, limit } = req.validated as any;
  const result = await bookingService.getOwnBookings(
    req.user!.userId,
    page,
    limit,
  );
  res.json(result);
}

export async function getOne(req: Request, res: Response) {
  const booking = await bookingService.getBookingById(
    Number(req.params.id),
    req.user!.userId,
    req.user!.role,
  );
  res.json({ booking });
}
