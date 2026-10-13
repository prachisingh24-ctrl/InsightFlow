import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { askJson, getAdaptionContext } from '../lib/ai';

type Rec = {
  issues: {
    category: string;
    title: string;
    description: string;
    priority: 'Critical' | 'High' | 'Medium' | 'Low';
    reasoning: string;
    actionItems: string[];
  }[];
};

export default createEndpoint({
  description: 'Generates prioritized issues with reasoning and action items from analyzed feedback',
  inputSchema: z.object({}),
  outputSchema: z.object({ created: z.number(), updated: z.number() }),
  execute: async () => {
    const stats = await zite.sql({
      query: `SELECT "category" AS category, COUNT(*) AS total,
          COUNT(*) FILTER (WHERE "sentiment" IN ('Negative','Mixed')) AS negative,
          COALESCE(AVG("urgency"),1) AS "avgUrgency",
          COALESCE(AVG("sentimentScore"),0) AS "avgScore",
          COUNT(*) FILTER (WHERE "submittedAt" >= now() - interval '14 days' AND "sentiment" IN ('Negative','Mixed')) AS "recentNeg",
          COUNT(*) FILTER (WHERE "submittedAt" < now() - interval '14 days' AND "submittedAt" >= now() - interval '28 days' AND "sentiment" IN ('Negative','Mixed')) AS "priorNeg"
        FROM "Feedback" WHERE "analyzed" = true AND "category" IS NOT NULL AND "category" <> ''
        GROUP BY 1 HAVING COUNT(*) FILTER (WHERE "sentiment" IN ('Negative','Mixed')) > 0
        ORDER BY 3 DESC LIMIT 8`,
    });
    if (!stats.rows.length) return { created: 0, updated: 0 };
    const totalRes = await zite.sql({ query: `SELECT COUNT(*) AS c FROM "Feedback" WHERE "analyzed" = true` });
    const totalAnalyzed = Number(totalRes.rows[0]?.c ?? 1);

    const groups = stats.rows.map((r) => {
      const negative = Number(r.negative);
      const urgency = Number(r.avgUrgency);
      const recent = Number(r.recentNeg), prior = Number(r.priorNeg);
      // Impact = share of all feedback × urgency × severity × trend momentum
      const impact = Math.round(Math.min(100,
        (negative / totalAnalyzed) * 100 * 1.5 + urgency * 8 + (1 - Number(r.avgScore)) * 10 + (recent > prior ? 10 : 0)));
      return { category: String(r.category), total: Number(r.total), negative, urgency, avgScore: Number(r.avgScore), recent, prior, impact };
    });

    const { records: fb } = await zite.feedback.findAll({ filters: { analyzed: true }, limit: 2000 });
    const neg = fb.filter((f) => f.sentiment === 'Negative' || f.sentiment === 'Mixed');
    const samples = groups.map((g) => ({
      ...g,
      examples: neg.filter((f) => f.category === g.category).sort((a, b) => (b.urgency ?? 0) - (a.urgency ?? 0))
        .slice(0, 6).map((f) => f.complaint || (f.content ?? '').slice(0, 160)),
    }));

    const adaption = await getAdaptionContext();
    let result: Rec;
    try {
    result = await askJson<Rec>(
      `You are a customer-experience strategist. Given category-level feedback stats and example complaints, produce one issue per category as JSON {"issues":[{"category","title","description","priority","reasoning","actionItems"}]}.
- title: crisp issue name (max 8 words)
- description: 1-2 sentences describing the problem
- priority: Critical, High, Medium or Low based on impact score, urgency, volume and trend (impact>=70 Critical, >=50 High, >=30 Medium)
- reasoning: 2-3 sentences citing the actual numbers (counts, % of feedback, urgency, trend vs prior 2 weeks)
- actionItems: 3 concrete, specific actions a business team can take${adaption}`,
      JSON.stringify(samples),
    );
    } catch (e) {
      console.error('AI unavailable, using data-driven fallback', e);
      result = { issues: samples.map((g) => fallbackIssue(g, totalAnalyzed)) };
    }

    const { records: existing } = await zite.issues.findAll({ limit: 500 });
    let created = 0, updated = 0;
    for (const iss of result.issues ?? []) {
      const g = groups.find((x) => x.category === iss.category);
      if (!g) continue;
      const linked = neg.filter((f) => f.category === g.category).map((f) => f.id).slice(0, 100);
      const record = {
        title: iss.title,
        description: iss.description,
        priority: (['Critical', 'High', 'Medium', 'Low'].includes(iss.priority) ? iss.priority : 'Medium') as 'Critical' | 'High' | 'Medium' | 'Low',
        category: g.category,
        impactScore: g.impact,
        reasoning: iss.reasoning,
        actionItems: (iss.actionItems ?? []).map((a) => `- ${a}`).join('\n'),
        feedback: linked,
      };
      const match = existing.find((e) => e.category === g.category && e.status !== 'Resolved');
      if (match) {
        await zite.issues.update({ id: match.id, record });
        updated++;
      } else {
        await zite.issues.create({ record: { ...record, status: 'Open' } });
        created++;
      }
    }
    return { created, updated };
  },
});

