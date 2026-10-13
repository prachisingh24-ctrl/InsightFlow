import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDashboard, GetDashboardOutputType } from 'zitejs/api';
import { Card, CardContent, CardHeader, CardTitle } from '@project/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { Skeleton } from '@project/components/ui/skeleton';
import { Button } from '@project/components/ui/button';
import { MessageSquareText, Smile, Frown, AlertTriangle, Flag, Gauge, BarChart3 } from 'lucide-react';
import { PageHeader, EmptyState } from '../components/ui-bits';
import { SentimentPie, TrendChart, CategoryChart } from '../components/DashboardCharts';

function Stat({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof Smile; tone: string }) {
  return (
    <Card className="shadow-sm">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`grid h-11 w-11 place-items-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></div>
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="text-2xl font-extrabold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [days, setDays] = useState('0');
  const [source, setSource] = useState('All');
  const [data, setData] = useState<GetDashboardOutputType | null>(null);

  useEffect(() => {
    setData(null);
    getDashboard({ days: Number(days) || undefined, source }).then(setData).catch(() => setData(null));
  }, [days, source]);

  const filters = (
    <>
      <Select value={days} onValueChange={setDays}>
        <SelectTrigger className="w-36 bg-card"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="0">All time</SelectItem><SelectItem value="7">Last 7 days</SelectItem>
          <SelectItem value="30">Last 30 days</SelectItem><SelectItem value="90">Last 90 days</SelectItem>
        </SelectContent>
      </Select>
      <Select value={source} onValueChange={setSource}>
        <SelectTrigger className="w-36 bg-card"><SelectValue /></SelectTrigger>
        <SelectContent>
          {['All', 'Review', 'Survey', 'Support', 'Social', 'Other'].map((s) => <SelectItem key={s} value={s}>{s === 'All' ? 'All sources' : s}</SelectItem>)}
        </SelectContent>
      </Select>
    </>
  );

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="How customers feel, what they talk about, and where it's heading." actions={filters} />
      {!data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : data.total === 0 ? (
        <EmptyState icon={<BarChart3 />} title="No feedback yet" text="Add feedback, import a CSV, or load sample data to see your dashboard come alive."
          action={<Button asChild><Link to="/feedback">Go to Feedback</Link></Button>} />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Stat label="Total feedback" value={String(data.total)} icon={MessageSquareText} tone="bg-secondary text-primary" />
            <Stat label="Sentiment score" value={(data.avgScore >= 0 ? '+' : '') + data.avgScore.toFixed(2)} icon={Gauge} tone="bg-info-soft text-info" />
            <Stat label="Positive" value={`${Math.round(data.positivePct * 100)}%`} icon={Smile} tone="bg-positive-soft text-positive" />
            <Stat label="Negative" value={`${Math.round(data.negativePct * 100)}%`} icon={Frown} tone="bg-negative-soft text-negative" />
            <Stat label="High urgency" value={String(data.highUrgency)} icon={AlertTriangle} tone="bg-highlight-soft text-highlight" />
            <Stat label="Open issues" value={String(data.openIssues)} icon={Flag} tone="bg-warning-soft text-warning" />
          </div>
          {data.analyzed < data.total && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-highlight/30 bg-highlight-soft px-4 py-3 text-sm">
              <span><b>{data.total - data.analyzed}</b> feedback items haven't been analyzed by AI yet.</span>
              <Button size="sm" asChild><Link to="/feedback">Analyze now</Link></Button>
            </div>
          )}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2"><CardHeader><CardTitle className="text-base">Sentiment trend (weekly)</CardTitle></CardHeader><CardContent><TrendChart data={data.trend} /></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">Sentiment distribution</CardTitle></CardHeader><CardContent><SentimentPie data={data.sentiment} /></CardContent></Card>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2"><CardHeader><CardTitle className="text-base">Categories — volume vs. negative</CardTitle></CardHeader><CardContent><CategoryChart data={data.categories} /></CardContent></Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Top complaints</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {data.topComplaints.length === 0 && <p className="text-sm text-muted-foreground">No complaints detected yet.</p>}
                {data.topComplaints.map((c) => (
                  <div key={c.complaint} className="flex items-start justify-between gap-3">
                    <div><div className="text-sm font-medium capitalize">{c.complaint}</div><div className="text-xs text-muted-foreground">{c.category}</div></div>
                    <span className="rounded-full bg-negative-soft px-2 py-0.5 text-xs font-bold text-negative">{c.count}</span>
                  </div>
                ))}
                <div className="pt-2 text-xs text-muted-foreground">Sources: {data.sources.map((s) => `${s.name} ${s.value}`).join(' · ')}</div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
