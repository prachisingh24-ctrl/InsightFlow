import OpenAI from 'openai';
import { integrations } from 'zitejs/integrations';
import { zite } from 'zitejs/db';

export const MODEL = 'gpt-4.1-mini';

export async function askJson<T>(system: string, user: string): Promise<T> {
  const { accessToken } = await integrations.get('openai');
  const client = new OpenAI({ apiKey: accessToken });
  const res = await client.chat.completions.create({
    model: MODEL,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });
  return JSON.parse(res.choices[0].message.content || '{}') as T;
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
