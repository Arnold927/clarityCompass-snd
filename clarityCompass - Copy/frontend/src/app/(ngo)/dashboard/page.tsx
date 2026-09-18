'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/app-layout';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TrendingUp, AlertCircle, CheckCircle2, Clock,
  Users, FolderKanban, Activity, MessageSquare,
  ClipboardList, BarChart3, Target, FileText, RefreshCw,
  ChevronRight, MapPin, DollarSign, Calendar as CalendarIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';


// ─────────────────────────────────────────────
// BRAND COLOURS
// ─────────────────────────────────────────────
const C = {
  orange:  '#C8793A',
  green:   '#4A6830',
  red:     '#C0392B',
  brown:   '#3D1A08',
  sandy:   '#E8C97A',
  muted:   '#8B6A4A',
  ch1:     '#C8793A',
  ch2:     '#4A6830',
  ch3:     '#5B8DB8',
  ch4:     '#C0392B',
  ch5:     '#E8C97A',
  onTrack: '#4A6830',
  atRisk:  '#C8793A',
  offTrack:'#C0392B',
};

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
interface MeStats {
  active_strategic_plans: number;
  active_plan_title: string | null;
  corporate_indicators_count: number;
  overall_achievement_rate: number | null;
  active_projects_count: number;
  active_donors_count: number;
  completed_activities_count: number;
  pending_activities_count: number;
  overdue_tasks_count: number;
  total_beneficiaries_ytd: number;
  budget_total: number;
  budget_spent: number;
  budget_utilisation_rate: number | null;
  total_complaints: number;
  open_complaints: number;
  closed_complaints: number;
  overdue_complaints: number;
  complaint_resolution_rate: number | null;
  total_report_schedules: number;
  submitted_reports: number;
  pending_review_reports: number;
  report_compliance_rate: number | null;
}

interface StrategicResult {
  indicator_id: number;
  indicator_name: string;
  objective_name: string | null;
  objective_number: string | null;
  year: number;
  year_id: number;
  target: number;
  actual: number;
  achievement_pct: number;
  comments: string;
}

interface StrategicPerformance {
  plan_id: number;
  plan_title: string;
  plan_years: { id: number; year: number }[];
  results: StrategicResult[];
}

interface QuarterData {
  quarter_id: number;
  year: number;
  quarter: number;
  label: string;
  target: number;
  actual: number;
  achievement_pct: number;
}

interface ProgramQuarterly {
  program_id: number;
  program_name: string;
  available_years: number[];
  outcomes: {
    outcome_id: number;
    outcome_name: string;
    indicators: {
      indicator_id: number;
      indicator_name: string;
      quarters: QuarterData[];
    }[];
  }[];
}

interface TasksSummary {
  total_tasks: number;
  overdue_tasks: number;
  status_breakdown: Record<string, number>;
  total_budget: number;
  total_spent: number;
  budget_utilisation_rate: number;
  project_budget: {
    project_id: number;
    project_code: string;
    project_title: string;
    budget: number;
    spent: number;
    utilisation_pct: number;
  }[];
  indicator_contributions: {
    indicator_id: number;
    indicator_name: string;
    target_contribution: number;
    actual_contribution: number;
    achievement_pct: number;
  }[];
  task_timeline: {
    task_id: number;
    task_title: string;
    project_code: string | null;
    start_date: string | null;
    end_date: string | null;
    status: string;
    budget: number;
    cumulative_spent: number;
  }[];
}

interface ComplaintsAnalytics {
  total: number;
  closed: number;
  open: number;
  overdue: number;
  resolution_rate: number;
  avg_days_to_close: number | null;
  by_status: Record<string, number>;
  by_category: Record<string, number>;
  by_channel: Record<string, number>;
  by_gender: Record<string, number>;
  by_sensitivity: Record<string, number>;
  by_priority: Record<string, number>;
  monthly_trend: { month: string; month_iso: string; count: number }[];
}

interface ReportingCompliance {
  total_schedules: number;
  total_submitted: number;
  total_pending_review: number;
  overall_compliance_rate: number | null;
  projects: {
    project_id: number;
    project_code: string;
    project_title: string;
    total_schedules: number;
    submitted: number;
    pending_review: number;
    compliance_rate: number | null;
    schedules: {
      schedule_id: number;
      schedule_name: string;
      frequency: string;
      has_submission: boolean;
      latest_submission_status: string | null;
      latest_submission_date: string | null;
    }[];
  }[];
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function achColor(pct: number) {
  if (pct >= 90) return C.onTrack;
  if (pct >= 70) return C.atRisk;
  return C.offTrack;
}
function achBadge(pct: number) {
  if (pct >= 90) return <Badge className="bg-green-100 text-green-800 border-green-300 text-xs">{pct}%</Badge>;
  if (pct >= 70) return <Badge className="bg-orange-100 text-orange-800 border-orange-300 text-xs">{pct}%</Badge>;
  return <Badge className="bg-red-100 text-red-800 border-red-300 text-xs">{pct}%</Badge>;
}
function statusBadge(s?: string) {
  const map: Record<string, string> = {
    completed:   'bg-green-100 text-green-800 border-green-300',
    in_progress: 'bg-blue-100 text-blue-800 border-blue-300',
    pending:     'bg-yellow-100 text-yellow-800 border-yellow-300',
    overdue:     'bg-red-100 text-red-800 border-red-300',
    cancelled:   'bg-gray-100 text-gray-600 border-gray-300',
    ongoing:     'bg-blue-100 text-blue-800 border-blue-300',
    planned:     'bg-yellow-100 text-yellow-800 border-yellow-300',
  };
  const k = (s || '').toLowerCase();
  return <Badge className={cn('text-xs capitalize', map[k] || 'bg-gray-100 text-gray-600 border-gray-300')}>{k.replace('_', ' ')}</Badge>;
}
function priorityBadge(p?: string) {
  const map: Record<string, string> = {
    critical: 'bg-red-100 text-red-800 border-red-300',
    high:     'bg-orange-100 text-orange-800 border-orange-300',
    medium:   'bg-blue-100 text-blue-800 border-blue-300',
    low:      'bg-gray-100 text-gray-600 border-gray-300',
  };
  const k = (p || '').toLowerCase();
  return <Badge className={cn('text-xs capitalize', map[k] || 'bg-gray-100 text-gray-600 border-gray-300')}>{k}</Badge>;
}
function fmt(n?: number | null, decimals = 0) {
  if (n == null) return '—';
  return n.toLocaleString(undefined, { maximumFractionDigits: decimals });
}
function fmtPct(n?: number | null) {
  if (n == null) return '—';
  return `${n.toFixed(1)}%`;
}

const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-card p-2 shadow-sm text-xs">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</p>
      ))}
    </div>
  );
};

