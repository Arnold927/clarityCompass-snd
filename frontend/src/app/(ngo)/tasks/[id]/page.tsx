'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/app-layout';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft, Calendar, User, DollarSign, MapPin, Activity,
  CheckCircle2, AlertCircle, Clock, FileText, TrendingUp, FolderKanban,
} from 'lucide-react';
import { format, parseISO, isValid, isPast } from 'date-fns';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import Link from 'next/link';

// ─── colour palette (matches the rest of the app) ────────────────────────────
const C = { brown: '#3D1A08', orange: '#C8793A', green: '#4A6830', red: '#C0392B' };

// ─── tiny helpers ─────────────────────────────────────────────────────────────
function safeDate(val?: string | null, fallback = '—') {
  if (!val) return fallback;
  try {
    const d = parseISO(val);
    if (isValid(d)) return format(d, 'dd MMM yyyy');
  } catch {}
  return fallback;
}

function fmt(n?: number | null, dec = 0) {
  if (n == null) return '—';
  return n.toLocaleString(undefined, { maximumFractionDigits: dec });
}

function TaskStatusBadge({ status }: { status?: string }) {
  const map: Record<string, string> = {
    PLANNED:   'bg-yellow-100 text-yellow-800 border-yellow-300',
    ONGOING:   'bg-blue-100 text-blue-800 border-blue-300',
    COMPLETED: 'bg-green-100 text-green-800 border-green-300',
    CANCELLED: 'bg-gray-100 text-gray-600 border-gray-300',
  };
  const k = (status || 'PLANNED').toUpperCase();
  return (
    <Badge className={cn('text-xs capitalize', map[k] ?? 'bg-gray-100 text-gray-600 border-gray-300')}>
      {k.toLowerCase()}
    </Badge>
  );
}

function UpdateStatusBadge({ status }: { status?: string }) {
  const cfg: Record<string, { cls: string; label: string }> = {
    green: { cls: 'bg-green-100 text-green-800 border-green-300', label: 'On track' },
    amber: { cls: 'bg-yellow-100 text-yellow-800 border-yellow-300', label: 'Needs attention' },
    red:   { cls: 'bg-red-100 text-red-800 border-red-300', label: 'At risk' },
  };
  const c = cfg[(status ?? '').toLowerCase()] ?? { cls: 'bg-gray-100 text-gray-600 border-gray-300', label: status ?? '—' };
  return <Badge className={cn('text-xs', c.cls)}>{c.label}</Badge>;
}

