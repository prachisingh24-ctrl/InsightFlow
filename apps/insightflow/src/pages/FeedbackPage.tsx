import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { listFeedback, createFeedback, analyzeFeedback, deleteFeedback, detectDuplicates, ListFeedbackOutputType } from 'zitejs/api';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Checkbox } from '@project/components/ui/checkbox';
import { Switch } from '@project/components/ui/switch';
import { Label } from '@project/components/ui/label';
import { Skeleton } from '@project/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@project/components/ui/alert-dialog';
import { Plus, Upload, Sparkles, Database, Search, Trash2, Loader2, ArrowUpDown, MessageSquareText, ChevronLeft, ChevronRight, Brain, Download, Copy, ShieldQuestion } from 'lucide-react';
import { format } from 'date-fns';
import { PageHeader, SentimentBadge, EmptyState } from '../components/ui-bits';
import AddFeedbackDialog from '../components/AddFeedbackDialog';
import FeedbackDetailDialog from '../components/FeedbackDetailDialog';
import { csvToFeedback, downloadCsv } from '../lib/csv';
import { buildSampleData } from '../lib/sampleData';

type F = ListFeedbackOutputType['feedback'][0];
const PAGE = 15;
const LOW_CONFIDENCE = 0.6;
const needsReview = (f: F) => f.analyzed && !f.manuallyCorrected && f.confidence != null && f.confidence < LOW_CONFIDENCE;

function FilterSelect({ value, onChange, options, all }: { value: string; onChange: (v: string) => void; options: string[]; all: string }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full bg-card sm:w-40"><SelectValue /></SelectTrigger>
      <SelectContent><SelectItem value="all">{all}</SelectItem>{options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
    </Select>
  );
}

