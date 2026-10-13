import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { listIssues, generateRecommendations, updateIssue, ListIssuesOutputType } from 'zitejs/api';
import { Button } from '@project/components/ui/button';
import { Skeleton } from '@project/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@project/components/ui/tabs';
import { Sparkles, Loader2, Lightbulb } from 'lucide-react';
import { PageHeader, EmptyState } from '../components/ui-bits';
import IssueCard from '../components/IssueCard';

type Issue = ListIssuesOutputType['issues'][0];

export default function InsightsPage() {
  const [issues, setIssues] = useState<Issue[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('active');

  const load = () => listIssues({}).then((r) => setIssues(r.issues)).catch(() => toast.error('Could not load issues'));
  useEffect(() => { load(); }, []);

  const generate = async () => {
    setBusy(true);
    try {
      const r = await generateRecommendations({});
      if (r.created + r.updated === 0) toast.message('No negative patterns found yet — analyze some feedback first.');
      else toast.success(`${r.created} new issues, ${r.updated} refreshed`);
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

  const shown = (issues ?? []).filter((i) => (tab === 'active' ? i.status !== 'Resolved' : tab === 'resolved' ? i.status === 'Resolved' : true));
  const counts = { active: (issues ?? []).filter((i) => i.status !== 'Resolved').length, resolved: (issues ?? []).filter((i) => i.status === 'Resolved').length };

  return (
    <div>
      <PageHeader title="Insights & Issues" subtitle="AI-ranked problems with the evidence behind them and what to do next."
        actions={<Button onClick={generate} disabled={busy} className="bg-highlight text-highlight-foreground hover:bg-highlight/90">{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}Generate recommendations</Button>} />
      <Tabs value={tab} onValueChange={setTab} className="mb-5">
        <TabsList><TabsTrigger value="active">Active ({counts.active})</TabsTrigger><TabsTrigger value="resolved">Resolved ({counts.resolved})</TabsTrigger><TabsTrigger value="all">All</TabsTrigger></TabsList>
      </Tabs>
      {!issues ? <div className="space-y-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>
        : shown.length === 0 ? (
          <EmptyState icon={<Lightbulb />} title={issues.length ? 'Nothing here' : 'No issues identified yet'}
            text="Click Generate recommendations — the AI clusters negative feedback, scores impact from volume, urgency and trend, and proposes action items."
            action={!issues.length && <Button onClick={generate} disabled={busy}>Generate now</Button>} />
        ) : (
          <div className="space-y-4">{shown.map((i, idx) => <IssueCard key={i.id} issue={i} rank={idx + 1} onPatch={patch} onDelete={remove} />)}</div>
        )}
    </div>
  );
}
