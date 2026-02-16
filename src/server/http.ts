import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';

export type JsonBody = Record<string, unknown>;

type ParseJsonBodyOptions = {
  allowEmpty?: boolean;
};

function badRequest(message: string): never {
  throw new HTTPException(400, { message });
}

export async function parseJsonBody(
  c: Context,
  options: ParseJsonBodyOptions = {}
): Promise<JsonBody> {
  const rawBody = await c.req.raw.text();
  if (!rawBody.trim()) {
    if (options.allowEmpty) {
      return {};
    }
    badRequest('Request body is required');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    badRequest('Invalid JSON body');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    badRequest('JSON body must be an object');
  }

  return parsed as JsonBody;
}

export function requireString(body: JsonBody, field: string): string {
  const value = body[field];
  if (typeof value !== 'string') {
    badRequest(`"${field}" must be a string`);
  }
  return value;
}

export function optionalString(body: JsonBody, field: string): string | undefined {
  const value = body[field];
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    badRequest(`"${field}" must be a string`);
  }
  return value;
}

export function optionalBoolean(body: JsonBody, field: string): boolean | undefined {
  const value = body[field];
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') {
    badRequest(`"${field}" must be a boolean`);
  }
  return value;
}

export function optionalNumber(body: JsonBody, field: string): number | undefined {
  const value = body[field];
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || Number.isNaN(value)) {
    badRequest(`"${field}" must be a number`);
  }
  return value;
}

export function requireStringArray(body: JsonBody, field: string): string[] {
  const value = body[field];
  if (!Array.isArray(value) || value.some((v) => typeof v !== 'string')) {
    badRequest(`"${field}" must be an array of strings`);
  }
  return value;
}

export function optionalStringArray(body: JsonBody, field: string): string[] | undefined {
  const value = body[field];
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((v) => typeof v !== 'string')) {
    badRequest(`"${field}" must be an array of strings`);
  }
  return value;
}

export function requireStringOrStringArray(body: JsonBody, field: string): string | string[] {
  const value = body[field];
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
    return value;
  }
  badRequest(`"${field}" must be a string or an array of strings`);
}
