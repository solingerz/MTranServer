import type { Hono } from 'hono';
import { translateWithPivot } from '@/services/index.js';
import { NormalizeLanguageCode } from '@/utils/index.js';
import { requireApiToken } from '@/server/auth.js';
import {
  parseJsonBody,
  requireString,
  requireStringOrStringArray,
  optionalString,
} from '@/server/http.js';
import type { AppEnv } from '@/server/types.js';

export function registerGoogleCompatibleRoutes(app: Hono<AppEnv>) {
  app.post('/google/language/translate/v2', async (c) => {
    requireApiToken(c);
    const body = await parseJsonBody(c);

    const q = requireStringOrStringArray(body, 'q');
    const queries: string[] = Array.isArray(q) ? q : [q];
    const source = requireString(body, 'source');
    const target = requireString(body, 'target');
    const format = optionalString(body, 'format');
    const sourceBCP47 = NormalizeLanguageCode(source);
    const targetBCP47 = NormalizeLanguageCode(target);
    const isHTML = format === 'html';

    const translations: Array<{ translatedText: string; detectedSourceLanguage?: string }> = [];
    for (const query of queries) {
      const result = await translateWithPivot(sourceBCP47, targetBCP47, query, isHTML);
      translations.push({
        translatedText: result,
        detectedSourceLanguage: source,
      });
    }

    return c.json({ data: { translations } });
  });

  app.get('/google/translate_a/single', async (c) => {
    requireApiToken(c);

    const sl = c.req.query('sl') || 'auto';
    const tl = c.req.query('tl');
    const q = c.req.query('q');

    if (!tl || !q) {
      return c.json({ error: 'Missing tl or q query parameter' }, 400);
    }

    const bcp47ToGoogleLang: Record<string, string> = {
      'zh-Hans': 'zh-CN',
      'zh-Hant': 'zh-TW',
    };

    const sourceBCP47 = NormalizeLanguageCode(sl);
    const targetBCP47 = NormalizeLanguageCode(tl);
    const result = await translateWithPivot(sourceBCP47, targetBCP47, q, false);
    const detectedLang = bcp47ToGoogleLang[sourceBCP47] || sourceBCP47;

    return c.json([
      [[result, q, null, null, 1]],
      null,
      detectedLang,
      null,
      null,
      null,
      null,
      [],
    ]);
  });
}
