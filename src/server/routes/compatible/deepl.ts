import type { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { getConfig } from '@/config/index.js';
import { translateWithPivot } from '@/services/index.js';
import { NormalizeLanguageCode } from '@/utils/index.js';
import {
  parseJsonBody,
  requireString,
  requireStringOrStringArray,
  optionalString,
} from '@/server/http.js';
import type { AppEnv } from '@/server/types.js';

export function registerDeepLCompatibleRoutes(app: Hono<AppEnv>) {
  app.post('/deepl', async (c) => {
    const body = await parseJsonBody(c);
    const authorization = c.req.header('authorization');

    const apiToken = getConfig().apiToken;
    if (apiToken) {
      let token = '';
      if (authorization) {
        if (authorization.startsWith('DeepL-Auth-Key ')) {
          token = authorization.replace('DeepL-Auth-Key ', '');
        } else {
          token = authorization.replace('Bearer ', '');
        }
      }
      if (token !== apiToken) {
        throw new HTTPException(401, { message: 'Unauthorized' });
      }
    }

    const bcp47ToDeeplLang: Record<string, string> = {
      no: 'NB',
      'zh-Hans': 'ZH',
      'zh-CN': 'ZH-CN',
      'zh-Hant': 'ZH-TW',
      'zh-TW': 'ZH-TW',
    };

    const text = requireStringOrStringArray(body, 'text');
    const textArray: string[] = Array.isArray(text) ? text : [text];
    const sourceLangInput = optionalString(body, 'source_lang');
    const sourceLang = sourceLangInput ? NormalizeLanguageCode(sourceLangInput) : 'auto';
    const targetLang = NormalizeLanguageCode(requireString(body, 'target_lang'));
    const tagHandling = optionalString(body, 'tag_handling');
    const isHTML = tagHandling === 'html' || tagHandling === 'xml';

    const translations: Array<{ detected_source_language: string; text: string }> = [];

    for (const item of textArray) {
      const result = await translateWithPivot(sourceLang, targetLang, item, isHTML);
      const detectedLang =
        sourceLangInput || bcp47ToDeeplLang[sourceLang] || sourceLang.toUpperCase();

      translations.push({
        detected_source_language: detectedLang,
        text: result,
      });
    }

    return c.json({ translations });
  });
}
