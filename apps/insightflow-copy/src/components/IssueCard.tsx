import { useState } from 'react';
import { ListIssuesOutputType } from 'zitejs/api';
import { Card, CardContent } from '@project/components/ui/card';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@project/components/ui/alert-dialog';
import { ChevronDown, Trash2, Quote, CheckCircle2 } from 'lucide-react';
import { PriorityBadge } from './ui-bits';

type Issue = ListIssuesOutputType['issues'][0];
type Patch = Partial<Pick<Issue, 'status' | 'priority' | 'owner'>>;

export default function IssueCard({ issue, rank, onPatch, onDelete }: { issue: Issue; rank: number; onPatch: (id: string, c: Patch) => void; onDelete: (id: string) => void }) {
  const [open, setOpen] = useState(rank <= 2);
  const [owner, setOwner] = useState(issue.owner);
  const [del, setDel] = useState(false);
  const actions = issue.actionItems.split('\n').map((a) => a.replace(/^-\s*/, '')).filter(Boolean);

  return (
    <Card className={`overflow-hidden shadow-sm ${issue.status === 'Resolved' ? 'opacity-70' : ''}`}>
      <CardContent className="p-0">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
          <div className="flex shrink-0 flex-col items-center rounded-xl bg-secondary px-4 py-2 text-center">
            <span className="text-2xl font-extrabold text-primary">{issue.impactScore}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Impact</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <PriorityBadge value={issue.priority} />
              <span className="text-xs text-muted-foreground">{issue.category} · {issue.feedbackCount} feedback items</span>
            </div>
            <h3 className="mt-1.5 text-lg font-bold">{issue.title}</h3>
            <p className="text-sm text-muted-foreground">{issue.description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
            <Select value={issue.status} onValueChange={(v) => onPatch(issue.id, { status: v })}>
              <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{['Open', 'In Progress', 'Resolved'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={issue.priority} onValueChange={(v) => onPatch(issue.id, { priority: v })}>
              <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{['Critical', 'High', 'Medium', 'Low'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <button className="flex w-full items-center justify-between border-t bg-muted/40 px-5 py-2 text-xs font-semibold text-muted-foreground" onClick={() => setOpen(!open)}>
          Reasoning, actions & evidence<ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="grid gap-5 p-5 md:grid-cols-2">
            <div>
              <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-primary">Why this matters</h4>
              <p className="text-sm">{issue.reasoning}</p>
              <h4 className="mb-2 mt-4 text-xs font-bold uppercase tracking-wide text-primary">Recommended actions</h4>
              <ul className="space-y-2">{actions.map((a) => <li key={a} className="flex gap-2 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-highlight" />{a}</li>)}</ul>
            </div>
            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-primary">Customer evidence</h4>
              <div className="space-y-2">{issue.examples.map((e) => <div key={e} className="flex gap-2 rounded-lg bg-muted p-2.5 text-xs"><Quote className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />{e}</div>)}</div>
              <div className="mt-4 flex items-center gap-2">
                <Input className="h-8 text-xs" placeholder="Assign owner…" value={owner} onChange={(e) => setOwner(e.target.value)}
                  onBlur={() => owner !== issue.owner && onPatch(issue.id, { owner })} />
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDel(true)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <AlertDialog open={del} onOpenChange={setDel}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete this issue?</AlertDialogTitle><AlertDialogDescription>The linked feedback stays; only the issue is removed.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => onDelete(issue.id)}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
