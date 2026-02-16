import type { Hono } from 'hono';
import { registerGoogleCompatibleRoutes } from '@/server/routes/compatible/google.js';
import { registerDeepLCompatibleRoutes } from '@/server/routes/compatible/deepl.js';
import { registerDeepLXCompatibleRoutes } from '@/server/routes/compatible/deeplx.js';
import { registerImmeCompatibleRoutes } from '@/server/routes/compatible/imme.js';
import { registerHcfyCompatibleRoutes } from '@/server/routes/compatible/hcfy.js';
import { registerKissCompatibleRoutes } from '@/server/routes/compatible/kiss.js';
import type { AppEnv } from '@/server/types.js';

export function registerCompatibleRoutes(app: Hono<AppEnv>) {
  registerGoogleCompatibleRoutes(app);
  registerDeepLCompatibleRoutes(app);
  registerDeepLXCompatibleRoutes(app);
  registerImmeCompatibleRoutes(app);
  registerHcfyCompatibleRoutes(app);
  registerKissCompatibleRoutes(app);
}
