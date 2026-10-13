import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { askJson, getAdaptionContext } from '../lib/ai';

export default createEndpoint({
  description: 'Generates an executive insight report from feedback and issues',
  inputSchema: z.object({ title: z.string().optional() }),
  outputSchema: z.object({ id: z.string() }),
  execute: async () => {
    const [tot, cats, issues] = await Promise.all([
      zite.sql({ query: `SELECT COUNT(*) AS total, COALESCE(AVG("sentimentScore"),0) AS avg,
        COUNT(*) FILTER (WHERE "sentiment"='Positive') AS pos, COUNT(*) FILTER (WHERE "sentiment"='Negative') AS neg,
        COUNT(*) FILTER (WHERE "sentiment"='Neutral') AS neu, COUNT(*) FILTER (WHERE "sentiment"='Mixed') AS mix,
        MIN("submittedAt") AS first, MAX("submittedAt") AS last FROM "Feedback"` }),
      zite.sql({ query: `SELECT "category" AS name, COUNT(*) AS total, COUNT(*) FILTER (WHERE "sentiment" IN ('Negative','Mixed')) AS negative,
        ROUND(AVG("sentimentScore")::numeric,2) AS avg FROM "Feedback" WHERE "category" IS NOT NULL AND "category" <> '' GROUP BY 1 ORDER BY 2 DESC LIMIT 10` }),
      zite.issues.findAll({ limit: 50 }),
    ]);
    const t = tot.rows[0] ?? {};
    const data = {
      totals: t,
      categories: cats.rows,
      issues: issues.records.sort((a, b) => (b.impactScore ?? 0) - (a.impactScore ?? 0)).slice(0, 8)
        .map((i) => ({ title: i.title, priority: i.priority, status: i.status, impact: i.impactScore, reasoning: i.reasoning, actions: i.actionItems })),
    };
    const adaption = await getAdaptionContext();
    let res: { title: string; markdown: string };
    try {
    res = await askJson<{ title: string; markdown: string }>(
      `You write concise, business-friendly customer insight reports for executives. Return JSON {"title","markdown"}.
The markdown must include these sections with ## headings: Executive Summary (3-4 sentences), Key Metrics (bullet list with real numbers), What Customers Love, Top Issues & Priorities (numbered, with priority and reasoning), Recommended Actions (grouped by timeframe: This week / This month / This quarter), Outlook. Use only the provided numbers. No code blocks.${adaption}`,
      JSON.stringify(data),
    );
    } catch (e) {
      console.error('AI unavailable, using template report', e);
      const n = (k: string) => Number((t as Record<string, unknown>)[k] ?? 0);
      const total = n('total');
      const pct = (k: string) => (total ? Math.round((n(k) / total) * 100) : 0);
      const loved = (cats.rows as Record<string, unknown>[]).filter((c) => Number(c.avg) > 0.2).map((c) => `- **${c.name}** (avg sentiment ${c.avg})`);
      const iss = data.issues;
      res = {
        title: `Customer Insight Report — ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
        markdown: [
          '## Executive Summary',
          `We analyzed ${total} pieces of customer feedback. ${pct('pos')}% were positive and ${pct('neg')}% negative (average sentiment ${n('avg').toFixed(2)}). ${iss[0] ? `The most pressing issue is **${iss[0].title}** (${iss[0].priority} priority).` : ''}`,
          '## Key Metrics',
          `- Total feedback: ${total}`, `- Positive: ${pct('pos')}% · Neutral: ${pct('neu')}% · Mixed: ${pct('mix')}% · Negative: ${pct('neg')}%`,
          ...(cats.rows as Record<string, unknown>[]).slice(0, 5).map((c) => `- ${c.name}: ${c.total} comments, ${c.negative} negative/mixed`),
          '## What Customers Love', ...(loved.length ? loved : ['- Positive feedback is spread across categories.']),
          '## Top Issues & Priorities', ...iss.map((i, k) => `${k + 1}. **${i.title}** — ${i.priority} (impact ${i.impact}). ${i.reasoning ?? ''}`),
          '## Recommended Actions',
          '**This week**', ...iss.filter((i) => i.priority === 'Critical' || i.priority === 'High').map((i) => `- Assign an owner to "${i.title}" and start the first action item`),
          '**This month**', ...iss.flatMap((i) => (i.actions ?? '').split('\n').slice(0, 1)).filter(Boolean),
          '**This quarter**', '- Re-run analysis and compare sentiment trend against this report',
          '## Outlook', 'Addressing the top issues should lift overall sentiment; track the weekly trend on the dashboard to confirm progress.',
        ].join('\n'),
      };
    }
    const created = await zite.reports.create({
      record: { title: res.title || 'Customer Insight Report', content: res.markdown || '', feedbackCount: Number(t.total ?? 0) },
    });
    return { id: created.id };
  },
});
