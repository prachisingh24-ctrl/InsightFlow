import { useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, KeyboardSensor, useSensor, useSensors, useDraggable, useDroppable, closestCorners, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { ListIssuesOutputType } from 'zitejs/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { cn } from '@project/components/lib/utils';
import { GripVertical, TrendingUp, TrendingDown, Minus, Copy, User } from 'lucide-react';
import { PriorityBadge } from './ui-bits';

type Issue = ListIssuesOutputType['issues'][0];
const COLUMNS = ['Open', 'In Progress', 'Resolved'] as const;
const TONE: Record<string, string> = { Open: 'bg-negative-soft text-negative', 'In Progress': 'bg-highlight-soft text-highlight', Resolved: 'bg-positive-soft text-positive' };

export function TrendTag({ trend }: { trend: string }) {
  if (!trend) return null;
  const Icon = trend === 'Rising' ? TrendingUp : trend === 'Easing' ? TrendingDown : Minus;
  const color = trend === 'Rising' ? 'text-negative' : trend === 'Easing' ? 'text-positive' : 'text-muted-foreground';
  return <span className={cn('inline-flex items-center gap-1 text-xs font-medium', color)}><Icon className="h-3.5 w-3.5" />{trend}</span>;
}

function CardBody({ issue, onStatus }: { issue: Issue; onStatus?: (s: string) => void }) {
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <PriorityBadge value={issue.priority} />
        <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-bold text-primary">{issue.impactScore}</span>
      </div>
      <div className="mt-2 text-sm font-semibold leading-snug">{issue.title}</div>
      <div className="mt-1 text-xs text-muted-foreground">{issue.category} · {issue.feedbackCount} items</div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <TrendTag trend={issue.trend} />
        {issue.duplicateCount > 0 && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Copy className="h-3 w-3" />{issue.duplicateCount} repeats</span>}
        {issue.owner && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><User className="h-3 w-3" />{issue.owner}</span>}
      </div>
      {onStatus && (
        <div className="mt-3 lg:hidden" onPointerDown={(e) => e.stopPropagation()}>
          <Select value={issue.status} onValueChange={onStatus}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{COLUMNS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}
    </>
  );
}

function DraggableCard({ issue, onStatus }: { issue: Issue; onStatus: (s: string) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: issue.id });
  return (
    <div ref={setNodeRef} className={cn('group relative rounded-xl border bg-card p-3 shadow-sm transition-opacity', isDragging && 'opacity-30')}>
      <button {...listeners} {...attributes} aria-label={`Drag ${issue.title}`}
        className="absolute right-1 top-1 hidden cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing lg:block">
        <GripVertical className="h-4 w-4" />
      </button>
      <CardBody issue={issue} onStatus={onStatus} />
    </div>
  );
}

function Column({ status, issues, onStatus }: { status: string; issues: Issue[]; onStatus: (id: string, s: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div ref={setNodeRef} className={cn('flex min-h-[220px] flex-col rounded-2xl border bg-muted/40 p-3 transition-colors', isOver && 'border-primary bg-secondary/60')}>
      <div className="mb-3 flex items-center justify-between px-1">
        <span className={cn('rounded-full px-2.5 py-1 text-xs font-bold', TONE[status])}>{status}</span>
        <span className="text-xs font-medium text-muted-foreground">{issues.length}</span>
      </div>
      <div className="flex flex-1 flex-col gap-3">
        {issues.map((i) => <DraggableCard key={i.id} issue={i} onStatus={(s) => onStatus(i.id, s)} />)}
        {issues.length === 0 && <div className="grid flex-1 place-items-center rounded-xl border border-dashed py-8 text-xs text-muted-foreground">Drop issues here</div>}
      </div>
    </div>
  );
}

export default function IssueBoard({ issues, onStatus }: { issues: Issue[]; onStatus: (id: string, status: string) => void }) {
  const [active, setActive] = useState<Issue | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));
  const start = (e: DragStartEvent) => setActive(issues.find((i) => i.id === e.active.id) ?? null);
  const end = (e: DragEndEvent) => {
    setActive(null);
    const to = e.over?.id as string | undefined;
    const issue = issues.find((i) => i.id === e.active.id);
    if (issue && to && COLUMNS.includes(to as (typeof COLUMNS)[number]) && issue.status !== to) onStatus(issue.id, to);
  };
  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={start} onDragEnd={end} onDragCancel={() => setActive(null)}>
      <div className="grid gap-4 lg:grid-cols-3">
        {COLUMNS.map((c) => <Column key={c} status={c} issues={issues.filter((i) => i.status === c)} onStatus={onStatus} />)}
      </div>
      <DragOverlay>{active && <div className="rounded-xl border bg-card p-3 shadow-lg"><CardBody issue={active} /></div>}</DragOverlay>
    </DndContext>
  );
}
