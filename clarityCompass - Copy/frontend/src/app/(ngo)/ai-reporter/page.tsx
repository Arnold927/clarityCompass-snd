
'use client';

import AppLayout from "@/components/layout/app-layout";
import { Skeleton } from "@/components/ui/skeleton";
import dynamic from 'next/dynamic';

const ReportGenerator = dynamic(() => import('@/components/ai/report-generator'), {
  loading: () => <Skeleton className="h-[500px] w-full" />,
});

export default function AiReporterPage() {
  return (
    <AppLayout platform="ngo">
      <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">AI Reporter</h2>
        </div>
        <ReportGenerator />
      </main>
    </AppLayout>
  );
}
