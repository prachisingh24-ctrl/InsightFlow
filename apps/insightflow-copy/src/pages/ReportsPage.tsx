import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { reports as reportsApi, generateReport, ReportsOutputType } from 'zitejs/api';
import { Button } from '@project/components/ui/button';
import { Skeleton } from '@project/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@project/components/ui/alert-dialog';
import { Sparkles, Loader2, FileText, Link2, Download, Printer, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@project/components/lib/utils';
import { PageHeader, EmptyState } from '../components/ui-bits';
import ReportView from '../components/ReportView';

type R = ReportsOutputType['reports'][0];

export default function ReportsPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [list, setList] = useState<R[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(false);

  const load = () => reportsApi({ action: 'list' }).then((r) => setList(r.reports)).catch(() => toast.error('Could not load reports'));
  useEffect(() => { load(); }, []);
  useEffect(() => { if (!id && list?.length) nav(`/reports/${list[0].id}`, { replace: true }); }, [id, list]);
  const current = list?.find((r) => r.id === id);

  const generate = async () => {
    setBusy(true);
    try {
      const r = await generateReport({});
      toast.success('Report ready');
      await load(); nav(`/reports/${r.id}`);
    } catch { toast.error('Could not generate report'); }
    setBusy(false);
  };
  const share = () => { navigator.clipboard.writeText(`${window.location.origin}/share/${current!.id}`); toast.success('Share link copied'); };
  const download = () => {
    const blob = new Blob([`# ${current!.title}\n\n${current!.content}`], { type: 'text/markdown' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${current!.title.replace(/[^\w]+/g, '-')}.md`; a.click();
  };
  const remove = async () => {
    const rid = current!.id;
    setList((p) => p?.filter((r) => r.id !== rid) ?? null); nav('/reports');
    try { await reportsApi({ action: 'delete', id: rid }); toast.success('Report deleted'); } catch { toast.error('Delete failed'); load(); }
  };

  return (
    <div>
      <PageHeader title="Reports" subtitle="Executive-ready insight reports you can share, print or download."
        actions={<Button onClick={generate} disabled={busy} className="bg-highlight text-highlight-foreground hover:bg-highlight/90">{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}{busy ? 'Writing report…' : 'Generate report'}</Button>} />
      {!list ? <Skeleton className="h-96 rounded-xl" /> : list.length === 0 ? (
        <EmptyState icon={<FileText />} title="No reports yet" text="Generate a report to get an executive summary, key metrics, prioritized issues and a timeline of recommended actions." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <div className="space-y-2 print:hidden">
            {list.map((r) => (
              <button key={r.id} onClick={() => nav(`/reports/${r.id}`)} className={cn('w-full rounded-xl border bg-card p-3 text-left transition-colors', r.id === id ? 'border-primary ring-1 ring-primary' : 'hover:bg-muted/50')}>
                <div className="line-clamp-2 text-sm font-semibold">{r.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{r.createdAt && format(new Date(r.createdAt), 'PP p')}</div>
              </button>
            ))}
          </div>
          {current ? (
            <div>
              <div className="mb-3 flex flex-wrap justify-end gap-2 print:hidden">
                <Button size="sm" variant="outline" onClick={share}><Link2 className="mr-1.5 h-4 w-4" />Copy share link</Button>
                <Button size="sm" variant="outline" onClick={download}><Download className="mr-1.5 h-4 w-4" />Markdown</Button>
                <Button size="sm" variant="outline" onClick={() => window.open(`/share/${current.id}?print=1`, '_blank')}><Printer className="mr-1.5 h-4 w-4" />Print / PDF</Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDel(true)}><Trash2 className="h-4 w-4" /></Button>
              </div>
              <ReportView {...current} />
            </div>
          ) : <Skeleton className="h-96 rounded-xl" />}
        </div>
      )}
      <AlertDialog open={del} onOpenChange={setDel}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete this report?</AlertDialogTitle><AlertDialogDescription>Shared links to it will stop working.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={remove}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
