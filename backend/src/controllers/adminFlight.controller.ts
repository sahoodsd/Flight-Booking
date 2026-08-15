import { Request, Response } from 'express';
import * as flightService from '../services/flightService';

export async function create(req: Request, res: Response) {
  const flight = await flightService.createFlight(req.body);
  res.status(201).json({ flight });
}

export async function update(req: Request, res: Response) {
  const flight = await flightService.updateFlight(Number(req.params.id), req.body);
  res.json({ flight });
}

export async function remove(req: Request, res: Response) {
  await flightService.deleteFlight(Number(req.params.id));
  res.status(204).send();
}