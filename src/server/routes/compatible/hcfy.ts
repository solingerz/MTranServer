import type { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { translateWithPivot } from '@/services/index.js';
import { requireApiToken } from '@/server/auth.js';
import { parseJsonBody, requireString, requireStringArray, optionalString } from '@/server/http.js';
import type { AppEnv } from '@/server/types.js';

export function registerHcfyCompatibleRoutes(app: Hono<AppEnv>) {
  app.post('/hcfy', async (c) => {
    requireApiToken(c);
    const body = await parseJsonBody(c);
    const text = requireString(body, 'text');
    const destination = requireStringArray(body, 'destination');
    const sourceInput = optionalString(body, 'source');

    if (destination.length === 0) {
      throw new HTTPException(400, { message: '"destination" must contain at least one item' });
    }

    const hcfyLangToBCP47: Record<string, string> = {
      '中文(简体)': 'zh-Hans',
      '中文(繁体)': 'zh-Hant',
      '英语': 'en',
      '日语': 'ja',
      '韩语': 'ko',
      '法语': 'fr',
      '德语': 'de',
      '西班牙语': 'es',
      '俄语': 'ru',
      '意大利语': 'it',
      '葡萄牙语': 'pt',
    };

    const bcp47ToHcfyLang: Record<string, string> = {
      'zh-Hans': '中文(简体)',
      'zh-CN': '中文(简体)',
      'zh-Hant': '中文(繁体)',
      'zh-TW': '中文(繁体)',
      en: '英语',
      ja: '日语',
      ko: '韩语',
      fr: '法语',
      de: '德语',
      es: '西班牙语',
      ru: '俄语',
      it: '意大利语',
      pt: '葡萄牙语',
    };

    const convertHcfyLangToBCP47 = (hcfyLang: string) => hcfyLangToBCP47[hcfyLang] || hcfyLang;
    const convertBCP47ToHcfyLang = (bcp47Lang: string) => bcp47ToHcfyLang[bcp47Lang] || bcp47Lang;

    const containsChinese = (input: string) => {
      for (const r of input) {
        const code = r.charCodeAt(0);
        if (code >= 0x4e00 && code <= 0x9fff) return true;
      }
      return false;
    };

    const containsJapanese = (input: string) => {
      for (const r of input) {
        const code = r.charCodeAt(0);
        if ((code >= 0x3040 && code <= 0x309f) || (code >= 0x30a0 && code <= 0x30ff)) return true;
      }
      return false;
    };

    const containsKorean = (input: string) => {
      for (const r of input) {
        const code = r.charCodeAt(0);
        if (code >= 0xac00 && code <= 0xd7af) return true;
      }
      return false;
    };

    let sourceLang = 'auto';
    if (sourceInput) {
      sourceLang = convertHcfyLangToBCP47(sourceInput);
    }

    const targetLangName = destination[0];
    let targetLang = convertHcfyLangToBCP47(targetLangName);

    let detectedSourceLang = sourceLang;
    if (sourceLang === 'auto') {
      if (containsChinese(text)) {
        detectedSourceLang = 'zh-Hans';
      } else if (containsJapanese(text)) {
        detectedSourceLang = 'ja';
      } else if (containsKorean(text)) {
        detectedSourceLang = 'ko';
      } else {
        detectedSourceLang = 'en';
      }
    }

    if (detectedSourceLang === targetLang && destination.length > 1) {
      const altTargetLangName = destination[1];
      targetLang = convertHcfyLangToBCP47(altTargetLangName);
    }

    const paragraphs = text.split('\n');
    const results: string[] = [];

    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) {
        results.push('');
        continue;
      }

      const result = await translateWithPivot(detectedSourceLang, targetLang, paragraph, false);
      results.push(result);
    }

    return c.json({
      text,
      from: convertBCP47ToHcfyLang(detectedSourceLang),
      to: destination[0],
      result: results,
    });
  });
}
