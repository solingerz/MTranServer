import type { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { translateWithPivot } from '@/services/index.js';
import { NormalizeLanguageCode } from '@/utils/index.js';
import { requireApiToken } from '@/server/auth.js';
import { parseJsonBody, requireString, optionalString, optionalStringArray } from '@/server/http.js';
import type { AppEnv } from '@/server/types.js';

export function registerKissCompatibleRoutes(app: Hono<AppEnv>) {
  app.post('/kiss', async (c) => {
    requireApiToken(c);
    const body = await parseJsonBody(c);
    const from = requireString(body, 'from');
    const to = requireString(body, 'to');
    const texts = optionalStringArray(body, 'texts');
    const text = optionalString(body, 'text');

    const fromLang = NormalizeLanguageCode(from);
    const toLang = NormalizeLanguageCode(to);

    if (texts && texts.length > 0) {
      const translations: Array<{ text: string; src: string }> = [];
      for (const item of texts) {
        const result = await translateWithPivot(fromLang, toLang, item, false);
        translations.push({
          text: result,
          src: from,
        });
      }
      return c.json({ translations });
    }

    if (text !== undefined) {
      const result = await translateWithPivot(fromLang, toLang, text, false);
      return c.json({
        text: result,
        src: from,
      });
    }

    throw new HTTPException(400, {
      message: 'Either "text" must be provided or "texts" must be a non-empty array',
    });
  });
}
