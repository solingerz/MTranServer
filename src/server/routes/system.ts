import type { Hono } from 'hono';
import { getVersion } from '@/version';
import type { AppEnv } from '@/server/types.js';

export function registerSystemRoutes(app: Hono<AppEnv>) {
  app.get('/version', (c) => c.json({ version: getVersion() }));
  app.get('/health', (c) => c.json({ status: 'ok' }));
  app.get('/__heartbeat__', (c) => c.body(null, 200));
  app.get('/__lbheartbeat__', (c) => c.body(null, 200));
}
