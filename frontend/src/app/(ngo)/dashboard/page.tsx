'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import AppLayout from '@/components/layout/app-layout';
import { usePageTitle } from '@/components/meal/use-page-title';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Users, FolderKanban, Coins, Globe, Layers, Filter, Mars, Venus, Accessibility,
  UserCheck, ShieldCheck, BookOpen, Droplet, Target, Download,
} from 'lucide-react';
import {
  mealApi, C, fmtNumber,
  type DashboardOverview, type DashboardFilters,
  type Country, type Donor, type LeadPartner, type ThematicFocus, type ProjectListItem,
} from '@/lib/meal-api';
import { StatusBreakdownCard } from '@/components/meal/shared-cards';
import { FilterSelect, DateRangeFilter } from '@/components/meal/filter-controls';
import { Sparkline, ReachByYearChart, ReachByCountryBars } from '@/components/meal/reach-charts';
import { NeedsAttentionCard } from '@/components/meal/attention-and-comparison';
import { openBrandedReport } from '@/components/meal/export-report';

function StatCard({ icon: Icon, label, value, color, href, sparklineData }: { icon: any; label: string; value: React.ReactNode; color: string; href?: string; sparklineData?: { year: number; reach: number }[] }) {
  const content = (
    <Card className={href ? 'hover:shadow-md hover:border-current transition-all' : undefined}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}22` }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-bold leading-tight" style={{ color: C.brown }}>{value}</p>
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="text-xs text-muted-foreground truncate">{label}</p>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
          </Tooltip>
        </div>
        {sparklineData && sparklineData.length >= 2 && (
          <div className="w-16 shrink-0">
            <Sparkline data={sparklineData} color={color} height={36} />
          </div>
        )}
      </CardContent>
    </Card>
  );
  return href ? <Link href={href} className="block">{content}</Link> : content;
}

function ReachCard({ label, value, pct, color, icon: Icon }: { label: string; value: number; pct?: number; color: string; icon: any }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}22` }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <div className="min-w-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="text-xs font-medium mb-0.5 truncate" style={{ color }}>{label}</p>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
          </Tooltip>
          <p className="text-2xl font-bold leading-tight" style={{ color: C.brown }}>{fmtNumber(value)}</p>
          {pct !== undefined && <p className="text-xs text-muted-foreground">{pct}%</p>}
        </div>
      </CardContent>
    </Card>
  );
}

const ACHIEVEMENT_ICONS = [ShieldCheck, Droplet, BookOpen, UserCheck, Target];

