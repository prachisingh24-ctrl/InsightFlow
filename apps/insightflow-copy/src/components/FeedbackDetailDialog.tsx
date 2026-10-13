import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { correctFeedback, ListFeedbackOutputType } from 'zitejs/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@project/components/ui/dialog';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Label } from '@project/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { Brain, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

type F = ListFeedbackOutputType['feedback'][0];
type Sent = 'Positive' | 'Neutral' | 'Negative' | 'Mixed';

export default function FeedbackDetailDialog({ item, categories, onClose, onDone }: { item: F | null; categories: string[]; onClose: () => void; onDone: () => void }) {
  const [sentiment, setSentiment] = useState<Sent>('Neutral');
  const [category, setCategory] = useState('');
  const [urgency, setUrgency] = useState('1');
  const [complaint, setComplaint] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!item) return;
    setSentiment((item.sentiment || 'Neutral') as Sent);
    setCategory(item.category); setUrgency(String(item.urgency ?? 1)); setComplaint(item.complaint);
  }, [item]);

  const save = async () => {
    if (!item) return;
    setSaving(true);
    try {
      const r = await correctFeedback({ id: item.id, sentiment, category: category.trim(), urgency: Number(urgency), complaint });
      toast.success(r.learned ? 'Saved — the AI learned from this correction' : 'Saved');
      onClose(); onDone();
    } catch { toast.error('Could not save'); }
    setSaving(false);
  };

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Feedback detail</DialogTitle>
          <DialogDescription>{item?.source} · {item?.customerName || 'Anonymous'} · {item?.submittedAt && format(new Date(item.submittedAt), 'PP')}{item?.rating ? ` · ${item.rating}★` : ''}</DialogDescription>
        </DialogHeader>
        <blockquote className="rounded-lg border-l-4 border-primary bg-muted p-3 text-sm">{item?.content}</blockquote>
        {item?.topics && <div className="flex flex-wrap gap-1.5">{item.topics.split(',').map((t) => <span key={t} className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">#{t.trim()}</span>)}</div>}
        <div className="flex items-start gap-2 rounded-lg bg-highlight-soft p-3 text-xs"><Brain className="mt-0.5 h-4 w-4 shrink-0 text-highlight" />Disagree with the AI? Correct it below — InsightFlow stores your correction as an Adaption rule and applies it to future analyses.</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Sentiment</Label>
            <Select value={sentiment} onValueChange={(v) => setSentiment(v as Sent)}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{['Positive', 'Neutral', 'Negative', 'Mixed'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="space-y-1.5"><Label>Urgency (1–5)</Label>
            <Select value={urgency} onValueChange={setUrgency}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{['1', '2', '3', '4', '5'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="col-span-2 space-y-1.5"><Label>Category</Label>
            <Input list="cats" value={category} onChange={(e) => setCategory(e.target.value)} />
            <datalist id="cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
          </div>
          <div className="col-span-2 space-y-1.5"><Label>Core complaint</Label><Input value={complaint} onChange={(e) => setComplaint(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving || !category.trim()}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save & teach AI</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
