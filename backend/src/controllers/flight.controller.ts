import { Request, Response } from 'express';
import * as flightService from '../services/flightService';

export async function search(req: Request, res: Response) {
  const { origin, destination, date, passengers, page, limit } = req.validated as any;
  const result = await flightService.searchFlights({ origin, destination, date, passengers }, { page, limit });
  res.json(result);
}