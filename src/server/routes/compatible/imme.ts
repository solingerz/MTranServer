import type { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import * as logger from '@/logger/index.js';
import { getConfig } from '@/config/index.js';
import { translateWithPivot } from '@/services/index.js';
import { NormalizeLanguageCode } from '@/utils/index.js';
import { parseJsonBody, requireString, requireStringArray, optionalString } from '@/server/http.js';
import type { AppEnv } from '@/server/types.js';

export function registerImmeCompatibleRoutes(app: Hono<AppEnv>) {
  app.post('/imme', async (c) => {
    const body = await parseJsonBody(c);
    const token = c.req.query('token');

    const apiToken = getConfig().apiToken;
    if (apiToken && token !== apiToken) {
      throw new HTTPException(401, { message: 'Unauthorized' });
    }

    const sourceLang = 'auto';
    const targetLang = NormalizeLanguageCode(requireString(body, 'target_lang'));
    const sourceLangInput = optionalString(body, 'source_lang') || '';
    const textList = requireStringArray(body, 'text_list');

    const translations: Array<{ detected_source_lang: string; text: string }> = [];

    for (let i = 0; i < textList.length; i++) {
      const text = textList[i];

      if (!text) {
        translations.push({
          detected_source_lang: sourceLangInput,
          text: '',
        });
        continue;
      }

      let result: string;
      try {
        result = await translateWithPivot(sourceLang, targetLang, text, false);
      } catch (err) {
        logger.error(`Imme translation failed at index ${i}: ${err}`);
        result = text;
      }

      translations.push({
        detected_source_lang: sourceLangInput,
        text: result,
      });
    }

    return c.json({ translations });
  });
}
