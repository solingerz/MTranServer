import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, resolve, isAbsolute } from 'path';
import { fileURLToPath } from 'url';
import type { Hono } from 'hono';
import { getConfig } from '@/config/index.js';
import { VERSION } from '@/version';
import type { AppEnv } from '@/server/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fileMimeTypes: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

let uiAssetsCache: Record<string, string> | null | undefined;
let swaggerAssetsCache: Record<string, string> | null | undefined;

async function loadUiAssets(): Promise<Record<string, string> | null> {
  if (uiAssetsCache !== undefined) return uiAssetsCache;
  try {
    const mod = await import('../../assets/' + 'ui.js');
    uiAssetsCache = mod.assets || null;
  } catch {
    uiAssetsCache = null;
  }
  return uiAssetsCache ?? null;
}

async function loadSwaggerAssets(): Promise<Record<string, string> | null> {
  if (swaggerAssetsCache !== undefined) return swaggerAssetsCache;
  try {
    const mod = await import('../../assets/' + 'swagger.js');
    swaggerAssetsCache = mod.swaggerAssets || null;
  } catch {
    swaggerAssetsCache = null;
  }
  return swaggerAssetsCache ?? null;
}

function getAssetAbsolutePath(assetPath: string): string {
  if (isAbsolute(assetPath)) return assetPath;

  const candidates = [
    resolve(__dirname, assetPath),
    resolve(__dirname, '..', assetPath),
    resolve(__dirname, '..', '..', assetPath),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }

  return candidates[0];
}

async function readAsset(filePath: string, assetsMap: Record<string, string>) {
  const assetPath = assetsMap[filePath];
  if (!assetPath) return null;

  const ext = filePath.substring(filePath.lastIndexOf('.'));
  const mimeType = fileMimeTypes[ext] || 'application/octet-stream';
  const resolvedPath = getAssetAbsolutePath(assetPath);
  const buffer = await readFile(resolvedPath);

  return { buffer, mimeType };
}

function buildOpenApiSpec() {
  const config = getConfig();
  return {
    openapi: '3.0.3',
    info: {
      title: 'MTranServer API',
      version: VERSION,
      description: 'MTranServer Hono API',
    },
    servers: [{ url: `http://${config.host}:${config.port}` }],
    components: {
      securitySchemes: {
        api_token: {
          type: 'apiKey',
          in: 'header',
          name: 'Authorization',
        },
      },
    },
    paths: {
      '/version': { get: { summary: 'Get version' } },
      '/health': { get: { summary: 'Health check' } },
      '/languages': { get: { summary: 'Get languages' } },
      '/detect': { post: { summary: 'Detect language' } },
      '/translate': { post: { summary: 'Translate text' } },
      '/translate/batch': { post: { summary: 'Translate batch' } },
      '/kiss': { post: { summary: 'Kiss compatible API' } },
      '/deepl': { post: { summary: 'DeepL compatible API' } },
      '/deeplx': { post: { summary: 'DeepLX compatible API' } },
      '/imme': { post: { summary: 'Immersive translate API' } },
      '/hcfy': { post: { summary: 'Selection translator API' } },
      '/google/language/translate/v2': { post: { summary: 'Google v2 compatible API' } },
      '/google/translate_a/single': { get: { summary: 'Google single compatible API' } },
    },
  };
}

function swaggerHtml(useLocalAssets: boolean) {
  const cssHref = useLocalAssets
    ? '/docs/swagger-ui.css'
    : 'https://unpkg.com/swagger-ui-dist@5/swagger-ui.css';
  const bundleJs = useLocalAssets
    ? '/docs/swagger-ui-bundle.js'
    : 'https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js';
  const presetJs = useLocalAssets
    ? '/docs/swagger-ui-standalone-preset.js'
    : 'https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js';

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>MTranServer API Docs</title>
    <link rel="stylesheet" href="${cssHref}" />
    <style>
      html, body { margin: 0; padding: 0; }
      #swagger-ui { min-height: 100vh; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="${bundleJs}"></script>
    <script src="${presetJs}"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: '/docs/openapi.json',
        dom_id: '#swagger-ui',
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        layout: 'BaseLayout',
      });
    </script>
  </body>
</html>`;
}

export function registerDocsUiRoutes(app: Hono<AppEnv>) {
  const serveDocs = async (path: string) => {
    const subPath = path.replace(/^\/docs/, '');
    if (!subPath || subPath === '/') {
      const swaggerAssets = await loadSwaggerAssets();
      return { kind: 'html' as const, value: swaggerHtml(Boolean(swaggerAssets)) };
    }

    const swaggerAssets = await loadSwaggerAssets();
    if (!swaggerAssets) {
      return { kind: 'text' as const, value: 'Swagger assets not found. Please run build.' };
    }

    const asset = await readAsset(subPath, swaggerAssets);
    if (!asset) {
      return { kind: 'text' as const, value: '404' };
    }

    return { kind: 'asset' as const, value: asset };
  };

  const serveUi = async (path: string) => {
    const uiAssets = await loadUiAssets();
    if (!uiAssets) {
      return { kind: 'text' as const, value: 'UI assets not found. Please run build.' };
    }

    let filePath = path.replace(/^\/ui/, '');
    if (!filePath || filePath === '/') {
      filePath = '/index.html';
    }

    const asset = await readAsset(filePath, uiAssets);
    if (asset) {
      return { kind: 'asset' as const, value: asset };
    }

    const indexAsset = await readAsset('/index.html', uiAssets);
    if (!indexAsset) {
      return { kind: 'text' as const, value: '404' };
    }

    return { kind: 'index' as const, value: indexAsset };
  };

  app.get('/docs/openapi.json', (c) => c.json(buildOpenApiSpec()));
  app.get('/docs/swagger.json', (c) => c.json(buildOpenApiSpec()));

  app.get('/docs', async (c) => {
    const payload = await serveDocs(c.req.path);
    if (payload.kind === 'html') return c.html(payload.value);
    if (payload.kind === 'text') return c.text(payload.value, 404);
    c.header('Content-Type', payload.value.mimeType);
    return c.body(payload.value.buffer);
  });

  app.get('/docs/*', async (c) => {
    const payload = await serveDocs(c.req.path);
    if (payload.kind === 'html') return c.html(payload.value);
    if (payload.kind === 'text') return c.text(payload.value, 404);
    c.header('Content-Type', payload.value.mimeType);
    return c.body(payload.value.buffer);
  });

  app.get('/ui', async (c) => {
    const payload = await serveUi(c.req.path);
    if (payload.kind === 'text') return c.text(payload.value, 404);
    if (payload.kind === 'index') {
      c.header('Content-Type', 'text/html');
      return c.body(payload.value.buffer);
    }
    c.header('Content-Type', payload.value.mimeType);
    return c.body(payload.value.buffer);
  });

  app.get('/ui/*', async (c) => {
    const payload = await serveUi(c.req.path);
    if (payload.kind === 'text') return c.text(payload.value, 404);
    if (payload.kind === 'index') {
      c.header('Content-Type', 'text/html');
      return c.body(payload.value.buffer);
    }
    c.header('Content-Type', payload.value.mimeType);
    return c.body(payload.value.buffer);
  });

  app.get('/', (c) => c.redirect('/ui', 301));
}
