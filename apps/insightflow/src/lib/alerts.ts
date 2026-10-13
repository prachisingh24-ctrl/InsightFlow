import { zite } from 'zitejs/db';
import { Email } from 'zitejs/email';

export type Drift = {
  category: string;
  recentTotal: number;
  recentNegative: number;
  priorTotal: number;
  priorNegative: number;
  recentRate: number;
  priorRate: number;
  rateChange: number; // percentage points
  scoreChange: number; // avg sentiment score change
  severity: 'High' | 'Medium';
  reason: string;
};

const pct = (n: number) => `${Math.round(n * 100)}%`;

/** Compares each category's last `windowDays` days with the `windowDays` before to spot sentiment drift. */
export async function computeDrift(windowDays = 14): Promise<Drift[]> {
  const now = Date.now();
  const recentStart = new Date(now - windowDays * 86400000).toISOString();
  const priorStart = new Date(now - windowDays * 2 * 86400000).toISOString();
  const res = await zite.sql({
    query: `SELECT "category" AS category,
        COUNT(*) FILTER (WHERE "submittedAt" >= $1) AS "rTotal",
        COUNT(*) FILTER (WHERE "submittedAt" >= $1 AND "sentiment" IN ('Negative','Mixed')) AS "rNeg",
        COALESCE(AVG("sentimentScore") FILTER (WHERE "submittedAt" >= $1), 0) AS "rScore",
        COUNT(*) FILTER (WHERE "submittedAt" < $1) AS "pTotal",
        COUNT(*) FILTER (WHERE "submittedAt" < $1 AND "sentiment" IN ('Negative','Mixed')) AS "pNeg",
        COALESCE(AVG("sentimentScore") FILTER (WHERE "submittedAt" < $1), 0) AS "pScore"
      FROM "Feedback"
      WHERE "analyzed" = true AND "category" IS NOT NULL AND "category" <> '' AND "submittedAt" >= $2
      GROUP BY 1`,
    params: [recentStart, priorStart],
  });

  const out: Drift[] = [];
  for (const r of res.rows) {
    const rT = Number(r.rTotal), rN = Number(r.rNeg), pT = Number(r.pTotal), pN = Number(r.pNeg);
    if (rT < 3) continue; // not enough recent volume to call it a trend
    const recentRate = rN / rT;
    const priorRate = pT ? pN / pT : 0;
    const rateChange = recentRate - priorRate;
    const scoreChange = Number(r.rScore) - Number(r.pScore);
    const category = String(r.category);
    let severity: Drift['severity'] | null = null;
    let reason = '';

    if (pT >= 3) {
      if (rateChange >= 0.35) severity = 'High';
      else if (rateChange >= 0.2 || scoreChange <= -0.3) severity = 'Medium';
      if (severity) reason = `Negative share rose from ${pct(priorRate)} to ${pct(recentRate)} (${rN} of ${rT} recent items), average sentiment ${scoreChange >= 0 ? '+' : ''}${scoreChange.toFixed(2)}.`;
    } else if (rN >= 4 && recentRate >= 0.6) {
      severity = 'High';
      reason = `New hotspot: ${rN} of ${rT} recent items are negative or mixed, with little history before this period.`;
    }
    if (severity) {
      out.push({
        category, recentTotal: rT, recentNegative: rN, priorTotal: pT, priorNegative: pN,
        recentRate, priorRate, rateChange: Math.round(rateChange * 100), scoreChange: Number(scoreChange.toFixed(2)), severity, reason,
      });
    }
  }
  return out.sort((a, b) => (a.severity === b.severity ? b.rateChange - a.rateChange : a.severity === 'High' ? -1 : 1));
}

export async function getSettingsRecord() {
  const { records } = await zite.alertSettings.findAll({ limit: 1 });
  return records[0];
}

export function appLink(path = '') {
  const base = (process.env.ZITE_APP_URL ?? '').replace(/\/$/, '');
  return base ? `${base}${path}` : '';
}

/**
 * Emails the configured address about new Critical issues and sentiment drift.
 * Critical issues are only announced once; drift alerts at most once every 24 hours.
 */
export async function dispatchAlerts(): Promise<{ sent: boolean; critical: number; drift: number; reason?: string }> {
  const s = await getSettingsRecord();
  if (!s?.enabled || !s.email) return { sent: false, critical: 0, drift: 0, reason: 'Alerts are off or no email is set.' };

  const lines: string[] = [];
  let criticalIds: string[] = [];
  let driftCount = 0;

  if (s.notifyCriticalIssues) {
    const { records } = await zite.issues.findAll({ filters: { priority: 'Critical' }, limit: 200 });
    const fresh = records.filter((i) => i.status !== 'Resolved' && !i.alerted);
    criticalIds = fresh.map((i) => i.id);
    if (fresh.length) {
      lines.push(`CRITICAL ISSUES (${fresh.length})`);
      for (const i of fresh) lines.push(`• ${i.title} — ${i.category}, impact ${i.impactScore ?? 0}. ${i.description ?? ''}`.trim());
      lines.push('');
    }
  }

  if (s.notifySentimentDrift) {
    const recentlySent = s.lastSent && Date.now() - new Date(s.lastSent).getTime() < 24 * 3600 * 1000;
    if (!recentlySent) {
      const drift = (await computeDrift()).filter((d) => d.severity === 'High');
      driftCount = drift.length;
      if (drift.length) {
        lines.push(`SENTIMENT DRIFT (${drift.length})`);
        for (const d of drift) lines.push(`• ${d.category}: ${d.reason}`);
        lines.push('');
      }
    }
  }

  if (!lines.length) return { sent: false, critical: 0, drift: 0, reason: 'Nothing new to report.' };

  const link = appLink('/insights');
  if (link) lines.push(`Review everything in InsightFlow: ${link}`);
  await Email.send({
    to: s.email,
    subject: `InsightFlow alert: ${criticalIds.length} critical issue(s), ${driftCount} sentiment shift(s)`,
    body: [{ type: 'text', content: lines.join('\n') }],
  });

  await Promise.all(criticalIds.map((id) => zite.issues.update({ id, record: { alerted: true } })));
  await zite.alertSettings.update({ id: s.id, record: { lastSent: new Date().toISOString() } });
  return { sent: true, critical: criticalIds.length, drift: driftCount };
}
