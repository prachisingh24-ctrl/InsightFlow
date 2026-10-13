import { useState } from 'react';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@project/components/ui/dialog';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Textarea } from '@project/components/ui/textarea';
import { Label } from '@project/components/ui/label';
import { Mail } from 'lucide-react';

export const SUPPORT_EMAIL = 'support@insightflow.app';
const schema = z.object({ subject: z.string().trim().min(3, 'Add a short subject'), message: z.string().trim().min(10, 'Describe the concern (10+ characters)') });

export default function RaiseConcernDialog({ open, onOpenChange, userEmail }: { open: boolean; onOpenChange: (o: boolean) => void; userEmail?: string }) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const parsed = schema.safeParse({ subject, message });
  const err = parsed.success ? {} : Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], i.message]));

  const send = () => {
    const body = `${message}\n\n---\nFrom: ${userEmail || 'Demo user'}\nPage: ${window.location.href}`;
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`[InsightFlow] ${subject}`)}&body=${encodeURIComponent(body)}`;
    onOpenChange(false); setSubject(''); setMessage('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Raise a concern</DialogTitle>
          <DialogDescription>Write to the InsightFlow team at <b>{SUPPORT_EMAIL}</b>. This opens your email app with the message ready to send.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>Subject</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. CSV import failed" />
            {subject && err.subject && <p className="text-xs text-destructive">{err.subject}</p>}</div>
          <div className="space-y-1.5"><Label>Message</Label><Textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="What happened, and what did you expect?" />
            {message && err.message && <p className="text-xs text-destructive">{err.message}</p>}</div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={send} disabled={!parsed.success}><Mail className="mr-2 h-4 w-4" />Write email</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
