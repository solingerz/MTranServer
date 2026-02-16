import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { getConfig } from '@/config/index.js';

export function getTokenFromAuthorization(value: string | undefined): string {
  if (!value) return '';
  if (value.startsWith('Bearer ')) return value.replace('Bearer ', '');
  return value;
}

export function getApiTokenFromRequest(headers: Headers, url: URL): string {
  const auth = getTokenFromAuthorization(headers.get('authorization') || undefined);
  const queryApiToken = url.searchParams.get('api_token') || '';
  const queryToken = url.searchParams.get('token') || '';
  const xApiToken = headers.get('x-api-token') || '';
  return auth || queryApiToken || queryToken || xApiToken;
}

export function requireApiToken(c: Context): void {
  const apiToken = getConfig().apiToken;
  if (!apiToken) return;

  const token = getApiTokenFromRequest(c.req.raw.headers, new URL(c.req.raw.url));
  if (token !== apiToken) {
    throw new HTTPException(401, { message: 'Unauthorized' });
  }
}
