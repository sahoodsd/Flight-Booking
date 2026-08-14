import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import pool from '../../db/pool';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  await pool.query('SELECT 1');
  res.json({ status: 'ok', db: 'connected' });
}));

export default router;