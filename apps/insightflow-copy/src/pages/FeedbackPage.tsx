import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { listFeedback, createFeedback, analyzeFeedback, deleteFeedback, ListFeedbackOutputType } from 'zitejs/api';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Checkbox } from '@project/components/ui/checkbox';
import { Skeleton } from '@project/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@project/components/ui/alert-dialog';
import { Plus, Upload, Sparkles, Database, Search, Trash2, Loader2, ArrowUpDown, MessageSquareText, ChevronLeft, ChevronRight, Brain } from 'lucide-react';
import { format } from 'date-fns';
import { PageHeader, SentimentBadge, EmptyState } from '../components/ui-bits';
import AddFeedbackDialog from '../components/AddFeedbackDialog';
import FeedbackDetailDialog from '../components/FeedbackDetailDialog';
import { csvToFeedback } from '../lib/csv';
import { buildSampleData } from '../lib/sampleData';

type F = ListFeedbackOutputType['feedback'][0];
const PAGE = 15;

function FilterSelect({ value, onChange, options, all }: { value: string; onChange: (v: string) => void; options: string[]; all: string }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full bg-card sm:w-40"><SelectValue /></SelectTrigger>
      <SelectContent><SelectItem value="all">{all}</SelectItem>{options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
    </Select>
  );
}

