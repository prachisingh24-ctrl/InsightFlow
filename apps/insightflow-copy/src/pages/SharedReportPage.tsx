import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { reports, ReportsOutputType } from 'zitejs/api';
import { Skeleton } from '@project/components/ui/skeleton';
import ReportView from '../components/ReportView';

export default function SharedReportPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const [r, setR] = useState<ReportsOutputType['reports'][0] | null | undefined>(undefined);

  useEffect(() => {
    reports({ action: 'get', id }).then((res) => setR(res.reports[0] ?? null)).catch(() => setR(null));
  }, [id]);
  useEffect(() => { if (r && params.get('print')) setTimeout(() => window.print(), 600); }, [r]);

  return (
    <div className="min-h-screen bg-background px-4 py-10 print:p-0">
      <div className="mx-auto max-w-3xl">
        {r === undefined ? <Skeleton className="h-[600px] rounded-2xl" />
          : r === null ? <p className="py-20 text-center text-muted-foreground">This report doesn't exist or was deleted.</p>
          : <ReportView {...r} />}
        <p className="mt-6 text-center text-xs text-muted-foreground print:hidden">Generated with InsightFlow</p>
      </div>
    </div>
  );
}