export default function DashboardPage() {
  usePageTitle('Dashboard | SND Africa MEAL');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardOverview | null>(null);

  const [countries, setCountries] = useState<Country[]>([]);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [partners, setPartners] = useState<LeadPartner[]>([]);
  const [thematic, setThematic] = useState<ThematicFocus[]>([]);
  const [projects, setProjects] = useState<ProjectListItem[]>([]);

  const [filters, setFilters] = useState<DashboardFilters>({});
  const [pendingFilters, setPendingFilters] = useState<DashboardFilters>({});
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  useEffect(() => {
    Promise.all([
      mealApi.countries(), mealApi.donors(), mealApi.leadPartners(),
      mealApi.thematicFocusAreas(), mealApi.projects(),
    ]).then(([c, d, p, t, pr]) => {
      setCountries(c); setDonors(d); setPartners(p); setThematic(t); setProjects(pr);
    }).catch(() => {});
  }, []);

  const load = useCallback((f: DashboardFilters) => {
    setLoading(true);
    mealApi.dashboard(f).then(setData).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(filters); }, [filters, load]);

  const applyFilters = () => setFilters({
    ...pendingFilters,
    start_after: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
    end_before: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
  });

  const exportPortfolioReport = () => {
    if (!data) return;
    openBrandedReport({
      moduleLabel: 'Portfolio',
      title: 'SND Africa — Portfolio Report',
      subtitle: dateRange?.from
        ? `Filtered view${dateRange.to ? ` · ${format(dateRange.from, 'MMM d, yyyy')} – ${format(dateRange.to, 'MMM d, yyyy')}` : ` · from ${format(dateRange.from, 'MMM d, yyyy')}`}`
        : 'Full portfolio, no filters applied',
      kpis: [
        { label: 'Total People Reached', value: fmtNumber(data.total_people_reached.total) },
        { label: 'Active Projects', value: data.active_projects },
        { label: 'Donors', value: data.donor_count },
        { label: 'Countries', value: data.country_count },
        { label: 'Lead Partners', value: data.lead_partner_count },
        { label: 'Thematic Areas', value: data.thematic_area_count },
      ],
      tables: [
        {
          title: 'Reach by Country',
          columns: ['Country', 'Total Reach', 'Male', 'Female', 'PWD'],
          rows: data.reach_by_country.map(r => [r.country, r.reach, r.male, r.female, r.pwd]),
        },
        {
          title: 'Key Achievements',
          columns: ['Indicator', 'Target', 'Achievement', 'Unit', '%'],
          rows: data.key_achievements.map(a => [a.name, a.target ?? '—', a.achievement, a.unit, a.percentage_achievement !== null ? `${a.percentage_achievement}%` : '—']),
        },
      ],
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: C.brown }}>SND Africa — MEAL Dashboard</h1>
            <p className="text-sm text-muted-foreground">Monitoring, Evaluation, Accountability and Learning</p>
          </div>
          <Button variant="outline" onClick={exportPortfolioReport} disabled={!data}>
            <Download className="h-4 w-4 mr-2" /> Export Portfolio Report
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4 flex flex-wrap items-end gap-3">
            <FilterSelect label="Country" pluralLabel="Countries" value={pendingFilters.country} onChange={v => setPendingFilters(f => ({ ...f, country: v }))}
              options={countries.map(c => ({ value: c.id, label: c.name }))} />
            <FilterSelect label="Donor" value={pendingFilters.donor} onChange={v => setPendingFilters(f => ({ ...f, donor: v }))}
              options={donors.map(d => ({ value: d.id, label: d.name }))} />
            <FilterSelect label="Lead Partner" value={pendingFilters.lead_partner} onChange={v => setPendingFilters(f => ({ ...f, lead_partner: v }))}
              options={partners.map(p => ({ value: p.id, label: p.name }))} />
            <FilterSelect label="Thematic Focus" pluralLabel="Thematic Areas" value={pendingFilters.thematic_focus} onChange={v => setPendingFilters(f => ({ ...f, thematic_focus: v }))}
              options={thematic.map(t => ({ value: t.id, label: t.name }))} />
            <FilterSelect label="Project" value={pendingFilters.project} onChange={v => setPendingFilters(f => ({ ...f, project: v }))}
              options={projects.map(p => ({ value: p.id, label: p.name }))} />
            <DateRangeFilter range={dateRange} onChange={setDateRange} />
            <Button onClick={applyFilters} style={{ backgroundColor: C.orange }} className="text-white">
              <Filter className="h-4 w-4 mr-2" /> Apply Filters
            </Button>
          </CardContent>
        </Card>

        {loading || !data ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
        ) : (
          <>
            {/* KPI row */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <StatCard icon={Users} label="Total People Reached" value={fmtNumber(data.total_people_reached.total)} color={C.orange} sparklineData={data.reach_by_year} />
              <StatCard icon={FolderKanban} label="Active Projects" value={data.active_projects} color={C.green} href="/projects" />
              <StatCard icon={Coins} label="Donors" value={data.donor_count} color={C.blue} href="/donors" />
              <StatCard icon={Globe} label="Countries" value={data.country_count} color={C.pink} href="/countries" />
              <StatCard icon={Users} label="Lead Partners" value={data.lead_partner_count} color={C.muted} href="/lead-partners" />
              <StatCard icon={Layers} label="Thematic Areas" value={data.thematic_area_count} color={C.red} href="/thematic-focus" />
            </div>

            {/* Reach + Activity status */}
            <div className="grid lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Total Reach and Disaggregation</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
                  <ReachCard label="People Reached" value={data.total_people_reached.total} color={C.orange} icon={Users} />
                  <ReachCard label="Male" value={data.total_people_reached.male} pct={data.total_people_reached.male_pct} color={C.blue} icon={Mars} />
                  <ReachCard label="Female" value={data.total_people_reached.female} pct={data.total_people_reached.female_pct} color={C.pink} icon={Venus} />
                  <ReachCard label="PWD" value={data.total_people_reached.pwd} pct={data.total_people_reached.pwd_pct} color={C.green} icon={Accessibility} />
                </CardContent>
              </Card>

              <StatusBreakdownCard title="Project Activity Status" data={data.project_status} />
            </div>

            {/* Portfolio-wide reach charts */}
            <div className="grid lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Reach by Year (Portfolio-wide)</CardTitle></CardHeader>
                <CardContent><ReachByYearChart data={data.reach_by_year} /></CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Reach by Country (Portfolio-wide)</CardTitle></CardHeader>
                <CardContent><ReachByCountryBars data={data.reach_by_country} /></CardContent>
              </Card>
            </div>

            <NeedsAttentionCard items={data.needs_attention} indicatorKind="project" title="Needs Attention (across this selection)" />

            {/* Key achievements */}
            <Card>
              <CardHeader><CardTitle className="text-base">Key Achievements</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {data.key_achievements.length === 0 && (
                  <p className="text-sm text-muted-foreground col-span-full">No project indicators reported yet for this selection.</p>
                )}
                {data.key_achievements.map((a, i) => {
                  const Icon = ACHIEVEMENT_ICONS[i % ACHIEVEMENT_ICONS.length];
                  const pct = a.percentage_achievement ?? 0;
                  return (
                    <div key={i} className="rounded-lg border p-4">
                      <Icon className="h-5 w-5 mb-2" style={{ color: C.orange }} />
                      <p className="text-2xl font-bold" style={{ color: C.brown }}>{fmtNumber(a.achievement)}</p>
                      <p className="text-xs text-muted-foreground mb-2">{a.name}</p>
                      {a.target !== null && (
                        <>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: C.green }} />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{pct}% · Target: {fmtNumber(a.target)}</p>
                        </>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}