export default function FeedbackPage() {
  const [items, setItems] = useState<F[] | null>(null);
  const [q, setQ] = useState('');
  const [sent, setSent] = useState('all');
  const [src, setSrc] = useState('all');
  const [cat, setCat] = useState('all');
  const [sort, setSort] = useState<'date' | 'urgency'>('date');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [detail, setDetail] = useState<F | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => listFeedback({}).then((r) => setItems(r.feedback)).catch(() => toast.error('Could not load feedback'));
  useEffect(() => { load(); }, []);
  useEffect(() => setPage(0), [q, sent, src, cat, sort]);

  const categories = useMemo(() => [...new Set((items ?? []).map((i) => i.category).filter(Boolean))].sort(), [items]);
  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    const r = (items ?? []).filter((i) =>
      (!s || [i.content, i.customerName, i.topics, i.category, i.complaint].join(' ').toLowerCase().includes(s)) &&
      (sent === 'all' || (sent === 'Pending' ? !i.analyzed : i.sentiment === sent)) &&
      (src === 'all' || i.source === src) && (cat === 'all' || i.category === cat));
    return sort === 'urgency' ? [...r].sort((a, b) => (b.urgency ?? 0) - (a.urgency ?? 0)) : r;
  }, [items, q, sent, src, cat, sort]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const rows = filtered.slice(page * PAGE, page * PAGE + PAGE);
  const pending = (items ?? []).filter((i) => !i.analyzed).length;

  const runAnalysis = async () => {
    setBusy('analyze');
    try {
      let total = 0, remaining = 1;
      while (remaining > 0) {
        const r = await analyzeFeedback({ limit: 40 });
        total += r.analyzed; remaining = r.remaining;
        if (r.analyzed === 0) break;
        toast.message(`Analyzed ${total} so far…`);
      }
      toast.success(`AI analyzed ${total} feedback items`);
      await load();
    } catch { toast.error('AI analysis failed — try again'); }
    setBusy(null);
  };

  const importItems = async (list: Parameters<typeof createFeedback>[0]['items'], label: string) => {
    if (!list.length) return toast.error('No feedback rows found');
    setBusy('import');
    try {
      const r = await createFeedback({ items: list });
      toast.success(`${label}: ${r.created} items added. Run AI analysis next.`);
      await load();
    } catch { toast.error('Import failed'); }
    setBusy(null);
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (f) importItems(csvToFeedback(await f.text()), 'CSV import');
  };

  const doDelete = async () => {
    const ids = [...sel];
    setItems((p) => p?.filter((i) => !sel.has(i.id)) ?? null); setSel(new Set());
    try { await deleteFeedback({ ids }); toast.success(`Deleted ${ids.length}`); } catch { toast.error('Delete failed'); load(); }
  };

  const toggle = (id: string) => setSel((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div>
      <PageHeader title="Feedback" subtitle="Every review, survey answer and support message in one place."
        actions={<>
          <Button variant="outline" onClick={() => importItems(buildSampleData(), 'Sample data')} disabled={!!busy}><Database className="mr-2 h-4 w-4" />Sample data</Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={!!busy}>{busy === 'import' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Import CSV</Button>
          <Button variant="outline" onClick={() => setAdding(true)}><Plus className="mr-2 h-4 w-4" />Add</Button>
          <Button onClick={runAnalysis} disabled={!!busy || pending === 0} className="bg-highlight text-highlight-foreground hover:bg-highlight/90">
            {busy === 'analyze' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}Analyze{pending ? ` (${pending})` : ''}
          </Button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={onFile} />
        </>} />
      <p className="-mt-3 mb-5 text-xs text-muted-foreground">CSV tip: include a column named <b>content</b>, <b>feedback</b> or <b>review</b>; optional <b>source</b>, <b>customer</b>, <b>rating</b>, <b>date</b>.</p>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="bg-card pl-9" placeholder="Search text, topics, customers…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <FilterSelect value={sent} onChange={setSent} options={['Positive', 'Neutral', 'Negative', 'Mixed', 'Pending']} all="All sentiment" />
        <FilterSelect value={src} onChange={setSrc} options={['Review', 'Survey', 'Support', 'Social', 'Other']} all="All sources" />
        <FilterSelect value={cat} onChange={setCat} options={categories} all="All categories" />
      </div>

      {sel.size > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-lg bg-secondary px-4 py-2 text-sm">
          <span>{sel.size} selected</span>
          <Button size="sm" variant="destructive" onClick={() => setConfirmDel(true)}><Trash2 className="mr-1.5 h-4 w-4" />Delete</Button>
        </div>
      )}

      {!items ? <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
        : items.length === 0 ? (
          <EmptyState icon={<MessageSquareText />} title="Start by bringing in feedback" text="Load a realistic sample dataset, import a CSV, or add feedback by hand."
            action={<><Button onClick={() => importItems(buildSampleData(), 'Sample data')} disabled={!!busy}><Database className="mr-2 h-4 w-4" />Load sample data</Button><Button variant="outline" onClick={() => fileRef.current?.click()}>Import CSV</Button></>} />
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="w-10 p-3"><Checkbox checked={rows.length > 0 && rows.every((r) => sel.has(r.id))} onCheckedChange={(c) => setSel(c ? new Set([...sel, ...rows.map((r) => r.id)]) : new Set())} /></th>
                    <th className="p-3">Feedback</th><th className="p-3">Sentiment</th><th className="p-3">Category</th>
                    <th className="cursor-pointer p-3" onClick={() => setSort('urgency')}><span className="inline-flex items-center gap-1">Urgency<ArrowUpDown className="h-3 w-3" /></span></th>
                    <th className="cursor-pointer p-3" onClick={() => setSort('date')}><span className="inline-flex items-center gap-1">Date<ArrowUpDown className="h-3 w-3" /></span></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="cursor-pointer border-t hover:bg-muted/40" onClick={() => setDetail(r)}>
                      <td className="p-3" onClick={(e) => e.stopPropagation()}><Checkbox checked={sel.has(r.id)} onCheckedChange={() => toggle(r.id)} /></td>
                      <td className="max-w-md p-3"><div className="line-clamp-2">{r.content}</div><div className="mt-0.5 text-xs text-muted-foreground">{r.source} · {r.customerName || 'Anonymous'}{r.manuallyCorrected && <span className="ml-1.5 inline-flex items-center gap-0.5 text-highlight"><Brain className="h-3 w-3" />corrected</span>}</div></td>
                      <td className="p-3"><SentimentBadge value={r.sentiment} /></td>
                      <td className="p-3 text-muted-foreground">{r.category || '—'}</td>
                      <td className="p-3">{r.urgency ? <div className="flex gap-0.5">{[1, 2, 3, 4, 5].map((n) => <span key={n} className={`h-2 w-3 rounded-sm ${n <= r.urgency! ? (r.urgency! >= 4 ? 'bg-destructive' : 'bg-highlight') : 'bg-muted'}`} />)}</div> : '—'}</td>
                      <td className="whitespace-nowrap p-3 text-muted-foreground">{r.submittedAt ? format(new Date(r.submittedAt), 'MMM d') : ''}</td>
                    </tr>
                  ))}
                  {rows.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-muted-foreground">No feedback matches your filters.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
              <span>{filtered.length} results</span>
              <div className="flex items-center gap-2">
                <Button size="icon" variant="outline" className="h-8 w-8" disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <span>Page {page + 1} / {pages}</span>
                <Button size="icon" variant="outline" className="h-8 w-8" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        )}

      <AddFeedbackDialog open={adding} onOpenChange={setAdding} onDone={load} />
      <FeedbackDetailDialog item={detail} categories={categories} onClose={() => setDetail(null)} onDone={load} />
      <AlertDialog open={confirmDel} onOpenChange={setConfirmDel}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete {sel.size} feedback items?</AlertDialogTitle><AlertDialogDescription>This can't be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={doDelete}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
