import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDashboard, GetDashboardOutputType } from 'zitejs/api';
import { Card, CardContent, CardHeader, CardTitle } from '@project/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { Skeleton } from '@project/components/ui/skeleton';
import { Button } from '@project/components/ui/button';
import { MessageSquareText, Smile, Frown, AlertTriangle, Flag, Gauge, BarChart3, ShieldQuestion, Copy, FilterX } from 'lucide-react';
import { PageHeader, EmptyState } from '../components/ui-bits';
import { SentimentPie, TrendChart, CategoryChart } from '../components/DashboardCharts';
import DriftBanner from '../components/DriftBanner';

function Stat({ label, value, icon: Icon, tone, hint }: { label: string; value: string; icon: typeof Smile; tone: string; hint?: string }) {
  return (
    <Card className="shadow-sm">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></div>
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="text-2xl font-extrabold">{value}</div>
          {hint && <div className="truncate text-[11px] text-muted-foreground">{hint}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [days, setDays] = useState('0');
  const [source, setSource] = useState('All');
  const [category, setCategory] = useState('All');
  const [sentiment, setSentiment] = useState('All');
  const [data, setData] = useState<GetDashboardOutputType | null>(null);
  const [cats, setCats] = useState<string[]>([]);

  useEffect(() => {
    setData(null);
    getDashboard({ days: Number(days) || undefined, source, category, sentiment })
      .then((d) => { setData(d); setCats(d.availableCategories); })
      .catch(() => setData(null));
  }, [days, source, category, sentiment]);

  const active = days !== '0' || source !== 'All' || category !== 'All' || sentiment !== 'All';
  const reset = () => { setDays('0'); setSource('All'); setCategory('All'); setSentiment('All'); };

  const filters = (
    <>
      <Select value={days} onValueChange={setDays}>
        <SelectTrigger className="w-36 bg-card"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="0">All time</SelectItem><SelectItem value="7">Last 7 days</SelectItem><SelectItem value="14">Last 14 days</SelectItem>
          <SelectItem value="30">Last 30 days</SelectItem><SelectItem value="90">Last 90 days</SelectItem>
        </SelectContent>
      </Select>
      <Select value={source} onValueChange={setSource}>
        <SelectTrigger className="w-36 bg-card"><SelectValue /></SelectTrigger>
        <SelectContent>
          {['All', 'Review', 'Survey', 'Support', 'Social', 'Other'].map((s) => <SelectItem key={s} value={s}>{s === 'All' ? 'All sources' : s}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={category} onValueChange={setCategory}>
        <SelectTrigger className="w-44 bg-card"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="All">All categories</SelectItem>
          {cats.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={sentiment} onValueChange={setSentiment}>
        <SelectTrigger className="w-36 bg-card"><SelectValue /></SelectTrigger>
        <SelectContent>
          {['All', 'Positive', 'Neutral', 'Negative', 'Mixed'].map((s) => <SelectItem key={s} value={s}>{s === 'All' ? 'All sentiment' : s}</SelectItem>)}
        </SelectContent>
      </Select>
      {active && <Button variant="ghost" onClick={reset}><FilterX className="mr-2 h-4 w-4" />Reset</Button>}
    </>
  );

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="How customers feel, what they talk about, and where it's heading." actions={filters} />
      <div className="mb-6"><DriftBanner /></div>
      {!data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : data.total === 0 ? (
        <EmptyState icon={<BarChart3 />} title={active ? 'No feedback matches these filters' : 'No feedback yet'}
          text={active ? 'Try a wider date range or clear a filter.' : 'Add feedback, import a CSV, or load sample data to see your dashboard come alive.'}
          action={active ? <Button onClick={reset}>Reset filters</Button> : <Button asChild><Link to="/feedback">Go to Feedback</Link></Button>} />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Total feedback" value={String(data.total)} icon={MessageSquareText} tone="bg-secondary text-primary" />
            <Stat label="Sentiment score" value={(data.avgScore >= 0 ? '+' : '') + data.avgScore.toFixed(2)} icon={Gauge} tone="bg-info-soft text-info" />
            <Stat label="Positive" value={`${Math.round(data.positivePct * 100)}%`} icon={Smile} tone="bg-positive-soft text-positive" />
            <Stat label="Negative" value={`${Math.round(data.negativePct * 100)}%`} icon={Frown} tone="bg-negative-soft text-negative" />
            <Stat label="High urgency" value={String(data.highUrgency)} icon={AlertTriangle} tone="bg-highlight-soft text-highlight" />
            <Stat label="Open issues" value={String(data.openIssues)} icon={Flag} tone="bg-warning-soft text-warning" />
            <Stat label="Needs review" value={String(data.needsReview)} icon={ShieldQuestion} tone="bg-highlight-soft text-highlight" hint="AI confidence below 60%" />
            <Stat label="Repeat mentions" value={String(data.duplicates)} icon={Copy} tone="bg-secondary text-primary" hint="Duplicates grouped together" />
          </div>
          {data.analyzed < data.total && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-highlight/30 bg-highlight-soft px-4 py-3 text-sm">
              <span><b>{data.total - data.analyzed}</b> feedback items haven't been analyzed by AI yet.</span>
              <Button size="sm" asChild><Link to="/feedback">Analyze now</Link></Button>
            </div>
          )}
          {data.needsReview > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 text-sm">
              <span><b>{data.needsReview}</b> analyses are low-confidence. A quick human check makes the AI smarter.</span>
              <Button size="sm" variant="outline" asChild><Link to="/feedback?review=1">Review them</Link></Button>
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
