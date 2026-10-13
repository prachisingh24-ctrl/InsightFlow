import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { askJson, getAdaptionContext } from '../lib/ai';
import { detectDuplicates } from '../lib/duplicates';
import { dispatchAlerts } from '../lib/alerts';

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

type Group = {
  category: string; total: number; negative: number; uniqueNegative: number; duplicates: number;
  urgency: number; avgScore: number; avgRating: number | null; recent: number; prior: number;
  trend: 'Rising' | 'Stable' | 'Easing'; impact: number; examples: string[];
};

const priorityFor = (impact: number) => (impact >= 65 ? 'Critical' : impact >= 45 ? 'High' : impact >= 28 ? 'Medium' : 'Low') as 'Critical' | 'High' | 'Medium' | 'Low';

/**
 * Impact score (0-100), built from six signals:
 *  volume 30 (share of all feedback that is negative) + urgency 25 + severity 15 (sentiment & low ratings)
 *  + recency 10 (how much is from the last 14 days) + trend 10 (growth vs the prior 14 days)
 *  + repetition 10 (the same complaint raised again and again).
 */
function impactOf(g: { negative: number; duplicates: number; urgency: number; avgScore: number; avgRating: number | null; recent: number; prior: number }, totalAnalyzed: number) {
  const volume = Math.min(30, (g.negative / Math.max(1, totalAnalyzed)) * 100 * 1.5);
  const urgency = (Math.max(1, Math.min(5, g.urgency)) / 5) * 25;
  const sentimentSev = ((1 - Math.max(-1, Math.min(1, g.avgScore))) / 2) * 15;
  const severity = g.avgRating != null ? (sentimentSev + ((5 - Math.max(1, Math.min(5, g.avgRating))) / 4) * 15) / 2 : sentimentSev;
  const recency = (g.recent / Math.max(1, g.negative)) * 10;
  const trend = g.recent > g.prior ? Math.min(10, ((g.recent - g.prior) / Math.max(1, g.prior)) * 10) : 0;
  const repetition = Math.min(10, g.duplicates * 2);
  return Math.round(Math.min(100, volume + urgency + severity + recency + trend + repetition));
}

