import { Hono } from 'hono';
import { registerCoreMiddleware } from '@/server/middleware/core.js';
import { registerUiSettingsRoutes } from '@/server/routes/ui-settings.js';
import { registerSystemRoutes } from '@/server/routes/system.js';
import { registerTranslationRoutes } from '@/server/routes/translation.js';
import { registerCompatibleRoutes } from '@/server/routes/compatible.js';
import { registerDocsUiRoutes } from '@/server/routes/docs-ui.js';
import type { AppEnv } from '@/server/types.js';

export function createApp() {
  const app = new Hono<AppEnv>({ strict: false });

  registerCoreMiddleware(app);
  registerUiSettingsRoutes(app);
  registerSystemRoutes(app);
  registerTranslationRoutes(app);
  registerCompatibleRoutes(app);
  registerDocsUiRoutes(app);

  app.all('*', (c) => c.text('404', 404));

  return app;
}