function Confidence({ f }: { f: F }) {
  if (!f.analyzed || f.confidence == null) return <span className="text-muted-foreground">—</span>;
  const pct = Math.round(f.confidence * 100);
  const low = needsReview(f);
  return (
    <div className="w-20">
      <div className={`text-xs font-semibold ${low ? 'text-highlight' : 'text-muted-foreground'}`}>{pct}%{low && ' · check'}</div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${low ? 'bg-highlight' : 'bg-positive'}`} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

export default function FeedbackPage() {
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState<F[] | null>(null);
  const [q, setQ] = useState('');
  const [sent, setSent] = useState('all');
  const [src, setSrc] = useState('all');
  const [cat, setCat] = useState('all');
  const [reviewOnly, setReviewOnly] = useState(params.get('review') === '1');
  const [hideDupes, setHideDupes] = useState(false);
  const [sort, setSort] = useState<'date' | 'urgency'>('date');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [detail, setDetail] = useState<F | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [auto, setAuto] = useState(() => localStorage.getItem('if-auto-analyze') !== '0');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => listFeedback({}).then((r) => setItems(r.feedback)).catch(() => toast.error('Could not load feedback'));
  useEffect(() => { load(); }, []);
  useEffect(() => setPage(0), [q, sent, src, cat, sort, reviewOnly, hideDupes]);

  const toggleAuto = (v: boolean) => { setAuto(v); try { localStorage.setItem('if-auto-analyze', v ? '1' : '0'); } catch { /* ignore */ } };
  const toggleReview = (v: boolean) => {
    setReviewOnly(v);
    const next = new URLSearchParams(params);
    if (v) next.set('review', '1'); else next.delete('review');
    setParams(next, { replace: true });
  };

  const categories = useMemo(() => [...new Set((items ?? []).map((i) => i.category).filter(Boolean))].sort(), [items]);
  const dupCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of items ?? []) if (i.duplicateOf) m.set(i.duplicateOf, (m.get(i.duplicateOf) ?? 0) + 1);
    return m;
  }, [items]);
  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    const r = (items ?? []).filter((i) =>
      (!s || [i.content, i.customerName, i.topics, i.category, i.complaint].join(' ').toLowerCase().includes(s)) &&
      (sent === 'all' || (sent === 'Pending' ? !i.analyzed : i.sentiment === sent)) &&
      (src === 'all' || i.source === src) && (cat === 'all' || i.category === cat) &&
      (!reviewOnly || needsReview(i)) && (!hideDupes || !i.duplicateOf));
    return sort === 'urgency' ? [...r].sort((a, b) => (b.urgency ?? 0) - (a.urgency ?? 0)) : r;
  }, [items, q, sent, src, cat, sort, reviewOnly, hideDupes]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const rows = filtered.slice(page * PAGE, page * PAGE + PAGE);
  const pending = (items ?? []).filter((i) => !i.analyzed).length;
  const reviewCount = (items ?? []).filter(needsReview).length;
  const dupeTotal = (items ?? []).filter((i) => i.duplicateOf).length;

  /** Analyzes everything pending (in batches), then regroups duplicates. Returns how many items were analyzed. */
  const analyzeAll = async (quiet = false) => {
    let total = 0, remaining = 1;
    while (remaining > 0) {
      const r = await analyzeFeedback({ limit: 40 });
      total += r.analyzed; remaining = r.remaining;
      if (r.analyzed === 0) break;
      if (!quiet) toast.message(`Analyzed ${total} so far…`);
    }
    try { await detectDuplicates({}); } catch { /* grouping is best-effort */ }
    return total;
  };

  const runAnalysis = async () => {
    setBusy('analyze');
    try {
      const total = await analyzeAll();
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
      if (auto) {
        setBusy('analyze');
        toast.message(`${label}: ${r.created} items added. Analyzing with AI…`);
        const total = await analyzeAll(true);
        toast.success(`${label}: ${r.created} added${total ? `, ${total} analyzed` : ''}`);
      } else {
        try { await detectDuplicates({}); } catch { /* best-effort */ }
        toast.success(`${label}: ${r.created} items added. Run AI analysis next.`);
      }
      await load();
    } catch { toast.error('Import or analysis failed — your data was saved, use Analyze to retry'); await load(); }
    setBusy(null);
  };

  const afterAdd = async () => {
    await load();
    if (!auto) return;
    setBusy('analyze');
    try { const n = await analyzeAll(true); if (n) toast.success('New feedback analyzed'); await load(); } catch { toast.error('AI analysis failed — use Analyze to retry'); }
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

  const exportCsv = () => {
    if (!filtered.length) return toast.message('Nothing to export with the current filters.');
    downloadCsv(`insightflow-feedback-${new Date().toISOString().slice(0, 10)}.csv`, filtered.map((r) => ({
      Content: r.content, Source: r.source, Customer: r.customerName, Rating: r.rating ?? '', Date: r.submittedAt,
      Sentiment: r.sentiment, 'Sentiment score': r.sentimentScore ?? '', Category: r.category, Topics: r.topics, Complaint: r.complaint,
      Urgency: r.urgency ?? '', 'AI confidence': r.confidence ?? '', 'Needs review': needsReview(r) ? 'Yes' : 'No',
      'Duplicate of earlier feedback': r.duplicateOf ? 'Yes' : 'No', 'Manually corrected': r.manuallyCorrected ? 'Yes' : 'No',
    })));
    toast.success(`Exported ${filtered.length} rows`);
  };

  const toggle = (id: string) => setSel((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div>
      <PageHeader title="Feedback" subtitle="Every review, survey answer and support message in one place."
        actions={<>
          <Button variant="outline" onClick={() => importItems(buildSampleData(), 'Sample data')} disabled={!!busy}><Database className="mr-2 h-4 w-4" />Sample data</Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={!!busy}>{busy === 'import' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Import CSV</Button>
          <Button variant="outline" onClick={() => setAdding(true)}><Plus className="mr-2 h-4 w-4" />Add</Button>
          <Button variant="outline" onClick={exportCsv} disabled={!items?.length}><Download className="mr-2 h-4 w-4" />Export</Button>
          <Button onClick={runAnalysis} disabled={!!busy || pending === 0} className="bg-highlight text-highlight-foreground hover:bg-highlight/90">
            {busy === 'analyze' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}Analyze{pending ? ` (${pending})` : ''}
          </Button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={onFile} />
        </>} />
      <div className="-mt-3 mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">CSV tip: include a column named <b>content</b>, <b>feedback</b> or <b>review</b>; optional <b>source</b>, <b>customer</b>, <b>rating</b>, <b>date</b>.</p>
        <div className="flex items-center gap-2"><Switch id="auto" checked={auto} onCheckedChange={toggleAuto} /><Label htmlFor="auto" className="cursor-pointer text-xs">Auto-analyze new feedback</Label></div>
      </div>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="bg-card pl-9" placeholder="Search text, topics, customers…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <FilterSelect value={sent} onChange={setSent} options={['Positive', 'Neutral', 'Negative', 'Mixed', 'Pending']} all="All sentiment" />
        <FilterSelect value={src} onChange={setSrc} options={['Review', 'Survey', 'Support', 'Social', 'Other']} all="All sources" />
        <FilterSelect value={cat} onChange={setCat} options={categories} all="All categories" />
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <label className="flex cursor-pointer items-center gap-2"><Checkbox checked={reviewOnly} onCheckedChange={(c) => toggleReview(!!c)} /><ShieldQuestion className="h-4 w-4 text-highlight" />Needs review{reviewCount ? ` (${reviewCount})` : ''}</label>
        <label className="flex cursor-pointer items-center gap-2"><Checkbox checked={hideDupes} onCheckedChange={(c) => setHideDupes(!!c)} /><Copy className="h-4 w-4 text-muted-foreground" />Hide duplicates{dupeTotal ? ` (${dupeTotal})` : ''}</label>
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
                    <th className="p-3">Feedback</th><th className="p-3">Sentiment</th><th className="p-3">Category</th><th className="p-3">Confidence</th>
                    <th className="cursor-pointer p-3" onClick={() => setSort('urgency')}><span className="inline-flex items-center gap-1">Urgency<ArrowUpDown className="h-3 w-3" /></span></th>
                    <th className="cursor-pointer p-3" onClick={() => setSort('date')}><span className="inline-flex items-center gap-1">Date<ArrowUpDown className="h-3 w-3" /></span></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className={`cursor-pointer border-t hover:bg-muted/40 ${r.duplicateOf ? 'bg-muted/20' : ''}`} onClick={() => setDetail(r)}>
                      <td className="p-3" onClick={(e) => e.stopPropagation()}><Checkbox checked={sel.has(r.id)} onCheckedChange={() => toggle(r.id)} /></td>
                      <td className="max-w-md p-3"><div className="line-clamp-2">{r.content}</div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                          <span>{r.source} · {r.customerName || 'Anonymous'}</span>
                          {r.manuallyCorrected && <span className="inline-flex items-center gap-0.5 text-highlight"><Brain className="h-3 w-3" />corrected</span>}
                          {r.duplicateOf && <span className="inline-flex items-center gap-0.5"><Copy className="h-3 w-3" />repeat of earlier feedback</span>}
                          {(dupCount.get(r.id) ?? 0) > 0 && <span className="inline-flex items-center gap-0.5 font-medium text-primary"><Copy className="h-3 w-3" />+{dupCount.get(r.id)} similar</span>}
                        </div></td>
                      <td className="p-3"><SentimentBadge value={r.sentiment} /></td>
                      <td className="p-3 text-muted-foreground">{r.category || '—'}</td>
                      <td className="p-3"><Confidence f={r} /></td>
                      <td className="p-3">{r.urgency ? <div className="flex gap-0.5">{[1, 2, 3, 4, 5].map((n) => <span key={n} className={`h-2 w-3 rounded-sm ${n <= r.urgency! ? (r.urgency! >= 4 ? 'bg-destructive' : 'bg-highlight') : 'bg-muted'}`} />)}</div> : '—'}</td>
                      <td className="whitespace-nowrap p-3 text-muted-foreground">{r.submittedAt ? format(new Date(r.submittedAt), 'MMM d') : ''}</td>
                    </tr>
                  ))}
                  {rows.length === 0 && <tr><td colSpan={7} className="p-10 text-center text-muted-foreground">No feedback matches your filters.</td></tr>}
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

      <AddFeedbackDialog open={adding} onOpenChange={setAdding} onDone={afterAdd} />
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
