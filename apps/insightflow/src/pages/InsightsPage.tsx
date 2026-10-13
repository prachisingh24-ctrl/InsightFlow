import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { listIssues, generateRecommendations, updateIssue, ListIssuesOutputType } from 'zitejs/api';
import { Button } from '@project/components/ui/button';
import { Skeleton } from '@project/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@project/components/ui/tabs';
import { Sparkles, Loader2, Lightbulb, Download, LayoutList, Kanban } from 'lucide-react';
import { PageHeader, EmptyState } from '../components/ui-bits';
import IssueCard from '../components/IssueCard';
import IssueBoard from '../components/IssueBoard';
import { downloadCsv } from '../lib/csv';

type Issue = ListIssuesOutputType['issues'][0];

export default function InsightsPage() {
  const [issues, setIssues] = useState<Issue[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('active');
  const [view, setView] = useState<'list' | 'board'>(() => (localStorage.getItem('if-issues-view') === 'board' ? 'board' : 'list'));

  const load = () => listIssues({}).then((r) => setIssues(r.issues)).catch(() => toast.error('Could not load issues'));
  useEffect(() => { load(); }, []);
  const changeView = (v: string) => { setView(v as 'list' | 'board'); try { localStorage.setItem('if-issues-view', v); } catch { /* ignore */ } };

  const generate = async () => {
    setBusy(true);
    try {
      const r = await generateRecommendations({});
      if (r.created + r.updated === 0) toast.message('No negative patterns found yet — analyze some feedback first.');
      else toast.success(`${r.created} new issues, ${r.updated} refreshed${r.alertsSent ? ' · alert email sent' : ''}`);
      await load();
    } catch { toast.error('Could not generate recommendations'); }
    setBusy(false);
  };

  const patch = async (id: string, changes: Partial<Pick<Issue, 'status' | 'priority' | 'owner'>>) => {
    setIssues((p) => p?.map((i) => (i.id === id ? { ...i, ...changes } : i)) ?? null);
    try { await updateIssue({ ...(changes as Omit<Parameters<typeof updateIssue>[0], 'id'>), id }); } catch { toast.error('Update failed'); load(); }
  };
  const remove = async (id: string) => {
    setIssues((p) => p?.filter((i) => i.id !== id) ?? null);
    try { await updateIssue({ id, delete: true }); toast.success('Issue deleted'); } catch { toast.error('Delete failed'); load(); }
  };

  const exportCsv = () => {
    if (!issues?.length) return toast.message('No issues to export yet.');
    downloadCsv(`insightflow-issues-${new Date().toISOString().slice(0, 10)}.csv`, issues.map((i) => ({
      Title: i.title, Status: i.status, Priority: i.priority, Category: i.category, 'Impact score': i.impactScore,
      Trend: i.trend, 'Feedback items': i.feedbackCount, 'Repeat mentions': i.duplicateCount, Owner: i.owner,
      Description: i.description, Reasoning: i.reasoning, 'Action items': i.actionItems.replace(/\n/g, ' | '), Created: i.createdAt,
    })));
  };

  const shown = (issues ?? []).filter((i) => (tab === 'active' ? i.status !== 'Resolved' : tab === 'resolved' ? i.status === 'Resolved' : true));
  const counts = { active: (issues ?? []).filter((i) => i.status !== 'Resolved').length, resolved: (issues ?? []).filter((i) => i.status === 'Resolved').length };

  return (
    <div>
      <PageHeader title="Insights & Issues" subtitle="AI-ranked problems with the evidence behind them and what to do next."
        actions={<>
          <Button variant="outline" onClick={exportCsv}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
          <Button onClick={generate} disabled={busy} className="bg-highlight text-highlight-foreground hover:bg-highlight/90">{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}Generate recommendations</Button>
        </>} />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        {view === 'list' ? (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList><TabsTrigger value="active">Active ({counts.active})</TabsTrigger><TabsTrigger value="resolved">Resolved ({counts.resolved})</TabsTrigger><TabsTrigger value="all">All</TabsTrigger></TabsList>
          </Tabs>
        ) : <p className="text-sm text-muted-foreground">Drag cards between columns to update their status.</p>}
        <Tabs value={view} onValueChange={changeView}>
          <TabsList><TabsTrigger value="list"><LayoutList className="mr-1.5 h-4 w-4" />List</TabsTrigger><TabsTrigger value="board"><Kanban className="mr-1.5 h-4 w-4" />Board</TabsTrigger></TabsList>
        </Tabs>
      </div>
      {!issues ? <div className="space-y-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>
        : issues.length === 0 ? (
          <EmptyState icon={<Lightbulb />} title="No issues identified yet"
            text="Click Generate recommendations — the AI clusters negative feedback, scores impact from volume, urgency, repetition and trend, and proposes action items."
            action={<Button onClick={generate} disabled={busy}>Generate now</Button>} />
        ) : view === 'board' ? (
          <IssueBoard issues={issues} onStatus={(id, status) => patch(id, { status })} />
        ) : shown.length === 0 ? (
          <EmptyState icon={<Lightbulb />} title="Nothing here" text="No issues match this tab." />
        ) : (
          <div className="space-y-4">{shown.map((i, idx) => <IssueCard key={i.id} issue={i} rank={idx + 1} onPatch={patch} onDelete={remove} />)}</div>
        )}
    </div>
  );
}
