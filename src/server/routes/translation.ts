import type { Hono } from 'hono';
import { getSupportedLanguages, getLanguagePairs } from '@/models/index.js';
import { translateWithPivot } from '@/services/index.js';
import { detectLanguage, detectLanguageWithConfidence } from '@/services/detector.js';
import { NormalizeLanguageCode } from '@/utils/index.js';
import { requireApiToken } from '@/server/auth.js';
import {
  parseJsonBody,
  requireString,
  requireStringArray,
  optionalBoolean,
  optionalNumber,
} from '@/server/http.js';
import type { AppEnv } from '@/server/types.js';

export function registerTranslationRoutes(app: Hono<AppEnv>) {
  app.get('/languages', (c) => {
    requireApiToken(c);
    const languages = getSupportedLanguages();
    const pairStrings = getLanguagePairs();
    const pairs = pairStrings.map((p) => {
      const [from, to] = p.split('_');
      return { from, to };
    });
    return c.json({ languages, pairs });
  });

  app.post('/detect', async (c) => {
    requireApiToken(c);
    const body = await parseJsonBody(c);
    const text = requireString(body, 'text');
    const minConfidence = optionalNumber(body, 'minConfidence');

    if (minConfidence !== undefined) {
      const result = await detectLanguageWithConfidence(text, minConfidence);
      return c.json(result);
    }

    const language = await detectLanguage(text);
    return c.json({ language });
  });

  app.post('/translate', async (c) => {
    requireApiToken(c);
    const body = await parseJsonBody(c);
    const from = requireString(body, 'from');
    const to = requireString(body, 'to');
    const text = requireString(body, 'text');
    const html = optionalBoolean(body, 'html') ?? false;

    const normalizedFrom = NormalizeLanguageCode(from);
    const normalizedTo = NormalizeLanguageCode(to);
    const result = await translateWithPivot(normalizedFrom, normalizedTo, text, html);

    return c.json({ result });
  });

  app.post('/translate/batch', async (c) => {
    requireApiToken(c);
    const body = await parseJsonBody(c);
    const from = requireString(body, 'from');
    const to = requireString(body, 'to');
    const texts = requireStringArray(body, 'texts');
    const html = optionalBoolean(body, 'html') ?? false;

    const normalizedFrom = NormalizeLanguageCode(from);
    const normalizedTo = NormalizeLanguageCode(to);

    const results: string[] = [];
    for (const text of texts) {
      const result = await translateWithPivot(normalizedFrom, normalizedTo, text, html);
      results.push(result);
    }

    return c.json({ results });
  });
}
