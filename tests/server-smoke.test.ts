import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { resetConfig, setConfig } from '@/config/index.js';

mock.module('@/services/index.js', () => {
  return {
    translateWithPivot: async (_from: string, _to: string, text: string) => `mock:${text}`,
  };
});

const { createApp } = await import('@/server/app.js');
const app = createApp();

beforeEach(() => {
  resetConfig();
  setConfig({
    apiToken: '',
    logRequests: false,
  });
});

describe('Server smoke tests', () => {
  test('GET /health', async () => {
    const res = await app.request('http://localhost/health');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toEqual({ status: 'ok' });
  });

  test('GET /docs/openapi.json', async () => {
    const res = await app.request('http://localhost/docs/openapi.json');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.openapi).toBe('3.0.3');
    expect(body.paths['/translate']).toBeDefined();
    expect(body.paths['/deeplx']).toBeDefined();
  });

  test('GET /docs should not redirect in loop', async () => {
    const res = await app.request('http://localhost/docs');
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  test('GET /ui should not redirect in loop', async () => {
    const res = await app.request('http://localhost/ui');
    expect([200, 404]).toContain(res.status);
    expect(res.headers.get('location')).toBeNull();
  });

  test('POST /translate', async () => {
    const res = await app.request('http://localhost/translate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        from: 'en',
        to: 'zh-Hans',
        text: 'hello',
        html: false,
      }),
    });

    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.result).toBe('mock:hello');
  });

  test('POST /deeplx', async () => {
    const res = await app.request('http://localhost/deeplx', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        text: 'hello',
        source_lang: 'en',
        target_lang: 'zh-Hans',
      }),
    });

    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.code).toBe(200);
    expect(body.data).toBe('mock:hello');
    expect(body.source_lang).toBe('EN');
    expect(body.target_lang).toBe('ZH-HANS');
  });

  test('POST /translate returns 400 for invalid JSON', async () => {
    const res = await app.request('http://localhost/translate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"from":"en"',
    });

    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBe('Bad Request');
    expect(body.message).toBe('Invalid JSON body');
  });

  test('POST /translate returns 400 for missing required fields', async () => {
    const res = await app.request('http://localhost/translate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        from: 'en',
        to: 'zh-Hans',
      }),
    });

    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBe('Bad Request');
    expect(body.message).toBe('"text" must be a string');
  });

  test('POST /translate returns 401 when token is configured', async () => {
    setConfig({ apiToken: 'secret-token' });

    const res = await app.request('http://localhost/translate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        from: 'en',
        to: 'zh-Hans',
        text: 'hello',
      }),
    });

    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });
});