export default createEndpoint({
  description: 'Generates prioritized issues with reasoning and action items from analyzed feedback, then sends any alerts',
  inputSchema: z.object({}),
  outputSchema: z.object({ created: z.number(), updated: z.number(), alertsSent: z.boolean().optional() }),
  execute: async () => {
    try { await detectDuplicates(); } catch (e) { console.error('Duplicate detection failed', e); }

    const stats = await zite.sql({
      query: `SELECT "category" AS category, COUNT(*) AS total,
          COUNT(*) FILTER (WHERE "sentiment" IN ('Negative','Mixed')) AS negative,
          COUNT(*) FILTER (WHERE "sentiment" IN ('Negative','Mixed') AND ("duplicateOf" IS NULL OR "duplicateOf" = '')) AS "uniqueNegative",
          COUNT(*) FILTER (WHERE "sentiment" IN ('Negative','Mixed') AND "duplicateOf" IS NOT NULL AND "duplicateOf" <> '') AS duplicates,
          COALESCE(AVG("urgency") FILTER (WHERE "sentiment" IN ('Negative','Mixed')), 1) AS "avgUrgency",
          COALESCE(AVG("sentimentScore") FILTER (WHERE "sentiment" IN ('Negative','Mixed')), 0) AS "avgScore",
          AVG("rating") FILTER (WHERE "sentiment" IN ('Negative','Mixed') AND "rating" IS NOT NULL) AS "avgRating",
          COUNT(*) FILTER (WHERE "submittedAt" >= now() - interval '14 days' AND "sentiment" IN ('Negative','Mixed')) AS "recentNeg",
          COUNT(*) FILTER (WHERE "submittedAt" < now() - interval '14 days' AND "submittedAt" >= now() - interval '28 days' AND "sentiment" IN ('Negative','Mixed')) AS "priorNeg"
        FROM "Feedback" WHERE "analyzed" = true AND "category" IS NOT NULL AND "category" <> ''
        GROUP BY 1 HAVING COUNT(*) FILTER (WHERE "sentiment" IN ('Negative','Mixed')) > 0
        ORDER BY 3 DESC LIMIT 8`,
    });
    if (!stats.rows.length) return { created: 0, updated: 0 };
    const totalRes = await zite.sql({ query: `SELECT COUNT(*) AS c FROM "Feedback" WHERE "analyzed" = true` });
    const totalAnalyzed = Number(totalRes.rows[0]?.c ?? 1);

    const { records: fb } = await zite.feedback.findAll({ filters: { analyzed: true }, limit: 2000 });
    const neg = fb.filter((f) => f.sentiment === 'Negative' || f.sentiment === 'Mixed');

    const groups: Group[] = stats.rows.map((r) => {
      const recent = Number(r.recentNeg), prior = Number(r.priorNeg);
      const base = {
        negative: Number(r.negative), duplicates: Number(r.duplicates), urgency: Number(r.avgUrgency), avgScore: Number(r.avgScore),
        avgRating: r.avgRating == null ? null : Number(r.avgRating), recent, prior,
      };
      const trend: Group['trend'] = recent - prior >= 1 && recent >= prior * 1.25 ? 'Rising' : prior - recent >= 1 && recent <= prior * 0.75 ? 'Easing' : 'Stable';
      const category = String(r.category);
      return {
        ...base, category, total: Number(r.total), uniqueNegative: Number(r.uniqueNegative), trend,
        impact: impactOf(base, totalAnalyzed),
        examples: neg.filter((f) => f.category === category && !f.duplicateOf).sort((a, b) => (b.urgency ?? 0) - (a.urgency ?? 0))
          .slice(0, 6).map((f) => f.complaint || (f.content ?? '').slice(0, 160)),
      };
    });

    const adaption = await getAdaptionContext();
    let result: Rec;
    try {
      result = await askJson<Rec>(
        `You are a customer-experience strategist. Given category-level feedback stats and example complaints, produce one issue per category as JSON {"issues":[{"category","title","description","priority","reasoning","actionItems"}]}.
- title: crisp issue name (max 8 words)
- description: 1-2 sentences describing the problem
- priority: Critical, High, Medium or Low based on impact score, urgency, volume and trend (impact>=65 Critical, >=45 High, >=28 Medium, else Low)
- reasoning: 2-3 sentences citing the actual numbers (negative count, % of all feedback, urgency, trend vs prior 2 weeks, and how many duplicate mentions show customers repeating the same complaint)
- actionItems: 3 concrete, specific actions a business team can take
Each category has fields: negative (all negative/mixed mentions), uniqueNegative (after removing duplicates), duplicates, urgency (avg 1-5), avgRating, recent/prior (negative counts in last 14 days vs the 14 days before), trend, impact.${adaption}`,
        JSON.stringify(groups),
      );
    } catch (e) {
      console.error('AI unavailable, using data-driven fallback', e);
      result = { issues: groups.map((g) => fallbackIssue(g, totalAnalyzed)) };
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
        priority: (['Critical', 'High', 'Medium', 'Low'].includes(iss.priority) ? iss.priority : priorityFor(g.impact)) as 'Critical' | 'High' | 'Medium' | 'Low',
        category: g.category,
        impactScore: g.impact,
        reasoning: iss.reasoning,
        actionItems: (iss.actionItems ?? []).map((a) => `- ${a}`).join('\n'),
        trend: g.trend,
        duplicateCount: g.duplicates,
        feedback: linked,
      };
      const match = existing.find((e) => e.category === g.category && e.status !== 'Resolved');
      if (match) {
        await zite.issues.update({ id: match.id, record });
        updated++;
      } else {
        await zite.issues.create({ record: { ...record, status: 'Open', alerted: false } });
        created++;
      }
    }

    let alertsSent = false;
    try { alertsSent = (await dispatchAlerts()).sent; } catch (e) { console.error('Alert dispatch failed', e); }
    return { created, updated, alertsSent };
  },
});

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
  const trend = g.trend === 'Rising' ? `rising (${g.recent} in the last 2 weeks vs ${g.prior} before)` : g.trend === 'Easing' ? `easing (${g.recent} vs ${g.prior})` : 'stable';
  const top = g.examples[0] || 'recurring complaints';
  const dupes = g.duplicates ? ` ${g.duplicates} of them repeat an earlier complaint.` : '';
  return {
    category: g.category,
    title: `${g.category}: ${top}`.slice(0, 70),
    description: `${g.negative} of ${g.total} ${g.category} comments are negative or mixed, led by "${top}".`,
    priority: priorityFor(g.impact),
    reasoning: `${g.negative} negative/mixed mentions make up ${share}% of all analyzed feedback, with an average urgency of ${g.urgency.toFixed(1)}/5 and sentiment of ${g.avgScore.toFixed(2)}.${dupes} The trend is ${trend}, giving an impact score of ${g.impact}.`,
    actionItems: PLAYBOOK[g.category] ?? ['Review the linked feedback with the owning team', 'Identify the root cause of the top complaint', 'Set a target metric and re-check sentiment in 2 weeks'],
  };
}