function InfoRow({ icon: Icon, label, children }: {
  icon: React.ElementType; label: string; children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-sm font-medium mt-0.5">{children}</div>
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-96" />
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[0,1,2,3].map(i => <Skeleton key={i} className="h-28" />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-52" /><Skeleton className="h-52" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────
export default function TaskDetailPage() {
  // useParams() is the correct approach for 'use client' pages in Next.js 15+
  const params = useParams();
  const router = useRouter();
  const taskId = params?.id as string;

  const [task, setTask]       = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!taskId) return;
    setLoading(true);
    api.get(`/tasks/tasks/${taskId}/`)
      .then(r => {
        setTask(r.data);
        if (r.data.project) {
          api.get(`/projects/${r.data.project}/`)
            .then(pr => setProject(pr.data))
            .catch(() => {});
        }
      })
      .catch(e => {
        console.error('tasks/:id', e);
        setError('Could not load this task — it may have been deleted or you may not have access.');
      })
      .finally(() => setLoading(false));
  }, [taskId]);

  // ── derived values (using exact field names from TaskSerializer) ─────────────
  const budget      = task ? Number(task.budget ?? 0) : 0;
  // serializer exposes `cumulative_spent` (snake_case)
  const spent       = task ? Number(task.cumulative_spent ?? 0) : 0;
  const utilPct     = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const isOverBudget = budget > 0 && spent > budget;

  // serializer exposes both `start_date` / `end_date` AND `startDate` / `endDate`
  const endDateStr  = task?.end_date ?? task?.endDate;
  const isOverdue   = endDateStr
    && isValid(parseISO(endDateStr))
    && isPast(parseISO(endDateStr))
    && task?.status !== 'COMPLETED';

  // updates array from TaskUpdateSerializer (nested read_only)
  const updates: any[] = task?.updates ?? [];
  const latestUpdate   = updates[updates.length - 1];

  // focal_person is a nested ProjectTeamMember object: { id, user: {…}, role, project }
  const focalName = task?.focal_person?.user?.full_name
    ?? task?.focal_person?.user?.username
    ?? task?.focal_person?.name
    ?? '—';

  // location_details is an array of { id, name, … } objects
  const locationNames: string[] = (task?.location_details ?? []).map((l: any) => l.name);

  // ── error state ───────────────────────────────────────────────────────────────
  if (!loading && error) {
    return (
      <AppLayout platform="ngo">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
          <p className="text-sm text-muted-foreground text-center max-w-sm">{error}</p>
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Go back
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout platform="ngo">
      <div className="space-y-6 p-4 md:p-8 pt-6">

        {/* Back + report button */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1.5 text-xs pl-0">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          {task && (
            <Link href={`/tasks/${taskId}/report`}>
              <Button size="sm" className="gap-2 text-xs">
                <FileText className="h-3.5 w-3.5" /> View Report
              </Button>
            </Link>
          )}
        </div>

        {loading ? <PageSkeleton /> : (
          <>
            {/* Title */}
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold tracking-tight" style={{ color: C.brown }}>
                  {task.title}
                </h2>
                <TaskStatusBadge status={task.status} />
                {isOverdue && (
                  <Badge className="bg-red-100 text-red-800 border-red-300 text-xs">Overdue</Badge>
                )}
                {task.has_tor && (
                  <Badge className="bg-purple-100 text-purple-800 border-purple-300 text-xs">TOR uploaded</Badge>
                )}
                {task.has_completion_report && (
                  <Badge className="bg-teal-100 text-teal-800 border-teal-300 text-xs">Report submitted</Badge>
                )}
              </div>
              {task.description && (
                <p className="text-sm text-muted-foreground max-w-2xl">{task.description}</p>
              )}
            </div>

            {/* Metric cards */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">

              <Card>
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Budget utilisation</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" style={{ color: C.brown }}>
                    {budget > 0 ? `${utilPct.toFixed(1)}%` : '—'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">${fmt(spent)} of ${fmt(budget)}</p>
                  {budget > 0 && (
                    <Progress value={utilPct} className="h-1.5 mt-2"
                      indicatorClassName={isOverBudget ? 'bg-red-600' : utilPct >= 80 ? 'bg-orange-500' : 'bg-green-600'} />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Latest status</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {latestUpdate
                    ? <>
                        <div className="mt-1"><UpdateStatusBadge status={latestUpdate.status} /></div>
                        <p className="text-xs text-muted-foreground mt-1.5">
                          {safeDate(latestUpdate.status_date)}
                        </p>
                      </>
                    : <p className="text-sm text-muted-foreground mt-1">No updates yet</p>
                  }
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Timeline</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium leading-snug">
                    {safeDate(task.start_date)}
                    <span className="text-muted-foreground"> → </span>
                    {safeDate(task.end_date)}
                  </p>
                  {isOverdue && <p className="text-xs text-red-600 mt-1">Past end date</p>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Updates logged</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" style={{ color: C.brown }}>{updates.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">status entries</p>
                </CardContent>
              </Card>
            </div>

            {/* Detail cards */}
            <div className="grid gap-4 lg:grid-cols-2">

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Task details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <InfoRow icon={User} label="Focal person">{focalName}</InfoRow>

                  <InfoRow icon={FolderKanban} label="Project">
                    {task.project
                      ? <button className="underline underline-offset-2 hover:text-foreground transition-colors text-left"
                          onClick={() => router.push(`/projects/${task.project}`)}>
                          {project?.title ?? project?.name ?? `Project #${task.project}`}
                        </button>
                      : '—'}
                  </InfoRow>

                  <InfoRow icon={Activity} label="Activity">
                    {/* activityName is a SerializerMethodField coming back as `activityName` */}
                    {task.activityName ?? '—'}
                  </InfoRow>

                  <InfoRow icon={MapPin} label="Locations">
                    {locationNames.length ? locationNames.join(', ') : '—'}
                  </InfoRow>

                  {task.linkedIndicatorName && (
                    <InfoRow icon={CheckCircle2} label="Linked indicator">
                      {task.linkedIndicatorName}
                    </InfoRow>
                  )}
                </CardContent>
              </Card>

              {/* Latest update detail */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Latest update</CardTitle>
                  <CardDescription>Most recent status entry for this task</CardDescription>
                </CardHeader>
                <CardContent>
                  {!latestUpdate
                    ? <p className="text-sm text-muted-foreground text-center py-8">No status updates have been logged yet.</p>
                    : <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <UpdateStatusBadge status={latestUpdate.status} />
                          <span className="text-xs text-muted-foreground">{safeDate(latestUpdate.status_date)}</span>
                          {latestUpdate.is_complete && (
                            <Badge className="bg-green-100 text-green-800 border-green-300 text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-1" />Complete
                            </Badge>
                          )}
                        </div>
                        {latestUpdate.status_justification && (
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {latestUpdate.status_justification}
                          </p>
                        )}
                        {latestUpdate.amount_spent != null && (
                          <p className="text-xs text-muted-foreground">
                            Amount spent this update: <span className="font-medium text-foreground">${fmt(Number(latestUpdate.amount_spent))}</span>
                          </p>
                        )}
                      </div>
                  }
                </CardContent>
              </Card>
            </div>

            {/* Full update history */}
            {updates.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Status update history</CardTitle>
                  <CardDescription>All logged updates, most recent first</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs pl-4">Date</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">Amount spent</TableHead>
                        <TableHead className="text-xs pr-4">Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...updates].reverse().map((u: any) => (
                        <TableRow key={u.id} className="hover:bg-muted/50">
                          <TableCell className="text-xs pl-4">{safeDate(u.status_date)}</TableCell>
                          <TableCell><UpdateStatusBadge status={u.status} /></TableCell>
                          <TableCell className="text-xs">
                            {u.amount_spent != null ? `$${fmt(Number(u.amount_spent))}` : '—'}
                          </TableCell>
                          <TableCell className="text-xs pr-4 max-w-xs truncate text-muted-foreground">
                            {u.status_justification || '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}