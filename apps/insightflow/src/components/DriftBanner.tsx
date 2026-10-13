import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDriftAlerts, GetDriftAlertsOutputType } from 'zitejs/api';
import { TrendingDown, ArrowRight } from 'lucide-react';
import { cn } from '@project/components/lib/utils';

export default function DriftBanner({ limit = 3, linkToAlerts = true }: { limit?: number; linkToAlerts?: boolean }) {
  const [data, setData] = useState<GetDriftAlertsOutputType | null>(null);
  useEffect(() => { getDriftAlerts({}).then(setData).catch(() => setData(null)); }, []);
  if (!data || data.alerts.length === 0) return null;
  return (
    <div className="rounded-xl border border-negative/30 bg-negative-soft p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-bold text-negative"><TrendingDown className="h-4 w-4" />Sentiment is slipping in {data.alerts.length} {data.alerts.length === 1 ? 'category' : 'categories'}</div>
        {linkToAlerts && <Link to="/alerts" className="inline-flex items-center gap-1 text-xs font-semibold text-negative hover:underline">Alert settings<ArrowRight className="h-3 w-3" /></Link>}
      </div>
      <ul className="space-y-1.5">
        {data.alerts.slice(0, limit).map((a) => (
          <li key={a.category} className="flex items-start gap-2 text-sm">
            <span className={cn('mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase', a.severity === 'High' ? 'bg-negative text-white' : 'bg-warning-soft text-warning')}>{a.severity}</span>
            <span><b>{a.category}</b> — {a.reason}</span>
          </li>
        ))}
      </ul>
      {data.alerts.length > limit && <p className="mt-2 text-xs text-muted-foreground">+ {data.alerts.length - limit} more</p>}
      <p className="mt-2 text-[11px] text-muted-foreground">Compared with the previous {data.windowDays} days.</p>
    </div>
  );
}
