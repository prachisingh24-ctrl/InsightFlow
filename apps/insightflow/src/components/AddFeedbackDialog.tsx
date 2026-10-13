import { useState } from 'react';
import { z } from 'zod';
import { toast } from 'sonner';
import { createFeedback } from 'zitejs/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@project/components/ui/dialog';
import { Button } from '@project/components/ui/button';
import { Textarea } from '@project/components/ui/textarea';
import { Input } from '@project/components/ui/input';
import { Label } from '@project/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { Loader2 } from 'lucide-react';

const schema = z.object({
  content: z.string().trim().min(5, 'Feedback must be at least 5 characters'),
  rating: z.string().refine((v) => v === '' || (Number(v) >= 1 && Number(v) <= 5), 'Rating must be 1–5'),
});

export default function AddFeedbackDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const [content, setContent] = useState('');
  const [source, setSource] = useState('Review');
  const [customerName, setCustomerName] = useState('');
  const [rating, setRating] = useState('');
  const [saving, setSaving] = useState(false);
  const parsed = schema.safeParse({ content, rating });
  const errors = parsed.success ? {} : Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], i.message]));
  const touched = content.length > 0;

  const submit = async () => {
    if (!parsed.success) return;
    setSaving(true);
    try {
      await createFeedback({ items: [{ content, source, customerName, rating: rating ? Number(rating) : undefined }] });
      toast.success('Feedback added');
      setContent(''); setCustomerName(''); setRating('');
      onOpenChange(false); onDone();
    } catch { toast.error('Could not add feedback'); }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add feedback</DialogTitle><DialogDescription>Paste a review, survey answer, or support message.</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Feedback</Label>
            <Textarea rows={4} value={content} onChange={(e) => setContent(e.target.value)} placeholder="The app keeps crashing when…" />
            {touched && errors.content && <p className="text-xs text-destructive">{errors.content}</p>}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label>Source</Label>
              <Select value={source} onValueChange={setSource}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['Review', 'Survey', 'Support', 'Social', 'Other'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Customer</Label><Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Optional" /></div>
            <div className="space-y-1.5"><Label>Rating</Label><Input type="number" min={1} max={5} value={rating} onChange={(e) => setRating(e.target.value)} placeholder="1–5" /></div>
          </div>
          {errors.rating && <p className="text-xs text-destructive">{errors.rating}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!parsed.success || saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Add feedback</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
