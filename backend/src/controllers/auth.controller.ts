import { Request, Response } from 'express';
import * as authService from '../services/authService';

const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: REFRESH_COOKIE_MAX_AGE,
    path: '/auth', // only sent to auth endpoints, not every request
  });
}

export async function register(req: Request, res: Response) {
  const { email, password } = req.body;
  const user = await authService.registerUser(email, password);
  res.status(201).json({ user });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  const user = await authService.validateCredentials(email, password);
  const { accessToken, refreshToken } = await authService.issueTokenPair(user.id, user.role);
  setRefreshCookie(res, refreshToken);
  res.json({ accessToken, user });
}

export async function refresh(req: Request, res: Response) {
  const rawToken = req.cookies[REFRESH_COOKIE_NAME];
  if (!rawToken) return res.status(401).json({ error: { message: 'No refresh token', code: 'NO_REFRESH_TOKEN' } });

  const { accessToken, refreshToken } = await authService.rotateRefreshToken(rawToken);
  setRefreshCookie(res, refreshToken);
  res.json({ accessToken });
}

export async function logout(req: Request, res: Response) {
  const rawToken = req.cookies[REFRESH_COOKIE_NAME];
  if (rawToken) await authService.revokeRefreshToken(rawToken);
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/auth' });
  res.status(204).send();
}