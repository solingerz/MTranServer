import type { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { getConfig } from '@/config/index.js';
import { translateWithPivot } from '@/services/index.js';
import { NormalizeLanguageCode } from '@/utils/index.js';
import { parseJsonBody, requireString, optionalString } from '@/server/http.js';
import type { AppEnv } from '@/server/types.js';

export function registerDeepLXCompatibleRoutes(app: Hono<AppEnv>) {
  app.post('/deeplx', async (c) => {
    const body = await parseJsonBody(c);
    const authorization = c.req.header('authorization');
    const tokenQuery = c.req.query('token');

    const apiToken = getConfig().apiToken;
    if (apiToken) {
      let token = '';
      if (authorization) {
        if (authorization.startsWith('Bearer ')) {
          token = authorization.replace('Bearer ', '');
        } else {
          token = authorization;
        }
      } else if (tokenQuery) {
        token = tokenQuery;
      }

      if (token !== apiToken) {
        throw new HTTPException(401, { message: 'Unauthorized' });
      }
    }

    const sourceLangInput = optionalString(body, 'source_lang');
    const sourceLang = sourceLangInput ? NormalizeLanguageCode(sourceLangInput) : 'auto';
    const targetLang = NormalizeLanguageCode(requireString(body, 'target_lang'));
    const text = requireString(body, 'text');
    const result = await translateWithPivot(sourceLang, targetLang, text, false);

    return c.json({
      alternatives: [],
      code: 200,
      data: result,
      id: Math.floor(Math.random() * 10000000000),
      method: 'Free',
      source_lang: sourceLang.toUpperCase(),
      target_lang: targetLang.toUpperCase(),
    });
  });
}
