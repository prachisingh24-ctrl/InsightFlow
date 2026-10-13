import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Computes dashboard metrics, sentiment distribution and trends, with optional date, source, category and sentiment filters',
  inputSchema: z.object({
    days: z.number().optional(),
    source: z.string().optional(),
    category: z.string().optional(),
    sentiment: z.string().optional(),
  }),
  outputSchema: z.object({
    total: z.number(),
    analyzed: z.number(),
    avgScore: z.number(),
    negativePct: z.number(),
    positivePct: z.number(),
    highUrgency: z.number(),
    openIssues: z.number(),
    needsReview: z.number(),
    duplicates: z.number(),
    availableCategories: z.array(z.string()),
    sentiment: z.array(z.object({ name: z.string(), value: z.number() })),
    sources: z.array(z.object({ name: z.string(), value: z.number() })),
    categories: z.array(z.object({ name: z.string(), total: z.number(), negative: z.number(), avgScore: z.number() })),
    trend: z.array(z.object({ week: z.string(), positive: z.number(), neutral: z.number(), negative: z.number(), mixed: z.number(), avgScore: z.number() })),
    topComplaints: z.array(z.object({ complaint: z.string(), category: z.string(), count: z.number() })),
  }),
  execute: async ({ input }) => {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (input.days) {
      params.push(new Date(Date.now() - input.days * 86400000).toISOString());
      conds.push(`"submittedAt" >= $${params.length}`);
    }
    if (input.source && input.source !== 'All') {
      params.push(input.source);
      conds.push(`"source" = $${params.length}`);
    }
    if (input.category && input.category !== 'All') {
      params.push(input.category);
      conds.push(`"category" = $${params.length}`);
    }
    if (input.sentiment && input.sentiment !== 'All') {
      params.push(input.sentiment);
      conds.push(`"sentiment" = $${params.length}`);
    }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const and = conds.length ? `AND ${conds.join(' AND ')}` : '';
    const q = (query: string) => zite.sql({ query, params });

    const [tot, sent, src, cat, trend, comp, issues, cats] = await Promise.all([
      q(`SELECT COUNT(*) AS total,
          COUNT(*) FILTER (WHERE "analyzed" = true) AS analyzed,
          COALESCE(AVG("sentimentScore"),0) AS "avgScore",
          COUNT(*) FILTER (WHERE "sentiment" = 'Negative') AS neg,
          COUNT(*) FILTER (WHERE "sentiment" = 'Positive') AS pos,
          COUNT(*) FILTER (WHERE "urgency" >= 4) AS urgent,
          COUNT(*) FILTER (WHERE "analyzed" = true AND "confidence" < 0.6 AND "manuallyCorrected" IS NOT TRUE) AS review,
          COUNT(*) FILTER (WHERE "duplicateOf" IS NOT NULL AND "duplicateOf" <> '') AS dupes
         FROM "Feedback" ${where}`),
      q(`SELECT "sentiment" AS name, COUNT(*) AS value FROM "Feedback" WHERE "sentiment" IS NOT NULL ${and} GROUP BY 1 ORDER BY 2 DESC`),
      q(`SELECT COALESCE("source",'Other') AS name, COUNT(*) AS value FROM "Feedback" ${where} GROUP BY 1 ORDER BY 2 DESC`),
      q(`SELECT "category" AS name, COUNT(*) AS total, COUNT(*) FILTER (WHERE "sentiment" IN ('Negative','Mixed')) AS negative,
          COALESCE(AVG("sentimentScore"),0) AS "avgScore"
         FROM "Feedback" WHERE "category" IS NOT NULL AND "category" <> '' ${and} GROUP BY 1 ORDER BY 2 DESC LIMIT 10`),
      q(`SELECT to_char(date_trunc('week', "submittedAt"), 'YYYY-MM-DD') AS week,
          COUNT(*) FILTER (WHERE "sentiment" = 'Positive') AS positive,
          COUNT(*) FILTER (WHERE "sentiment" = 'Neutral') AS neutral,
          COUNT(*) FILTER (WHERE "sentiment" = 'Negative') AS negative,
          COUNT(*) FILTER (WHERE "sentiment" = 'Mixed') AS mixed,
          COALESCE(AVG("sentimentScore"),0) AS "avgScore"
         FROM "Feedback" WHERE "submittedAt" IS NOT NULL ${and} GROUP BY 1 ORDER BY 1 ASC`),
      q(`SELECT LOWER("complaint") AS complaint, MAX("category") AS category, COUNT(*) AS count
         FROM "Feedback" WHERE "complaint" IS NOT NULL AND "complaint" <> '' ${and} GROUP BY 1 ORDER BY 3 DESC LIMIT 6`),
      zite.sql({ query: `SELECT COUNT(*) AS c FROM "Issues" WHERE "status" IS DISTINCT FROM 'Resolved'` }),
      zite.sql({ query: `SELECT DISTINCT "category" AS name FROM "Feedback" WHERE "category" IS NOT NULL AND "category" <> '' ORDER BY 1 ASC` }),
    ]);
    const t = tot.rows[0] ?? {};
    const total = Number(t.total ?? 0);
    const analyzed = Number(t.analyzed ?? 0);
    return {
      total,
      analyzed,
      avgScore: Number(t.avgScore ?? 0),
      negativePct: analyzed ? Number(t.neg) / analyzed : 0,
      positivePct: analyzed ? Number(t.pos) / analyzed : 0,
      highUrgency: Number(t.urgent ?? 0),
      openIssues: Number(issues.rows[0]?.c ?? 0),
      needsReview: Number(t.review ?? 0),
      duplicates: Number(t.dupes ?? 0),
      availableCategories: cats.rows.map((r) => String(r.name)),
      sentiment: sent.rows.map((r) => ({ name: String(r.name), value: Number(r.value) })),
      sources: src.rows.map((r) => ({ name: String(r.name), value: Number(r.value) })),
      categories: cat.rows.map((r) => ({ name: String(r.name), total: Number(r.total), negative: Number(r.negative), avgScore: Number(r.avgScore) })),
      trend: trend.rows.map((r) => ({
        week: String(r.week), positive: Number(r.positive), neutral: Number(r.neutral),
        negative: Number(r.negative), mixed: Number(r.mixed), avgScore: Number(r.avgScore),
      })),
      topComplaints: comp.rows.map((r) => ({ complaint: String(r.complaint), category: String(r.category ?? ''), count: Number(r.count) })),
    };
  },
});
