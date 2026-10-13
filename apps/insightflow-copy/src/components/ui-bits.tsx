import { ReactNode } from 'react';
import { Badge } from '@project/components/ui/badge';
import { cn } from '@project/components/lib/utils';

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const SENT: Record<string, string> = {
  Positive: 'bg-positive-soft text-positive border-positive/20',
  Negative: 'bg-negative-soft text-negative border-negative/20',
  Neutral: 'bg-muted text-muted-foreground border-border',
  Mixed: 'bg-warning-soft text-warning border-warning/20',
};
export function SentimentBadge({ value }: { value: string }) {
  if (!value) return <Badge variant="outline" className="text-muted-foreground">Pending</Badge>;
  return <Badge variant="outline" className={cn('whitespace-nowrap font-medium', SENT[value])}>{value}</Badge>;
}

const PRI: Record<string, string> = {
  Critical: 'bg-negative text-white border-negative',
  High: 'bg-highlight-soft text-highlight border-highlight/20',
  Medium: 'bg-warning-soft text-warning border-warning/20',
  Low: 'bg-muted text-muted-foreground border-border',
};
export function PriorityBadge({ value }: { value: string }) {
  return <Badge variant="outline" className={cn('whitespace-nowrap font-semibold', PRI[value])}>{value}</Badge>;
}

export const SENTIMENT_COLORS: Record<string, string> = {
  Positive: 'hsl(var(--chart-1))', Neutral: 'hsl(var(--muted-foreground))', Negative: 'hsl(var(--chart-3))', Mixed: 'hsl(var(--chart-2))',
};

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed bg-card px-6 py-16 text-center">
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-secondary text-primary">{icon}</div>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{text}</p>
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
