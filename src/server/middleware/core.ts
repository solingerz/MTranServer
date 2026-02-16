import crypto from 'crypto';
import { HTTPException } from 'hono/http-exception';
import type { Hono } from 'hono';
import { getConfig } from '@/config/index.js';
import * as logger from '@/logger/index.js';
import type { AppEnv } from '@/server/types.js';

export function registerCoreMiddleware(app: Hono<AppEnv>) {
  app.use('*', async (c, next) => {
    const id = c.req.header('x-request-id') || crypto.randomUUID();
    c.set('requestId', id);

    c.header('Access-Control-Allow-Origin', '*');
    c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Token');
    c.header('Access-Control-Max-Age', '86400');
    c.header('X-Request-ID', id);

    if (c.req.method === 'OPTIONS') {
      return c.body(null, 204);
    }

    const startedAt = Date.now();
    await next();

    if (getConfig().logRequests) {
      const duration = ((Date.now() - startedAt) / 1000).toFixed(2);
      const ip = c.req.header('x-real-ip') || c.req.header('x-forwarded-for') || '-';
      logger.important(
        `${c.req.method} ${c.res.status} ${c.req.path} ${duration}s ${c.res.headers.get('content-length') || 0}b - ${ip}`
      );
    }
  });

  app.onError((err, c) => {
    const requestId = c.get('requestId') || '-';
    const status = err instanceof HTTPException ? err.status : ((err as any)?.status || 500);
    const message = (err as Error).message || 'Unknown error';
    const isClientError = status >= 400 && status < 500;

    if (status === 401) {
      logger.warn(`[${requestId}] Unauthorized`);
      return c.json({ error: 'Unauthorized', requestId }, 401);
    }

    if (isClientError) {
      logger.warn(`[${requestId}] Client Error: ${status} ${message}`);
      return c.json(
        {
          error: 'Bad Request',
          message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : message,
          requestId,
        },
        status
      );
    }

    logger.error(`[${requestId}] Unhandled Error: ${message}`, err);
    return c.json(
      {
        error: 'Internal Server Error',
        message:
          process.env.NODE_ENV === 'production'
            ? 'An unexpected error occurred'
            : message,
        requestId,
      },
      500
    );
  });
}
