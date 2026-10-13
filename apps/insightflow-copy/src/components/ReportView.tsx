import { Markdown } from '@project/components/markdown';
import { format } from 'date-fns';
import { Waves } from 'lucide-react';

export default function ReportView({ title, content, createdAt, feedbackCount }: { title: string; content: string; createdAt: string; feedbackCount: number }) {
  return (
    <article className="report-print rounded-2xl border bg-card shadow-sm">
      <header className="rounded-t-2xl bg-sidebar px-6 py-8 text-white sm:px-10">
        <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-sidebar-primary"><Waves className="h-4 w-4" />InsightFlow Report</div>
        <h1 className="text-2xl font-extrabold sm:text-3xl">{title}</h1>
        <p className="mt-2 text-sm text-sidebar-foreground">{createdAt && format(new Date(createdAt), 'PPP')} · Based on {feedbackCount} feedback items</p>
      </header>
      <div className="prose prose-slate max-w-none px-6 py-8 sm:px-10 prose-headings:font-bold prose-h2:text-primary">
        <Markdown>{content}</Markdown>
      </div>
    </article>
  );
}
