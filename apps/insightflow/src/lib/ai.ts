import { integrations } from 'zitejs/integrations';
import { zite } from 'zitejs/db';

// Tried in order. Overloaded (429/5xx) models are retried once, then we move to the next model.
export const MODELS = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type GeminiResponse = { candidates?: { content?: { parts?: { text?: string }[] } }[] };

/** Asks Gemini for a JSON answer. */
export async function askJson<T>(system: string, user: string): Promise<T> {
  const { accessToken } = await integrations.get('gemini');
  let lastError = 'unknown error';
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(accessToken)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: user }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.2, maxOutputTokens: 8192 },
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as GeminiResponse;
        const text = (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('').trim();
        const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
        try { return JSON.parse(clean || '{}') as T; } catch { lastError = `${model}: unreadable JSON`; break; }
      }
      lastError = `${model}: ${res.status} ${(await res.text()).slice(0, 160)}`;
      if (res.status === 429 || res.status >= 500) { await sleep(700 * (attempt + 1)); continue; }
      break; // model not available to this key — try the next one
    }
  }
  throw new Error(`Gemini request failed (${lastError})`);
}

/** Adaption: builds the learned-context block injected into every AI prompt. */
export async function getAdaptionContext() {
  const { records } = await zite.adaptionRules.findAll({ filters: { active: true }, limit: 200 });
  const by = (t: string) => records.filter((r) => r.ruleType === t).map((r) => `- ${r.rule}`);
  const ctx = by('Business Context');
  const cats = by('Category Definition');
  const ex = by('Correction Example').slice(-25);
  let out = '';
  if (ctx.length) out += `\nBUSINESS CONTEXT:\n${ctx.join('\n')}`;
  if (cats.length) out += `\nPREFERRED CATEGORIES (use these exact names when they fit):\n${cats.join('\n')}`;
  if (ex.length) out += `\nPAST HUMAN CORRECTIONS (learn from these; they override your defaults):\n${ex.join('\n')}`;
  return out;
}
