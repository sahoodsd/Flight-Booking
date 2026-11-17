import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app';
import pool from '../../db/pool';

describe('Get /health',() => {
  afterAll(async () => {
    await pool.end();
  });

  it('reports the database as connected', async () => {
    const res = await request(app).get('/health')
    console.log(res.status);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({status: 'ok', db : 'connected'})
  })

});