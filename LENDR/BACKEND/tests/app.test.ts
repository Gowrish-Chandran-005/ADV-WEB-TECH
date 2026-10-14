import request from 'supertest';
import express from 'express';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { errorHandler } from '../src/middleware/error-handler';

describe('health endpoints', () => {
  it('reports application health without requiring PostgreSQL', async () => {
    const app = createApp(async () => {
      throw new Error('Database must not be checked by this route.');
    });

    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('returns success when the database health query succeeds', async () => {
    const databaseHealthCheck = vi.fn().mockResolvedValue(undefined);
    const response = await request(createApp(databaseHealthCheck)).get('/api/health/db');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', database: 'connected' });
    expect(databaseHealthCheck).toHaveBeenCalledOnce();
  });

  it('returns service unavailable when the database health query fails', async () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = await request(
      createApp(async () => {
        throw new Error('Connection failed');
      }),
    ).get('/api/health/db');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ status: 'error', database: 'unavailable' });
    expect(response.text).not.toContain('Connection failed');
    expect(errorLog).toHaveBeenCalledOnce();
    errorLog.mockRestore();
  });
});

describe('request handling', () => {
  it('maps PostgreSQL booking overlap violations to HTTP 409', async () => {
    const app = express();
    app.get('/api/bookings', (_request, _response, next) => {
      next({ code: '23P01' });
    });
    app.use(errorHandler);

    const response = await request(app).get('/api/bookings');

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('BOOKING_CONFLICT');
  });

  it('returns a structured 404 response for unknown routes', async () => {
    const response = await request(createApp()).get('/api/not-a-route');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('returns a structured 400 response for malformed JSON', async () => {
    const response = await request(createApp())
      .post('/api/unknown')
      .set('Content-Type', 'application/json')
      .send('{');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_JSON');
  });

  it('sets security headers and disables the Express signature header', async () => {
    const response = await request(createApp()).get('/api/health');

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });
});
