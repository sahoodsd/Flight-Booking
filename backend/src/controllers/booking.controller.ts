import { Request, Response } from 'express';
import * as bookingService from '../services/bookingService';

export async function create(req: Request, res: Response) {
  const { flight_id, passengers } = req.body;
  const booking = await bookingService.createBooking(req.user!.userId, flight_id, passengers);
  res.status(201).json({ booking });
}