import type { Hono } from 'hono';
import { getConfig, setConfig, resetConfig, saveConfigFile, clearConfigFile } from '@/config/index.js';
import * as logger from '@/logger/index.js';
import { VERSION } from '@/version';
import { parseJsonBody } from '@/server/http.js';
import type { AppEnv } from '@/server/types.js';

function toNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  return fallback;
}

function toString(value: unknown, fallback: string): string {
  if (typeof value === 'string') return value;
  return fallback;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function getSettingsPayload() {
  const current = getConfig();
  return {
    config: {
      locale: 'system',
      server: {
        host: current.host,
        port: Number(current.port),
        logLevel: current.logLevel,
        enableWebUI: current.enableWebUI,
        enableOfflineMode: current.enableOfflineMode,
        workerIdleTimeout: current.workerIdleTimeout,
        workersPerLanguage: current.workersPerLanguage,
        maxActiveEngines: current.maxActiveEngines,
        apiToken: current.apiToken,
        logDir: current.logDir,
        logToFile: current.logToFile,
        logConsole: current.logConsole,
        logRequests: current.logRequests,
        maxSentenceLength: current.maxSentenceLength,
        fullwidthZhPunctuation: current.fullwidthZhPunctuation,
        checkUpdate: current.checkUpdate,
        cacheSize: current.cacheSize,
        modelDir: current.modelDir,
        configDir: current.configDir,
      },
    },
    status: 'running',
    version: VERSION,
  };
}

function applyServerConfig(input: Record<string, unknown>) {
  const current = getConfig();
  const next = {
    host: toString(input.host, current.host),
    port: String(toNumber(input.port, Number(current.port))),
    logLevel: toString(input.logLevel, current.logLevel),
    enableWebUI: toBool(input.enableWebUI, current.enableWebUI),
    enableOfflineMode: toBool(input.enableOfflineMode, current.enableOfflineMode),
    workerIdleTimeout: toNumber(input.workerIdleTimeout, current.workerIdleTimeout),
    workersPerLanguage: toNumber(input.workersPerLanguage, current.workersPerLanguage),
    maxActiveEngines: toNumber(input.maxActiveEngines, current.maxActiveEngines),
    apiToken: toString(input.apiToken, current.apiToken),
    logDir: toString(input.logDir, current.logDir),
    logToFile: toBool(input.logToFile, current.logToFile),
    logConsole: toBool(input.logConsole, current.logConsole),
    logRequests: toBool(input.logRequests, current.logRequests),
    maxSentenceLength: toNumber(input.maxSentenceLength, current.maxSentenceLength),
    fullwidthZhPunctuation: toBool(input.fullwidthZhPunctuation, current.fullwidthZhPunctuation),
    checkUpdate: toBool(input.checkUpdate, current.checkUpdate),
    cacheSize: toNumber(input.cacheSize, current.cacheSize),
    modelDir: toString(input.modelDir, current.modelDir),
    configDir: toString(input.configDir, current.configDir),
  };

  setConfig(next);
  saveConfigFile(next);
  logger.setLogLevel(next.logLevel as any);
}

export function registerUiSettingsRoutes(app: Hono<AppEnv>) {
  app.get('/ui/api/settings', async (c) => {
    const control = (globalThis as any).mtranDesktopControl;
    if (control?.getConfig) {
      const payload = await control.getConfig();
      return c.json(payload);
    }
    return c.json(getSettingsPayload());
  });

  app.post('/ui/api/settings/apply', async (c) => {
    const control = (globalThis as any).mtranDesktopControl;
    const body = await parseJsonBody(c, { allowEmpty: true });

    if (control?.applyConfig) {
      const payload = await control.applyConfig(body?.config || body);
      return c.json(payload);
    }

    const configBody = asRecord(body['config']);
    const input = asRecord(configBody?.['server']) || asRecord(body['server']) || {};
    applyServerConfig(input);
    return c.json(getSettingsPayload());
  });

  app.post('/ui/api/settings/reset', async (c) => {
    const control = (globalThis as any).mtranDesktopControl;
    if (control?.resetConfig) {
      const payload = await control.resetConfig();
      return c.json(payload);
    }

    clearConfigFile();
    resetConfig();
    return c.json(getSettingsPayload());
  });

  app.post('/ui/api/settings/restart', async (c) => {
    const control = (globalThis as any).mtranDesktopControl;
    if (control?.restartServer) {
      const payload = await control.restartServer();
      return c.json(payload);
    }

    return c.json(getSettingsPayload());
  });
}
