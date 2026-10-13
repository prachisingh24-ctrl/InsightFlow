import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { askJson, getAdaptionContext } from '../lib/ai';
import { detectDuplicates } from '../lib/duplicates';

type Result = {
  results: {
    id: string;
    sentiment: 'Positive' | 'Neutral' | 'Negative' | 'Mixed';
    score: number;
    category: string;
    topics: string[];
    complaint: string;
    urgency: number;
    confidence: number;
  }[];
};

export default createEndpoint({
  description: 'Runs AI analysis (sentiment, category, topics, complaint, urgency) on unanalyzed feedback',
  inputSchema: z.object({ ids: z.array(z.string()).optional(), limit: z.number().optional() }),
  outputSchema: z.object({ analyzed: z.number(), remaining: z.number() }),
  execute: async ({ input }) => {
    let targets;
    if (input.ids?.length) {
      const found = await Promise.all(input.ids.slice(0, 100).map((id) => zite.feedback.findOne({ id })));
      targets = found.filter((r): r is NonNullable<typeof r> => !!r);
    } else {
      const { records } = await zite.feedback.findAll({ filters: { analyzed: false }, limit: 2000 });
      targets = records;
    }
    const max = input.limit ?? 40;
    const batch = targets.slice(0, max);
    const adaption = await getAdaptionContext();
    const system = `You are a customer-feedback analyst. For each feedback item return JSON {"results":[{"id","sentiment","score","category","topics","complaint","urgency","confidence"}]}.
- confidence: 0 to 1, how sure you are that sentiment and category are right. Use below 0.6 for very short, sarcastic, ambiguous, off-topic or genuinely mixed text, and 0.85+ only when the meaning is clear
- sentiment: one of Positive, Neutral, Negative, Mixed
- score: -1 (very negative) to 1 (very positive)
- category: a short business category (2-3 words, Title Case, e.g. "Shipping & Delivery", "Pricing", "App Performance", "Customer Support", "Product Quality")
- topics: 1-3 short lowercase topic keywords
- complaint: a concise summary (max 10 words) of the core complaint, or "" if none
- urgency: 1 (none) to 5 (critical: churn risk, safety, outage, legal, payment)
Keep category names consistent across items.${adaption}`;

    const chunks: typeof batch[] = [];
    for (let i = 0; i < batch.length; i += 20) chunks.push(batch.slice(i, i + 20));
    const outputs = await Promise.all(chunks.map((c) =>
      askJson<Result>(system, JSON.stringify(c.map((r) => ({ id: r.id, source: r.source, rating: r.rating, text: r.content })))),
    ));
    const valid = new Set(batch.map((r) => r.id));
    const updates = outputs.flatMap((o) => o.results ?? []).filter((r) => valid.has(r.id));
    await Promise.all(updates.map((u) => zite.feedback.update({
      id: u.id,
      record: {
        sentiment: ['Positive', 'Neutral', 'Negative', 'Mixed'].includes(u.sentiment) ? u.sentiment : 'Neutral',
        sentimentScore: Math.max(-1, Math.min(1, Number(u.score) || 0)),
        category: u.category,
        topics: (u.topics ?? []).join(', '),
        complaint: u.complaint ?? '',
        urgency: Math.max(1, Math.min(5, Math.round(Number(u.urgency) || 1))),
        confidence: Math.round(Math.max(0, Math.min(1, Number.isFinite(Number(u.confidence)) ? Number(u.confidence) : 0.7)) * 100) / 100,
        analyzed: true,
      },
    })));
    const remaining = Math.max(0, targets.length - batch.length);
    if (remaining === 0 && updates.length > 0) {
      try { await detectDuplicates(); } catch (e) { console.error('Duplicate detection failed', e); }
    }
    return { analyzed: updates.length, remaining };
  },
});
