import bcrypt from 'bcrypt';
import pool from '../../db/pool';
import { conflict, unauthorized } from '../utils/AppError';
import { signAccessToken, generateRefreshToken, hashRefreshToken } from '../utils/tokens';

export async function registerUser(email: string, password: string) {
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length) throw conflict('Email already registered', 'EMAIL_TAKEN');

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'user') RETURNING id, email, role`,
    [email, passwordHash]
  );
  return result.rows[0];
}

export async function validateCredentials(email: string, password: string) {
  const result = await pool.query('SELECT id, email, password_hash, role FROM users WHERE email = $1', [email]);
  const user = result.rows[0];
  if (!user) throw unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) throw unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');

  return { id: user.id, email: user.email, role: user.role };
}

export async function issueTokenPair(userId: number, role: 'user' | 'admin') {
  const accessToken = signAccessToken({ userId, role });
  const { token: refreshToken, hash, expiresAt } = generateRefreshToken();

  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [userId, hash, expiresAt]
  );

  return { accessToken, refreshToken };
}

// this is the rotation logic the assignment is specifically testing
export async function rotateRefreshToken(rawToken: string) {
  const hash = hashRefreshToken(rawToken);

  const result = await pool.query(
    `SELECT rt.id, rt.user_id, rt.expires_at, rt.revoked_at, u.role
     FROM refresh_tokens rt JOIN users u ON u.id = rt.user_id
     WHERE rt.token_hash = $1`,
    [hash]
  );
  const record = result.rows[0];

  if (!record || record.revoked_at || new Date(record.expires_at) < new Date()) {
    throw unauthorized('Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
  }

  await pool.query('UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1', [record.id]);
  return issueTokenPair(record.user_id, record.role);
}

export async function revokeRefreshToken(rawToken: string) {
  const hash = hashRefreshToken(rawToken);
  await pool.query(
    `UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL`,
    [hash]
  );
}