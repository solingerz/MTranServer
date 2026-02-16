import fs from 'fs/promises';
import { getConfig } from '@/config/index.js';
import * as logger from '@/logger/index.js';
import { initRecords } from '@/models/index.js';
import { cleanupAllEngines } from '@/services/index.js';
import { cleanupLegacyBin } from '@/assets/index.js';
import { checkForUpdate } from '@/utils/update-checker.js';
import { VERSION } from '@/version';
import { createApp } from '@/server/app.js';
import type { ClosableServer } from '@/server/types.js';

async function createServerFromApp(
  app: ReturnType<typeof createApp>,
  host: string,
  port: number
): Promise<ClosableServer> {
  const bunRef = (globalThis as any).Bun;

  if (bunRef?.serve) {
    const bunServer = bunRef.serve({
      hostname: host,
      port,
      fetch: app.fetch,
    });

    return {
      close: (cb?: (err?: Error) => void) => {
        bunServer.stop();
        cb?.();
      },
    };
  }

  const { serve: serveNode } = await import('@hono/node-server');
  const nodeServer = serveNode({
    fetch: app.fetch,
    hostname: host,
    port,
  });

  return {
    close: (cb?: (err?: Error) => void) => nodeServer.close(cb),
  };
}

export async function startServer({ handleSignals = true } = {}) {
  const config = getConfig();

  logger.info('Initializing MTranServer...');

  await fs.mkdir(config.modelDir, { recursive: true });
  await fs.mkdir(config.configDir, { recursive: true });

  await cleanupLegacyBin(config.configDir);

  logger.info('Initializing model records...');
  await initRecords();

  const app = createApp();
  const server = await createServerFromApp(app, config.host, parseInt(config.port, 10));

  logger.important(`MTranServer v${VERSION} is running!`);
  logger.important(`Web UI: http://${config.host}:${config.port}/ui/`);
  logger.important(`Swagger Docs: http://${config.host}:${config.port}/docs/`);
  logger.important(`Log level set to: ${config.logLevel}`);

  if (config.checkUpdate) {
    checkForUpdate();
  }

  const stop = async () => {
    logger.info('Shutting down server...');
    cleanupAllEngines();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    logger.info('Server shutdown complete');
  };

  if (handleSignals) {
    let shuttingDown = false;
    const shutdown = async () => {
      if (shuttingDown) return;
      shuttingDown = true;
      const timeout = setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
      await stop();
      clearTimeout(timeout);
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }

  return { server, stop };
}

export { createApp };

export async function run() {
  const { server } = await startServer({ handleSignals: true });
  return server;
}