type Group = { category: string; total: number; negative: number; urgency: number; avgScore: number; recent: number; prior: number; impact: number; examples: string[] };

const PLAYBOOK: Record<string, string[]> = {
  'Shipping & Delivery': ['Audit courier SLAs and switch or penalize underperforming partners', 'Send proactive delay notifications with updated ETAs', 'Add photo proof-of-delivery and a one-click missing-parcel claim'],
  'Checkout & Payments': ['Run a payment-gateway error audit across card, Apple Pay and promo flows', 'Auto-detect and refund duplicate charges within 24 hours', 'Add clear payment confirmation and retry messaging'],
  'Pricing': ['Communicate price changes in advance with clear value messaging', 'Introduce a loyalty discount for long-term subscribers', 'Benchmark prices against top 3 competitors'],
  'App Performance': ['Prioritize crash fixes from crash-reporting data for the next release', 'Optimize image loading with compression and lazy loading', 'Add in-app notification frequency controls'],
  'Customer Support': ['Add staffing during peak chat hours to cut wait times', 'Expand the agent knowledge base (warranty, returns)', 'Introduce chat queue position and callback options'],
  'Account & Login': ['Fix email/SMS delivery for password reset and 2FA codes', 'Extend session duration on trusted devices', 'Add alternative verification methods'],
  'Product Quality': ['Review supplier QA for stitching and durability defects', 'Recalibrate the sizing chart using return data', 'Add fit guidance and customer photos to product pages'],
};

function fallbackIssue(g: Group, totalAnalyzed: number) {
  const share = Math.round((g.negative / Math.max(1, totalAnalyzed)) * 100);
  const priority = g.impact >= 70 ? 'Critical' : g.impact >= 50 ? 'High' : g.impact >= 30 ? 'Medium' : 'Low';
  const trend = g.recent > g.prior ? `rising (${g.recent} in the last 2 weeks vs ${g.prior} before)` : g.recent < g.prior ? `easing (${g.recent} vs ${g.prior})` : 'stable';
  const top = g.examples[0] || 'recurring complaints';
  return {
    category: g.category,
    title: `${g.category}: ${top}`.slice(0, 70),
    description: `${g.negative} of ${g.total} ${g.category} comments are negative or mixed, led by "${top}".`,
    priority: priority as 'Critical' | 'High' | 'Medium' | 'Low',
    reasoning: `${g.negative} negative/mixed mentions make up ${share}% of all analyzed feedback, with an average urgency of ${g.urgency.toFixed(1)}/5 and sentiment of ${g.avgScore.toFixed(2)}. The trend is ${trend}, giving an impact score of ${g.impact}.`,
    actionItems: PLAYBOOK[g.category] ?? ['Review the linked feedback with the owning team', 'Identify the root cause of the top complaint', 'Set a target metric and re-check sentiment in 2 weeks'],
  };
}