// Clickable metric card
function MetricCard({ label, value, icon: Icon, sub, subVariant = 'neutral', loading, onClick }: {
  label: string; value: string | number; icon: React.ElementType;
  sub?: string; subVariant?: 'good' | 'warn' | 'bad' | 'neutral'; loading?: boolean;
  onClick?: () => void;
}) {
  const subColor = { good: 'text-green-700', warn: 'text-orange-700', bad: 'text-red-700', neutral: 'text-muted-foreground' }[subVariant];
  return (
    <Card
      onClick={onClick}
      className={cn(onClick && 'cursor-pointer transition-all hover:shadow-md hover:ring-1 hover:ring-ring/20 active:scale-[0.98]')}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-8 w-20" /> : <div className="text-2xl font-bold" style={{ color: C.brown }}>{value}</div>}
        {sub && <p className={cn('text-xs mt-1', subColor)}>{sub}</p>}
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="text-sm text-muted-foreground text-center py-8 px-4">{message}</p>;
}

// Small "View →" link used in card headers — stopPropagation so it doesn't bubble to card onClick
function ViewLink({ label = 'View all →', onClick }: { label?: string; onClick: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors shrink-0"
    >
      {label}
    </button>
  );
}

// ─────────────────────────────────────────────
// SECTION: OVERVIEW
// ─────────────────────────────────────────────
function OverviewSection({ stats, loading, complaints, onTabChange }: {
  stats: MeStats | null; loading: boolean; complaints: any[];
  onTabChange: (tab: string) => void;
}) {
  const router = useRouter();
  return (
    <div className="space-y-6">
      {/* Row 1 */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard
          label="Overall indicator achievement"
          value={stats?.overall_achievement_rate != null ? fmtPct(stats.overall_achievement_rate) : '—'}
          icon={Target}
          sub={stats?.overall_achievement_rate != null
            ? (stats.overall_achievement_rate >= 90 ? 'On track' : stats.overall_achievement_rate >= 70 ? 'At risk' : 'Off track')
            : undefined}
          subVariant={stats?.overall_achievement_rate != null
            ? (stats.overall_achievement_rate >= 90 ? 'good' : stats.overall_achievement_rate >= 70 ? 'warn' : 'bad')
            : 'neutral'}
          loading={loading}
          onClick={() => onTabChange('strategic')}
        />
        <MetricCard
          label="Active projects"
          value={stats?.active_projects_count ?? '—'}
          icon={FolderKanban}
          loading={loading}
          onClick={() => router.push('/projects')}
        />
        <MetricCard
          label="Beneficiaries reached this year"
          value={stats ? fmt(stats.total_beneficiaries_ytd) : '—'}
          icon={Users}
          sub={`Jan – Dec ${new Date().getFullYear()}`}
          loading={loading}
          onClick={() => onTabChange('tasks')}
        />
        <MetricCard
          label="Open Feedback"
          value={stats?.open_complaints ?? '—'}
          icon={MessageSquare}
          sub={stats?.overdue_complaints ? `${stats.overdue_complaints} overdue` : undefined}
          subVariant={stats && stats.open_complaints > 10 ? 'bad' : 'warn'}
          loading={loading}
          onClick={() => router.push('/complaints')}
        />
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard
          label="Completed activities"
          value={stats?.completed_activities_count ?? '—'}
          icon={CheckCircle2}
          sub={stats ? `${stats.pending_activities_count} pending` : undefined}
          loading={loading}
        />
        <MetricCard
          label="Active donors"
          value={stats?.active_donors_count ?? '—'}
          icon={Users}
          loading={loading}
          onClick={() => router.push('/projects')}
        />
        <MetricCard
          label="Budget utilisation"
          value={stats?.budget_utilisation_rate != null ? fmtPct(stats.budget_utilisation_rate) : '—'}
          icon={BarChart3}
          sub={stats ? `$${fmt(stats.budget_spent)} of $${fmt(stats.budget_total)}` : undefined}
          subVariant={stats?.budget_utilisation_rate != null ? (stats.budget_utilisation_rate >= 60 ? 'good' : 'warn') : 'neutral'}
          loading={loading}
          onClick={() => onTabChange('tasks')}
        />
        <MetricCard
          label="Report compliance"
          value={stats?.report_compliance_rate != null ? fmtPct(stats.report_compliance_rate) : '—'}
          icon={FileText}
          sub={stats?.pending_review_reports ? `${stats.pending_review_reports} pending review` : undefined}
          subVariant={stats?.report_compliance_rate != null
            ? (stats.report_compliance_rate >= 90 ? 'good' : stats.report_compliance_rate >= 70 ? 'warn' : 'bad')
            : 'neutral'}
          loading={loading}
          onClick={() => onTabChange('reporting')}
        />
      </div>

      {/* Recent complaints */}
      <Card
        className="cursor-pointer transition-all hover:shadow-md hover:ring-1 hover:ring-ring/20"
        onClick={() => router.push('/complaints')}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Recent feedbacks</CardTitle>
              <CardDescription>Latest FCRM cases</CardDescription>
            </div>
            <span className="text-xs text-muted-foreground">View all →</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {complaints.length === 0 ? <EmptyState message="No complaints loaded." /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs pl-4">Case ID</TableHead>
                  <TableHead className="text-xs">Priority</TableHead>
                  <TableHead className="text-xs pr-4">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {complaints.slice(0, 5).map((c) => (
                  <TableRow key={c.id} className="hover:bg-muted/50">
                    <TableCell className="text-xs font-mono pl-4">{c.case_id || c.id}</TableCell>
                    <TableCell>{priorityBadge(c.priority)}</TableCell>
                    <TableCell className="pr-4">{statusBadge(c.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────
// SECTION: STRATEGIC
// ─────────────────────────────────────────────
function StrategicSection({ stats }: { stats: MeStats | null }) {
  const router = useRouter();
  const [data, setData] = useState<StrategicPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYearId, setSelectedYearId] = useState<number | null>(null);
  const [selectedIndicator, setSelectedIndicator] = useState<StrategicResult | null>(null);

  useEffect(() => {
    api.get('/strategic/performance/')
      .then((r) => {
        setData(r.data);
        if (r.data.plan_years?.length) {
          setSelectedYearId(r.data.plan_years[r.data.plan_years.length - 1].id);
        }
      })
      .catch((e) => console.error('strategic/performance/', e))
      .finally(() => setLoading(false));
  }, []);

  const filteredResults = data?.results.filter(
    (r) => selectedYearId == null || r.year_id === selectedYearId,
  ) ?? [];

  const trendData = data
    ? Object.values(
        data.results.reduce((acc: Record<number, { year: number; vals: number[] }>, r) => {
          if (!acc[r.year]) acc[r.year] = { year: r.year, vals: [] };
          acc[r.year].vals.push(r.achievement_pct);
          return acc;
        }, {}),
      ).map(({ year, vals }) => ({
        year: String(year),
        achievement: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
      }))
    : [];

  const byObjective = Object.entries(
    filteredResults.reduce((acc: Record<string, number[]>, r) => {
      const k = r.objective_number || 'Unknown';
      if (!acc[k]) acc[k] = [];
      acc[k].push(r.achievement_pct);
      return acc;
    }, {}),
  ).map(([obj, vals]) => ({
    obj,
    avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard label="Active strategic plan" value={stats?.active_plan_title ?? '—'} icon={Target}
          onClick={() => router.push('/strategic-plan')} />
        <MetricCard label="Corporate indicators" value={stats?.corporate_indicators_count ?? '—'} icon={BarChart3}
          onClick={() => router.push('/strategic-plan')} />
        <MetricCard label="Avg achievement rate"
          value={stats?.overall_achievement_rate != null ? fmtPct(stats.overall_achievement_rate) : '—'}
          icon={TrendingUp} sub="Target: ≥ 90%"
          subVariant={stats?.overall_achievement_rate != null
            ? (stats.overall_achievement_rate >= 90 ? 'good' : stats.overall_achievement_rate >= 70 ? 'warn' : 'bad')
            : 'neutral'}
          onClick={() => router.push('/strategic-plan')} />
      </div>

      {/* Corporate indicator bar chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Corporate indicator achievement</CardTitle>
              <CardDescription>Actual as % of target — click a bar to drill into that indicator</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <ViewLink label="View plan →" onClick={() => router.push('/strategic-plan')} />
              {data?.plan_years && data.plan_years.length > 0 && (
                <select
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                  value={selectedYearId ?? ''}
                  onChange={(e) => setSelectedYearId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">All years</option>
                  {data.plan_years.map((y) => <option key={y.id} value={y.id}>{y.year}</option>)}
                </select>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-64 w-full" />
            : filteredResults.length === 0
            ? <EmptyState message="No performance data. Add CorporateIndicatorPerformance records via the admin or strategic plan editor." />
            : (
              <ResponsiveContainer width="100%" height={filteredResults.length * 44 + 40}>
                <BarChart layout="vertical" data={filteredResults} margin={{ left: 8, right: 50, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8DDD0" horizontal={false} />
                  <XAxis type="number" domain={[0, 120]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="indicator_name" width={200} tick={{ fontSize: 11 }} axisLine={false} tickLine={false}
                    tickFormatter={(v: string) => v.length > 30 ? v.slice(0, 28) + '…' : v} />
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as StrategicResult;
                    return (
                      <div className="rounded-lg border bg-card p-2 shadow-sm text-xs">
                        <p className="font-medium">{d.indicator_name}</p>
                        <p>Achievement: <strong>{d.achievement_pct}%</strong></p>
                        <p>Actual: {fmt(d.actual)} / Target: {fmt(d.target)}</p>
                        {d.objective_number && <p>Objective: {d.objective_number}</p>}
                        {d.comments && <p className="text-muted-foreground mt-1 italic">{d.comments}</p>}
                        <p className="text-muted-foreground mt-1">Click for details</p>
                      </div>
                    );
                  }} />
                  <Bar
                    dataKey="achievement_pct"
                    name="Achievement %"
                    radius={[0, 4, 4, 0]}
                    cursor="pointer"
                    label={{ position: 'right', fontSize: 11, formatter: (v: number) => `${v}%` }}
                    onClick={(d: StrategicResult) => setSelectedIndicator(prev => prev?.indicator_id === d.indicator_id ? null : d)}
                  >
                    {filteredResults.map((r, i) => (
                      <Cell
                        key={i}
                        fill={achColor(r.achievement_pct)}
                        opacity={selectedIndicator && selectedIndicator.indicator_id !== r.indicator_id ? 0.35 : 1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}

          {/* Indicator detail drill-down panel */}
          {selectedIndicator && (
            <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50/40 p-4 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{selectedIndicator.indicator_name}</p>
                  {selectedIndicator.objective_name && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {selectedIndicator.objective_number && <span className="font-mono mr-1">{selectedIndicator.objective_number}</span>}
                      {selectedIndicator.objective_name}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedIndicator(null)}
                  className="text-muted-foreground hover:text-foreground text-lg leading-none shrink-0 mt-0.5"
                >×</button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Target', value: fmt(selectedIndicator.target), color: 'text-muted-foreground' },
                  { label: 'Actual', value: fmt(selectedIndicator.actual), color: 'text-foreground font-semibold' },
                  { label: 'Gap', value: fmt(selectedIndicator.actual - selectedIndicator.target), color: selectedIndicator.actual >= selectedIndicator.target ? 'text-green-700' : 'text-red-600' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-md bg-background border px-3 py-2 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                    <p className={cn('text-base font-bold mt-0.5', color)}>{value}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Achievement</span>
                  <span style={{ color: achColor(selectedIndicator.achievement_pct) }} className="font-semibold">
                    {selectedIndicator.achievement_pct}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(selectedIndicator.achievement_pct, 100)}%`,
                      background: achColor(selectedIndicator.achievement_pct),
                    }}
                  />
                </div>
              </div>
              {selectedIndicator.comments && (
                <p className="text-xs text-muted-foreground italic border-t pt-2">
                  💬 {selectedIndicator.comments}
                </p>
              )}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-muted-foreground">Year: {selectedIndicator.year}</span>
                <button
                  onClick={() => router.push('/strategic-plan')}
                  className="text-xs text-orange-700 hover:underline font-medium"
                >
                  Open in strategic plan →
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Achievement trend — by year</CardTitle></CardHeader>
          <CardContent>
            {trendData.length === 0 ? <EmptyState message="Need performance data across multiple years." /> : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8DDD0" vertical={false} />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => `${v}%`} width={38} />
                  <Tooltip content={<Tip />} />
                  <Line dataKey="achievement" name="Avg achievement" stroke={C.ch1} strokeWidth={2}
                    dot={{ r: 4, fill: C.ch1 }} activeDot={{ r: 6, cursor: 'pointer' }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Objective-level summary</CardTitle>
              <ViewLink label="View plan →" onClick={() => router.push('/strategic-plan')} />
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            {byObjective.length === 0 ? <EmptyState message="No data." /> : byObjective.map(({ obj, avg }) => (
              <div
                key={obj}
                className="space-y-1 cursor-pointer rounded-md px-1 py-0.5 hover:bg-muted/50 transition-colors"
                onClick={() => router.push('/strategic-plan')}
              >
                <div className="flex justify-between text-xs">
                  <span className="font-medium">{obj}</span>
                  <span style={{ color: achColor(avg) }} className="font-semibold">{avg}%</span>
                </div>
                <Progress value={Math.min(avg, 100)} className="h-2"
                  indicatorClassName={avg >= 90 ? 'bg-green-600' : avg >= 70 ? 'bg-orange-500' : 'bg-red-600'} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SECTION: PROGRAMS
// ─────────────────────────────────────────────
function ProgramsSection() {
  const router = useRouter();
  const [programs, setPrograms] = useState<{ id: number; name: string }[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<number | null>(null);
  const [quarterly, setQuarterly] = useState<ProgramQuarterly | null>(null);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [loadingQ, setLoadingQ] = useState(false);
  const [expandedIndicator, setExpandedIndicator] = useState<number | null>(null);

  useEffect(() => {
    api.get('/programs/')
      .then((r) => {
        const list = Array.isArray(r.data) ? r.data : r.data.results ?? [];
        setPrograms(list);
        if (list.length) setSelectedProgram(list[0].id);
      })
      .catch((e) => console.error('programs/', e))
      .finally(() => setLoadingPrograms(false));
  }, []);

  useEffect(() => {
    if (!selectedProgram) return;
    setLoadingQ(true);
    api.get(`/programs/${selectedProgram}/quarterly-performance/`)
      .then((r) => setQuarterly(r.data))
      .catch((e) => console.error('quarterly-performance/', e))
      .finally(() => setLoadingQ(false));
  }, [selectedProgram]);

  const chartData = quarterly?.outcomes?.[0]?.indicators?.[0]?.quarters.map((q) => ({
    label: q.label, target: q.target, actual: q.actual,
  })) ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Quarterly outcome indicator performance</CardTitle>
              <CardDescription>
                {quarterly
                  ? `${quarterly.program_name}${quarterly.outcomes?.[0]?.indicators?.[0] ? ` — ${quarterly.outcomes[0].indicators[0].indicator_name}` : ''}`
                  : 'Select a program'}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <ViewLink label="View programs →" onClick={() => router.push('/programs')} />
              {loadingPrograms ? <Skeleton className="h-8 w-40" /> : (
                <select
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                  value={selectedProgram ?? ''}
                  onChange={(e) => setSelectedProgram(Number(e.target.value))}
                >
                  {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingQ ? <Skeleton className="h-48 w-full" />
            : chartData.length === 0
            ? <EmptyState message="No quarterly performance data. Add ProgramOutcomeIndicatorPerformance records." />
            : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8DDD0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip content={<Tip />} />
                  <Bar dataKey="target" name="Target" fill={C.ch5} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="actual" name="Actual" fill={C.ch2} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
        </CardContent>
      </Card>

      {quarterly?.outcomes.map((outcome) => (
        <Card key={outcome.outcome_id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">{outcome.outcome_name}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs pl-4">Indicator</TableHead>
                  {outcome.indicators[0]?.quarters.map((q) => (
                    <TableHead key={q.quarter_id} className="text-xs text-right">{q.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {outcome.indicators.map((ind) => (
                  <React.Fragment key={ind.indicator_id}>
                    <TableRow
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setExpandedIndicator(expandedIndicator === ind.indicator_id ? null : ind.indicator_id)}
                    >
                      <TableCell className="text-xs pl-4 flex items-center gap-1.5">
                        <ChevronRight className={cn('h-3 w-3 text-muted-foreground transition-transform shrink-0', expandedIndicator === ind.indicator_id && 'rotate-90')} />
                        {ind.indicator_name}
                      </TableCell>
                      {ind.quarters.map((q) => (
                        <TableCell key={q.quarter_id} className="text-right">
                          {q.target > 0
                            ? achBadge(q.achievement_pct)
                            : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                      ))}
                    </TableRow>
                    {expandedIndicator === ind.indicator_id && (
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={1 + (ind.quarters.length || 1)} className="p-0">
                          <div className="px-6 py-3 space-y-2">
                            <p className="text-xs font-medium text-muted-foreground mb-2">Quarter-by-quarter breakdown</p>
                            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${ind.quarters.length}, 1fr)` }}>
                              {ind.quarters.map((q) => (
                                <div key={q.quarter_id} className="rounded-md border bg-background px-3 py-2 text-center space-y-1">
                                  <p className="text-[10px] font-medium text-muted-foreground uppercase">{q.label}</p>
                                  <p className="text-sm font-bold" style={{ color: q.target > 0 ? achColor(q.achievement_pct) : '#aaa' }}>
                                    {q.target > 0 ? `${q.achievement_pct}%` : '—'}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">{fmt(q.actual)} / {fmt(q.target)}</p>
                                  <div className="h-1 rounded-full bg-muted overflow-hidden">
                                    <div
                                      className="h-full rounded-full"
                                      style={{
                                        width: q.target > 0 ? `${Math.min(q.achievement_pct, 100)}%` : '0%',
                                        background: q.target > 0 ? achColor(q.achievement_pct) : '#aaa',
                                      }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// SECTION: TASKS
// ─────────────────────────────────────────────
function TasksSection() {
  const router = useRouter();
  const [data, setData] = useState<TasksSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('KES');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  // Per-project summary fetched when a project is selected
  const [projectSummary, setProjectSummary] = useState<TasksSummary | null>(null);
  const [loadingProject, setLoadingProject] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);

  useEffect(() => {
    api.get('/tasks/me-summary/')
      .then((r) => setData(r.data))
      .catch((e) => console.error('tasks/me-summary/', e))
      .finally(() => setLoading(false));
  }, []);

  // When a project is selected, fetch its task summary
  useEffect(() => {
    if (!selectedProjectId) {
      setProjectSummary(null);
      return;
    }
    setLoadingProject(true);
    api.get('/tasks/me-summary/', { params: { project_id: selectedProjectId } })
      .then((r) => setProjectSummary(r.data))
      .catch((e) => {
        console.error('tasks/me-summary/ (project)', e);
        setProjectSummary(null);
      })
      .finally(() => setLoadingProject(false));
  }, [selectedProjectId]);

  // The active dataset — project-scoped if a project is selected, otherwise full summary
  const active = selectedProjectId ? (projectSummary ?? data) : data;
  const isFiltered = !!selectedProjectId;
  const isLoadingActive = loading || (isFiltered && loadingProject);

  // Selected project metadata (from budget list)
  const selectedProject = data?.project_budget?.find((p) => p.project_id === selectedProjectId) ?? null;

  // Derive unique currencies from project data; default KES first
  const availableCurrencies = data?.project_budget?.length
    ? ['KES', ...Array.from(new Set(
        data.project_budget
          .map((p: any) => p.currency || 'KES')
          .filter((c: string) => c !== 'KES')
      ))]
    : ['KES'];

  const currencySymbol: Record<string, string> = {
    KES: 'KSh', USD: '$', EUR: '€', GBP: '£',
    ETB: 'Br', SSP: 'SSP', UGX: 'USh', TZS: 'TSh',
  };
  const sym = currencySymbol[selectedCurrency] ?? selectedCurrency;

  // Budget chart always shows all projects (for selection); highlight selected
  const budgetChartData = data?.project_budget?.filter(
    (p: any) => (p.currency || 'KES') === selectedCurrency
  ) ?? [];

  const statusColors: Record<string, string> = {
    COMPLETED: C.ch2, ONGOING: C.ch3, PLANNED: C.ch5, CANCELLED: '#aaa',
  };

  // Status breakdown derived from active dataset
  const statusChartData = active
    ? Object.entries(active.status_breakdown).map(([name, value]) => ({
        name, value, color: statusColors[name] ?? C.ch4,
      }))
    : [];

  // Budget metric figures — project-scoped if selected
  const activeBudgetData = isFiltered && selectedProject
    ? [selectedProject]
    : budgetChartData;

  const totalSpent = activeBudgetData.reduce((a, p: any) => a + (p.spent ?? 0), 0);
  const totalBudget = activeBudgetData.reduce((a, p: any) => a + (p.budget ?? 0), 0);

  // Timeline filtered to selected project
  const timelineItems = isFiltered
    ? (active?.task_timeline ?? []).filter(
        (t) => !selectedProject || t.project_code === selectedProject.project_code
      )
    : (active?.task_timeline ?? []);

  return (
    <div className="space-y-6">
      {/* Project selector row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground font-medium shrink-0">Filter by project:</span>
        <button
          onClick={() => setSelectedProjectId(null)}
          className={cn(
            'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
            !selectedProjectId
              ? 'border-orange-400 bg-orange-50 text-orange-800'
              : 'border-border text-muted-foreground hover:border-orange-300 hover:text-foreground'
          )}
        >
          All projects
        </button>
        {data?.project_budget?.map((p) => (
          <button
            key={p.project_id}
            onClick={() => setSelectedProjectId(p.project_id === selectedProjectId ? null : p.project_id)}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
              selectedProjectId === p.project_id
                ? 'border-orange-400 bg-orange-50 text-orange-800'
                : 'border-border text-muted-foreground hover:border-orange-300 hover:text-foreground'
            )}
          >
            {p.project_code}
          </button>
        ))}
        {isFiltered && selectedProject && (
          <span className="text-xs text-muted-foreground ml-1 truncate max-w-xs hidden sm:inline">
            — {selectedProject.project_title}
          </span>
        )}
      </div>

      {/* Metric cards — reflect selected project */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard label="Total tasks" value={active?.total_tasks ?? '—'} icon={ClipboardList} loading={isLoadingActive} />
        <MetricCard label="Completed"
          value={active ? (active.status_breakdown['COMPLETED'] ?? 0) : '—'}
          icon={CheckCircle2}
          sub={active && active.total_tasks
            ? `${Math.round((active.status_breakdown['COMPLETED'] ?? 0) / active.total_tasks * 100)}%`
            : undefined}
          subVariant="good" loading={isLoadingActive} />
        <MetricCard label="Overdue" value={active?.overdue_tasks ?? '—'} icon={AlertCircle}
          sub="End date passed" subVariant="bad" loading={isLoadingActive} />
        <MetricCard label={`Budget utilised (${selectedCurrency})`}
          value={activeBudgetData.length ? `${sym}${fmt(totalSpent)}` : (active ? `${sym}${fmt(active.total_spent)}` : '—')}
          icon={BarChart3}
          sub={activeBudgetData.length
            ? `of ${sym}${fmt(totalBudget)} total`
            : (active ? `of ${sym}${fmt(active.total_budget)} total` : undefined)}
          subVariant={active?.budget_utilisation_rate != null
            ? (active.budget_utilisation_rate >= 60 ? 'good' : 'warn') : 'neutral'}
          loading={isLoadingActive} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Task status donut — reflects selected project */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Task status breakdown</CardTitle>
            {isFiltered && selectedProject && (
              <CardDescription>{selectedProject.project_code} — {selectedProject.project_title}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {isLoadingActive ? <Skeleton className="h-48 w-full" />
              : statusChartData.length === 0 ? <EmptyState message="No task data." /> : (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={statusChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={72}
                        paddingAngle={3} dataKey="value" cursor="pointer">
                        {statusChartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip formatter={(v, n) => [`${v} tasks`, n]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-1">
                    {statusChartData.map((s) => (
                      <span key={s.name} className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} />
                        {s.name} ({s.value})
                      </span>
                    ))}
                  </div>
                </>
              )}
          </CardContent>
        </Card>

        {/* Budget vs expenditure — click a bar to select that project */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <CardTitle className="text-sm font-semibold">Budget vs. expenditure</CardTitle>
                <CardDescription>
                  By project ({selectedCurrency}) — click a bar to filter all cards
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                  className="text-xs border border-border rounded px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-orange-400 cursor-pointer"
                  aria-label="Select currency"
                >
                  {availableCurrencies.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <ViewLink label="All projects →" onClick={() => router.push('/projects')} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-48 w-full" />
              : !budgetChartData.length
                ? <EmptyState message={`No ${selectedCurrency} budget data.`} />
              : (
                <ResponsiveContainer width="100%" height={Math.max(180, budgetChartData.length * 36 + 40)}>
                  <BarChart data={budgetChartData} barGap={3}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8DDD0" vertical={false} />
                    <XAxis dataKey="project_code" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={52}
                      tickFormatter={(v) => `${sym}${(v / 1000).toFixed(0)}K`} />
                    <Tooltip content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      const isSelected = d.project_id === selectedProjectId;
                      return (
                        <div className="rounded-lg border bg-card p-2 shadow-sm text-xs">
                          <p className="font-medium mb-1">{d.project_title}</p>
                          <p className="text-muted-foreground text-[10px] mb-1">{d.currency || selectedCurrency}</p>
                          <p>Budget: {sym}{fmt(d.budget)}</p>
                          <p>Spent: {sym}{fmt(d.spent)}</p>
                          <p>Utilisation: {d.utilisation_pct}%</p>
                          <p className="text-muted-foreground mt-1">
                            {isSelected ? 'Click to deselect' : 'Click to filter all cards'}
                          </p>
                        </div>
                      );
                    }} />
                    <Bar dataKey="budget" name="Budget" radius={[3, 3, 0, 0]} cursor="pointer"
                      onClick={(d: any) => setSelectedProjectId(d.project_id === selectedProjectId ? null : d.project_id)}>
                      {budgetChartData.map((p, i) => (
                        <Cell
                          key={i}
                          fill={p.project_id === selectedProjectId ? C.ch1 : C.ch5}
                          opacity={selectedProjectId && p.project_id !== selectedProjectId ? 0.4 : 1}
                        />
                      ))}
                    </Bar>
                    <Bar dataKey="spent" name="Spent" radius={[3, 3, 0, 0]} cursor="pointer"
                      onClick={(d: any) => setSelectedProjectId(d.project_id === selectedProjectId ? null : d.project_id)}>
                      {budgetChartData.map((p, i) => (
                        <Cell
                          key={i}
                          fill={p.project_id === selectedProjectId ? C.orange : C.ch1}
                          opacity={selectedProjectId && p.project_id !== selectedProjectId ? 0.4 : 1}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
          </CardContent>
        </Card>
      </div>

      {/* Task timeline — filtered to selected project */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Task timeline</CardTitle>
              <CardDescription>
                {isFiltered && selectedProject
                  ? `${selectedProject.project_code} — ${selectedProject.project_title}`
                  : 'Tasks with scheduled dates — click to open'}
              </CardDescription>
            </div>
            {isFiltered && (
              <ViewLink
                label="Open project →"
                onClick={() => router.push(`/projects/${selectedProjectId}`)}
              />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          {isLoadingActive ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)
            : !timelineItems.length ? <EmptyState message={isFiltered ? 'No tasks with dates for this project.' : 'No tasks with dates found.'} />
            : timelineItems.map((t) => (
              <div key={t.task_id}>
                <div
                  className="flex items-center gap-3 rounded-md px-2 py-1.5 cursor-pointer hover:bg-muted/60 transition-colors"
                  onClick={() => setExpandedTaskId(expandedTaskId === t.task_id ? null : t.task_id)}
                >
                  <ChevronRight className={cn('h-3 w-3 text-muted-foreground transition-transform shrink-0', expandedTaskId === t.task_id && 'rotate-90')} />
                  <span className="text-xs font-mono text-muted-foreground w-14 shrink-0">{t.project_code}</span>
                  <span className="text-xs flex-1 truncate">{t.task_title}</span>
                  <div className="flex-1 h-3 rounded bg-muted overflow-hidden max-w-[140px]">
                    <div className="h-full rounded" style={{
                      width: t.status === 'COMPLETED' ? '100%' : t.status === 'ONGOING' ? '55%' : '20%',
                      background: statusColors[t.status] ?? C.ch3,
                    }} />
                  </div>
                  {statusBadge(t.status)}
                </div>
                {expandedTaskId === t.task_id && (
                  <div className="mx-2 mb-1 rounded-md border bg-muted/30 px-4 py-3 space-y-2">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                      <div>
                        <span className="text-muted-foreground">Start date</span>
                        <p className="font-medium mt-0.5">
                          {t.start_date ? format(parseISO(t.start_date), 'dd MMM yyyy') : '—'}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">End date</span>
                        <p className="font-medium mt-0.5">
                          {t.end_date ? format(parseISO(t.end_date), 'dd MMM yyyy') : '—'}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Budget</span>
                        <p className="font-medium mt-0.5">{sym}{fmt(t.budget)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Spent so far</span>
                        <p className="font-medium mt-0.5">{sym}{fmt(t.cumulative_spent)}</p>
                      </div>
                    </div>
                    {t.budget > 0 && (
                      <div className="space-y-0.5">
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>Budget used</span>
                          <span>{Math.round((t.cumulative_spent / t.budget) * 100)}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min((t.cumulative_spent / t.budget) * 100, 100)}%`,
                              background: C.ch1,
                            }}
                          />
                        </div>
                      </div>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); router.push(`/tasks/${t.task_id}`); }}
                      className="text-xs text-orange-700 hover:underline font-medium"
                    >
                      Open full task →
                    </button>
                  </div>
                )}
              </div>
            ))}
        </CardContent>
      </Card>

      {/* Indicator contributions — from active (project-scoped or all) */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Indicator contributions from tasks</CardTitle>
              {isFiltered && selectedProject && (
                <CardDescription>{selectedProject.project_code} — {selectedProject.project_title}</CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingActive ? <Skeleton className="h-32 w-full m-4" />
            : !active?.indicator_contributions?.length
            ? <EmptyState message={
                isFiltered
                  ? 'No indicator contributions for this project.'
                  : 'No indicator contribution data. Link tasks to output indicators via TaskIndicatorProgress.'
              } />
            : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs pl-4">Output indicator</TableHead>
                    <TableHead className="text-xs text-right">Target</TableHead>
                    <TableHead className="text-xs text-right">Actual</TableHead>
                    <TableHead className="text-xs text-right pr-4">Achievement</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {active.indicator_contributions.map((r) => (
                    <TableRow key={r.indicator_id} className="hover:bg-muted/50">
                      <TableCell className="text-xs pl-4">{r.indicator_name}</TableCell>
                      <TableCell className="text-xs text-right">{fmt(r.target_contribution)}</TableCell>
                      <TableCell className="text-xs text-right">{fmt(r.actual_contribution)}</TableCell>
                      <TableCell className="text-right pr-4">{achBadge(r.achievement_pct)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────
// SECTION: DISAGGREGATION
// ─────────────────────────────────────────────
function DisaggSection() {
  const router = useRouter();
  const [indicators, setIndicators] = useState<{ id: number; name: string }[]>([]);
  const [selectedIndicator, setSelectedIndicator] = useState<number | null>(null);
  const [disaggData, setDisaggData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingInds, setLoadingInds] = useState(true);

  useEffect(() => {
    api.get('/strategic/indicators/')
      .then((r) => {
        const list = Array.isArray(r.data) ? r.data : r.data.results ?? [];
        setIndicators(list);
        if (list.length) setSelectedIndicator(list[0].id);
      })
      .catch((e) => console.error('strategic/indicators/', e))
      .finally(() => setLoadingInds(false));
  }, []);

  useEffect(() => {
    if (!selectedIndicator) return;
    setLoading(true);
    api.get(`/strategic/indicators/${selectedIndicator}/disaggregation-summary/`)
      .then((r) => setDisaggData(r.data))
      .catch((e) => console.error('disaggregation-summary/', e))
      .finally(() => setLoading(false));
  }, [selectedIndicator]);

  const rows: { disaggregator_name: string; baseline: number; target: number; actual: number; achievement_pct: number }[] =
    disaggData?.disaggregations ?? [];
  const maxTarget = Math.max(...rows.map((d) => d.target), 1);
  const colors = [C.ch3, '#C8679E', C.ch2, C.ch1, C.ch4, C.ch5, '#7A5C9E'];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Disaggregated performance</CardTitle>
              <CardDescription>{disaggData ? disaggData.indicator_name : 'Select a corporate indicator'}</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <ViewLink label="View strategic plan →" onClick={() => router.push('/strategic-plan')} />
              {loadingInds ? <Skeleton className="h-8 w-48" /> : (
                <select
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs max-w-xs"
                  value={selectedIndicator ?? ''}
                  onChange={(e) => setSelectedIndicator(Number(e.target.value))}
                >
                  {indicators.map((ind) => <option key={ind.id} value={ind.id}>{ind.name}</option>)}
                </select>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? <Skeleton className="h-40 w-full m-4" />
            : rows.length === 0
            ? <EmptyState message="No disaggregated data. Add disaggregators to this indicator and enter IndicatorDisaggregation records." />
            : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs pl-4">Disaggregator</TableHead>
                    <TableHead className="text-xs text-right">Baseline</TableHead>
                    <TableHead className="text-xs text-right">Target</TableHead>
                    <TableHead className="text-xs text-right">Actual</TableHead>
                    <TableHead className="text-xs text-right">Achievement</TableHead>
                    <TableHead className="text-xs text-right pr-4">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.disaggregator_name} className="hover:bg-muted/50">
                      <TableCell className="text-xs pl-4 font-medium">{r.disaggregator_name}</TableCell>
                      <TableCell className="text-xs text-right text-muted-foreground">{fmt(r.baseline, 1)}</TableCell>
                      <TableCell className="text-xs text-right">{fmt(r.target, 1)}</TableCell>
                      <TableCell className="text-xs text-right">{fmt(r.actual, 1)}</TableCell>
                      <TableCell className="text-right">{achBadge(r.achievement_pct)}</TableCell>
                      <TableCell className="text-right pr-4">
                        {statusBadge(r.achievement_pct >= 90 ? 'completed' : r.achievement_pct >= 70 ? 'in_progress' : 'pending')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Actual vs. target reach</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {rows.map((d, i) => {
              const aW = Math.round((d.actual / maxTarget) * 100);
              const tW = Math.round((d.target / maxTarget) * 100);
              const color = colors[i % colors.length];
              return (
                <div key={d.disaggregator_name} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">{d.disaggregator_name}</span>
                    <span className="text-muted-foreground">{fmt(d.actual, 1)} / {fmt(d.target, 1)} ({d.achievement_pct}%)</span>
                  </div>
                  <div className="relative h-3 rounded bg-muted overflow-hidden">
                    <div className="absolute top-0 left-0 h-full rounded" style={{ width: `${tW}%`, background: `${color}30` }} />
                    <div className="absolute top-0 left-0 h-full rounded" style={{ width: `${aW}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// SECTION: FCRM
// ─────────────────────────────────────────────
function FcrmSection({ complaints, loadingComplaints }: { complaints: any[]; loadingComplaints: boolean }) {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<ComplaintsAnalytics | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [selectedComplaint, setSelectedComplaint] = useState<any | null>(null);

  useEffect(() => {
    api.get('/complaints/analytics/')
      .then((r) => setAnalytics(r.data))
      .catch((e) => console.error('complaints/analytics/', e))
      .finally(() => setLoadingAnalytics(false));
  }, []);

  const filtered = complaints.filter((c) => {
    if (statusFilter && c.status !== statusFilter) return false;
    if (priorityFilter && c.priority !== priorityFilter) return false;
    return true;
  });

  const catColors = [C.ch4, '#C8679E', C.ch1, C.muted];
  const catData = analytics
    ? Object.entries(analytics.by_category).map(([name, value], i) => ({
        name: name.replace(/_/g, ' '), value, color: catColors[i % catColors.length],
      }))
    : [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard label="Total feedbacks" value={analytics?.total ?? '—'} icon={MessageSquare}
          loading={loadingAnalytics} onClick={() => router.push('/complaints')} />
        <MetricCard label="Resolution rate"
          value={analytics?.resolution_rate != null ? fmtPct(analytics.resolution_rate) : '—'}
          icon={CheckCircle2} sub={analytics ? `${analytics.closed} closed` : undefined}
          subVariant={analytics?.resolution_rate != null
            ? (analytics.resolution_rate >= 80 ? 'good' : analytics.resolution_rate >= 60 ? 'warn' : 'bad') : 'neutral'}
          loading={loadingAnalytics} onClick={() => router.push('/complaints')} />
        <MetricCard label="Avg days to close"
          value={analytics?.avg_days_to_close != null ? analytics.avg_days_to_close.toFixed(1) : '—'}
          icon={Clock} sub="days" loading={loadingAnalytics} />
        <MetricCard label="Overdue cases" value={analytics?.overdue ?? '—'} icon={AlertCircle}
          sub="Past deadline" subVariant="bad" loading={loadingAnalytics}
          onClick={() => router.push('/complaints')} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Monthly feedback volume</CardTitle></CardHeader>
          <CardContent>
            {loadingAnalytics ? <Skeleton className="h-40 w-full" />
              : !analytics?.monthly_trend?.length ? <EmptyState message="No trend data." /> : (
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={analytics.monthly_trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8DDD0" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                    <Tooltip content={<Tip />} />
                    <Line dataKey="count" name="Complaints" stroke={C.ch4} strokeWidth={2}
                      dot={{ r: 3, fill: C.ch4 }} activeDot={{ r: 5, cursor: 'pointer' }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">By category</CardTitle></CardHeader>
          <CardContent>
            {loadingAnalytics ? <Skeleton className="h-40 w-full" />
              : catData.length === 0 ? <EmptyState message="No category data." /> : (
                <>
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie data={catData} cx="50%" cy="50%" innerRadius={40} outerRadius={60}
                        paddingAngle={3} dataKey="value" cursor="pointer"
                        onClick={() => router.push('/complaints')}
                      >
                        {catData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip formatter={(v, n) => [`${v} cases`, n]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center mt-1">
                    {catData.map((c) => (
                      <span key={c.name} className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: c.color }} />
                        {c.name} ({c.value})
                      </span>
                    ))}
                  </div>
                </>
              )}
          </CardContent>
        </Card>
      </div>

      {analytics && Object.keys(analytics.by_sensitivity).length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">By sensitivity level</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {[1, 2, 3, 4, 5].map((l) => {
                const count = analytics.by_sensitivity[String(l)] ?? 0;
                const maxCount = Math.max(...Object.values(analytics.by_sensitivity).map(Number), 1);
                const lvlColors = ['#4A6830', '#97C459', '#E8C97A', '#C8793A', '#C0392B'];
                return (
                  <div key={l} className="flex items-center gap-3">
                    <span className="text-xs font-medium w-16 shrink-0 text-muted-foreground">Level {l}</span>
                    <div className="flex-1 h-2.5 rounded bg-muted overflow-hidden">
                      <div className="h-full rounded" style={{ width: `${Math.round((count / maxCount) * 100)}%`, background: lvlColors[l - 1] }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-10 text-right">{count}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">By feedback channel</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(analytics.by_channel).sort(([, a], [, b]) => b - a).slice(0, 7).map(([channel, count]) => {
                const maxCount = Math.max(...Object.values(analytics.by_channel).map(Number), 1);
                return (
                  <div key={channel} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-24 shrink-0 truncate capitalize">{channel.replace('_', ' ')}</span>
                    <div className="flex-1 h-2.5 rounded bg-muted overflow-hidden">
                      <div className="h-full rounded" style={{ width: `${Math.round((count / maxCount) * 100)}%`, background: C.ch3 }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Case register — rows open inline detail panel */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Case register</CardTitle>
              <CardDescription>Open and recent feedbacks — click a row for details</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ViewLink label="All feedbacks →" onClick={() => router.push('/complaints')} />
              <select className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
                <option value="overdue">Overdue</option>
              </select>
              <select className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
                <option value="">All priorities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingComplaints
            ? <div className="p-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            : filtered.length === 0
            ? <EmptyState message={complaints.length === 0 ? 'No complaints loaded.' : 'No complaints match filters.'} />
            : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs pl-4">Case ID</TableHead>
                    <TableHead className="text-xs">Date received</TableHead>
                    <TableHead className="text-xs">Category</TableHead>
                    <TableHead className="text-xs">Priority</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs pr-4">Assigned to</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.slice(0, 25).map((c) => (
                    <React.Fragment key={c.id}>
                      <TableRow
                        className={cn('cursor-pointer transition-colors', selectedComplaint?.id === c.id ? 'bg-orange-50/60' : 'hover:bg-muted/50')}
                        onClick={() => setSelectedComplaint(selectedComplaint?.id === c.id ? null : c)}
                      >
                        <TableCell className="text-xs font-mono pl-4 flex items-center gap-1.5">
                          <ChevronRight className={cn('h-3 w-3 text-muted-foreground transition-transform shrink-0', selectedComplaint?.id === c.id && 'rotate-90')} />
                          {c.case_id || c.id}
                        </TableCell>
                        <TableCell className="text-xs">
                          {c.date_feedback_received
                            ? format(parseISO(c.date_feedback_received), 'dd MMM yyyy')
                            : c.created_at ? format(parseISO(c.created_at), 'dd MMM yyyy') : '—'}
                        </TableCell>
                        <TableCell className="text-xs capitalize">{(c.category || '').replace(/_/g, ' ') || '—'}</TableCell>
                        <TableCell>{priorityBadge(c.priority)}</TableCell>
                        <TableCell>{statusBadge(c.status)}</TableCell>
                        <TableCell className="text-xs pr-4">{c.assigned_to_name || '—'}</TableCell>
                      </TableRow>
                      {selectedComplaint?.id === c.id && (
                        <TableRow className="bg-orange-50/40 hover:bg-orange-50/40">
                          <TableCell colSpan={6} className="px-6 py-3">
                            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs sm:grid-cols-3">
                              {[
                                { label: 'Case ID', value: c.case_id || c.id },
                                { label: 'Channel', value: c.channel ? (c.channel).replace(/_/g, ' ') : null },
                                { label: 'Sensitivity', value: c.sensitivity_level ? `Level ${c.sensitivity_level}` : null },
                                { label: 'Gender', value: c.complainant_gender || null },
                                { label: 'Location', value: c.location || null },
                                { label: 'Deadline', value: c.resolution_deadline ? format(parseISO(c.resolution_deadline), 'dd MMM yyyy') : null },
                              ].filter(({ value }) => value != null).map(({ label, value }) => (
                                <div key={label}>
                                  <span className="text-muted-foreground">{label}</span>
                                  <p className="font-medium capitalize mt-0.5">{value}</p>
                                </div>
                              ))}
                            </div>
                            {c.description && (
                              <p className="mt-3 text-xs text-muted-foreground border-t pt-2 line-clamp-3">{c.description}</p>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); router.push('/complaints'); }}
                              className="mt-2 text-xs text-orange-700 hover:underline font-medium"
                            >
                              Open full case →
                            </button>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────
// SECTION: REPORTING
// ─────────────────────────────────────────────
function ReportingSection() {
  const router = useRouter();
  const [data, setData] = useState<ReportingCompliance | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedProjectId, setExpandedProjectId] = useState<number | null>(null);

  useEffect(() => {
    api.get('/reporting/compliance/')
      .then((r) => setData(r.data))
      .catch((e) => console.error('reporting/compliance/', e))
      .finally(() => setLoading(false));
  }, []);

  const pieData = [
    { name: 'Submitted', value: data?.total_submitted ?? 0, color: C.ch2 },
    { name: 'Pending review', value: data?.total_pending_review ?? 0, color: C.ch1 },
    { name: 'Missing', value: data ? Math.max(0, data.total_schedules - data.total_submitted) : 0, color: C.ch4 },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard label="Reports scheduled" value={data?.total_schedules ?? '—'} icon={FileText}
          loading={loading} onClick={() => router.push('/reports')} />
        <MetricCard label="Reports submitted" value={data?.total_submitted ?? '—'} icon={CheckCircle2}
          subVariant="good" loading={loading} onClick={() => router.push('/reports')} />
        <MetricCard label="Compliance rate"
          value={data?.overall_compliance_rate != null ? fmtPct(data.overall_compliance_rate) : '—'}
          icon={TrendingUp}
          subVariant={data?.overall_compliance_rate != null
            ? (data.overall_compliance_rate >= 90 ? 'good' : data.overall_compliance_rate >= 70 ? 'warn' : 'bad')
            : 'neutral'}
          loading={loading} onClick={() => router.push('/reports')} />
        <MetricCard label="Pending review" value={data?.total_pending_review ?? '—'} icon={Clock}
          subVariant="warn" loading={loading} onClick={() => router.push('/reports')} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Compliance by project — rows navigate to project detail */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Compliance by project</CardTitle>
              <ViewLink label="All reports →" onClick={() => router.push('/reports')} />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)
              : !data?.projects?.filter((p) => p.total_schedules > 0).length
              ? <EmptyState message="No reporting schedules found." />
              : data.projects.filter((p) => p.total_schedules > 0).map((p) => (
                <div key={p.project_id}>
                  <div
                    className="space-y-1 cursor-pointer rounded-md px-1 py-1.5 hover:bg-muted/50 transition-colors"
                    onClick={() => setExpandedProjectId(expandedProjectId === p.project_id ? null : p.project_id)}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 font-mono font-medium">
                        <ChevronRight className={cn('h-3 w-3 text-muted-foreground transition-transform shrink-0', expandedProjectId === p.project_id && 'rotate-90')} />
                        {p.project_code}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">{p.submitted}/{p.total_schedules}</span>
                        {p.compliance_rate != null && achBadge(p.compliance_rate)}
                      </span>
                    </div>
                    <Progress value={p.compliance_rate ?? 0} className="h-1.5 ml-4"
                      indicatorClassName={
                        (p.compliance_rate ?? 0) === 100 ? 'bg-green-600'
                          : (p.compliance_rate ?? 0) >= 70 ? 'bg-orange-500' : 'bg-red-600'} />
                  </div>
                  {expandedProjectId === p.project_id && p.schedules.length > 0 && (
                    <div className="ml-4 mb-1 rounded-md border bg-muted/20 overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40">
                            <TableHead className="text-[10px] pl-3">Schedule</TableHead>
                            <TableHead className="text-[10px]">Frequency</TableHead>
                            <TableHead className="text-[10px]">Latest submission</TableHead>
                            <TableHead className="text-[10px] pr-3">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {p.schedules.map((s) => (
                            <TableRow
                              key={s.schedule_id}
                              className="cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={(e) => { e.stopPropagation(); router.push('/reports'); }}
                            >
                              <TableCell className="text-xs pl-3">{s.schedule_name}</TableCell>
                              <TableCell className="text-xs">{s.frequency}</TableCell>
                              <TableCell className="text-xs">
                                {s.latest_submission_date ? format(parseISO(s.latest_submission_date), 'dd MMM yyyy') : '—'}
                              </TableCell>
                              <TableCell className="pr-3">
                                {s.has_submission
                                  ? statusBadge(s.latest_submission_status?.toLowerCase().replace(/\s/g, '_') || 'completed')
                                  : <Badge className="bg-red-100 text-red-800 border-red-300 text-xs">Missing</Badge>}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <div className="px-3 py-1.5 border-t">
                        <button
                          onClick={(e) => { e.stopPropagation(); router.push(`/projects/${p.project_id}`); }}
                          className="text-xs text-orange-700 hover:underline font-medium"
                        >
                          Open project →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </CardContent>
        </Card>

        {/* Submission status pie — clicking navigates to reports */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Submission status breakdown</CardTitle>
              <ViewLink label="All reports →" onClick={() => router.push('/reports')} />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-48 w-full" />
              : pieData.length === 0 ? <EmptyState message="No data." /> : (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={72}
                        paddingAngle={3} dataKey="value" cursor="pointer"
                        onClick={() => router.push('/reports')}
                      >
                        {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip formatter={(v, n) => [`${v} reports`, n]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-1">
                    {pieData.map((s) => (
                      <span key={s.name} className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} />{s.name} ({s.value})
                      </span>
                    ))}
                  </div>
                </>
              )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────
function LayoutDashboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  );
}

export default function MeDashboardPage() {
  const [meStats, setMeStats]           = useState<MeStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [complaints, setComplaints]     = useState<any[]>([]);
  const [loadingComp, setLoadingComp]   = useState(true);
  const [lastRefresh, setLastRefresh]   = useState(new Date());
  // Controlled tab state so overview cards can switch tabs programmatically
  const [activeTab, setActiveTab]       = useState('overview');

  const loadAll = useCallback(() => {
    setLoadingStats(true);
    api.get('/dashboard/me-stats/')
      .then((r) => setMeStats(r.data))
      .catch((e) => console.error('me-stats/', e))
      .finally(() => setLoadingStats(false));

    setLoadingComp(true);
    // Backend returns a plain array (no DRF pagination configured)
    api.get('/complaints/complaints/', { params: { page_size: 200 } })
      .then((r) => setComplaints(Array.isArray(r.data) ? r.data : (r.data?.results ?? [])))
      .catch((e) => console.error('complaints/', e))
      .finally(() => setLoadingComp(false));
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  return (
    <AppLayout platform="ngo">
      <div className="space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: C.brown }}>
              M&amp;E Dashboard
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Monitoring &amp; Evaluation — all programs, projects, and field activities
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { setLastRefresh(new Date()); loadAll(); }} className="gap-2 text-xs">
            <RefreshCw className="h-3 w-3" />
            Refresh
            <span className="text-muted-foreground hidden sm:inline">· {format(lastRefresh, 'HH:mm')}</span>
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1 bg-muted p-1">
            <TabsTrigger value="overview"  className="text-xs gap-1.5"><LayoutDashboardIcon className="h-3 w-3" />Overview</TabsTrigger>
            <TabsTrigger value="strategic" className="text-xs gap-1.5"><Target className="h-3 w-3" />Strategic</TabsTrigger>
            <TabsTrigger value="programs"  className="text-xs gap-1.5"><FolderKanban className="h-3 w-3" />Programs</TabsTrigger>
            <TabsTrigger value="tasks"     className="text-xs gap-1.5"><Activity className="h-3 w-3" />Tasks</TabsTrigger>
            <TabsTrigger value="disagg"    className="text-xs gap-1.5"><Users className="h-3 w-3" />Disaggregation</TabsTrigger>
            <TabsTrigger value="fcrm"      className="text-xs gap-1.5"><MessageSquare className="h-3 w-3" />FCRM</TabsTrigger>
            <TabsTrigger value="reporting" className="text-xs gap-1.5"><FileText className="h-3 w-3" />Reporting</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewSection stats={meStats} loading={loadingStats} complaints={complaints} onTabChange={setActiveTab} />
          </TabsContent>
          <TabsContent value="strategic"><StrategicSection stats={meStats} /></TabsContent>
          <TabsContent value="programs"><ProgramsSection /></TabsContent>
          <TabsContent value="tasks"><TasksSection /></TabsContent>
          <TabsContent value="disagg"><DisaggSection /></TabsContent>
          <TabsContent value="fcrm"><FcrmSection complaints={complaints} loadingComplaints={loadingComp} /></TabsContent>
          <TabsContent value="reporting"><ReportingSection /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}