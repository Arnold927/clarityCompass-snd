'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/layout/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Home, ChevronRight, ArrowLeft } from 'lucide-react';
import { mealApi, C, fmtNumber, fmtDate, type ProjectActivity } from '@/lib/meal-api';
import { usePageTitle } from '@/components/meal/use-page-title';
import { ReachSummaryCards, StatusPill } from '@/components/meal/shared-cards';

export default function ActivityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [activity, setActivity] = useState<ProjectActivity | null>(null);
  usePageTitle(activity ? `${activity.name} | Activity Details | SND Africa MEAL` : 'Activity Details | SND Africa MEAL');
  const [projectName, setProjectName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    mealApi.activity(id)
      .then(async (a) => {
        setActivity(a);
        try {
          const project = await mealApi.project(a.project);
          setProjectName(project.name);
        } catch {
          setProjectName('');
        }
      })
      .catch(() => setError('This activity could not be found.'))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap">
          <Link href="/dashboard" aria-label="Home" className="hover:text-foreground"><Home className="h-3.5 w-3.5" /></Link> <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/projects" className="hover:underline">Projects</Link> <ChevronRight className="h-3.5 w-3.5" />
          {activity && (
            <>
              <Link href={`/projects?project=${activity.project}&tab=activities`} className="hover:underline">{projectName || 'Project'}</Link>
              <ChevronRight className="h-3.5 w-3.5" />
            </>
          )}
          <span className="text-foreground font-medium">Activity Details</span>
        </div>

        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : error || !activity ? (
          <Card><CardContent className="p-12 text-center text-sm text-muted-foreground">{error || 'Activity not found.'}</CardContent></Card>
        ) : (
          <>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold" style={{ color: C.brown }}>{activity.name}</h1>
                  <StatusPill status={activity.status} />
                </div>
                {projectName && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Part of <Link href={`/projects?project=${activity.project}&tab=activities`} className="hover:underline" style={{ color: C.orange }}>{projectName}</Link>
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card><CardContent className="p-4">
                <p className="text-xs font-medium mb-1" style={{ color: C.muted }}>Target (overall)</p>
                <p className="text-2xl font-bold" style={{ color: C.brown }}>{fmtNumber(activity.target)}</p>
              </CardContent></Card>
              <Card><CardContent className="p-4">
                <p className="text-xs font-medium mb-1" style={{ color: C.orange }}>Actual Reach</p>
                <p className="text-2xl font-bold" style={{ color: C.brown }}>{fmtNumber(activity.reach)}</p>
                {activity.percentage_of_target !== null && (
                  <p className="text-xs text-muted-foreground">{activity.percentage_of_target}% of target</p>
                )}
              </CardContent></Card>
              <Card><CardContent className="p-4">
                <p className="text-xs font-medium mb-1" style={{ color: C.muted }}>Reporting Period</p>
                <p className="text-2xl font-bold" style={{ color: C.brown }}>{activity.reporting_period || '—'}</p>
              </CardContent></Card>
              <Card><CardContent className="p-4">
                <p className="text-xs font-medium mb-1" style={{ color: C.muted }}>Last Updated</p>
                <p className="text-lg font-bold" style={{ color: C.brown }}>{fmtDate(activity.updated_at)}</p>
              </CardContent></Card>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-base">Reach Disaggregation</CardTitle></CardHeader>
              <CardContent>
                <ReachSummaryCards
                  totalLabel="Actual Reach"
                  total={activity.reach}
                  male={activity.reach_male} malePct={activity.reach ? Math.round((activity.reach_male / activity.reach) * 1000) / 10 : 0}
                  female={activity.reach_female} femalePct={activity.reach ? Math.round((activity.reach_female / activity.reach) * 1000) / 10 : 0}
                  pwd={activity.reach_pwd} pwdPct={activity.reach ? Math.round((activity.reach_pwd / activity.reach) * 1000) / 10 : 0}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Activity Information</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-y-2 text-sm">
                <span className="text-muted-foreground">Activity</span><span>{activity.name}</span>
                <span className="text-muted-foreground">Project</span>
                <span>{projectName ? <Link href={`/projects?project=${activity.project}&tab=activities`} className="hover:underline" style={{ color: C.orange }}>{projectName}</Link> : '—'}</span>
                <span className="text-muted-foreground">Status</span><span><StatusPill status={activity.status} /></span>
                <span className="text-muted-foreground">Reporting Period</span><span>{activity.reporting_period || '—'}</span>
                <span className="text-muted-foreground">Created</span><span>{fmtDate(activity.created_at)}</span>
                <span className="text-muted-foreground">Last Updated</span><span>{fmtDate(activity.updated_at)}</span>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
