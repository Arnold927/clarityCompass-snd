'use client';

import React, { useEffect, useState, useCallback } from 'react';
import AppLayout from '@/components/layout/app-layout';
import { usePageTitle } from '@/components/meal/use-page-title';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Users, FolderKanban, Coins, Globe, Layers, Filter, Mars, Venus, Accessibility,
  UserCheck, ShieldCheck, BookOpen, Droplet, Target,
} from 'lucide-react';
import {
  mealApi, C, fmtNumber,
  type DashboardOverview, type DashboardFilters,
  type Country, type Donor, type LeadPartner, type ThematicFocus, type ProjectListItem,
} from '@/lib/meal-api';
import { StatusBreakdownCard } from '@/components/meal/shared-cards';

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: React.ReactNode; color: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}22` }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold leading-tight" style={{ color: C.brown }}>{value}</p>
          <p className="text-xs text-muted-foreground truncate">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ReachCard({ label, value, pct, color, icon: Icon }: { label: string; value: number; pct?: number; color: string; icon: any }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}22` }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium mb-0.5 truncate" style={{ color }}>{label}</p>
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

  const applyFilters = () => setFilters(pendingFilters);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: C.brown }}>SND Africa — MEAL Dashboard</h1>
          <p className="text-sm text-muted-foreground">Monitoring, Evaluation, Accountability and Learning</p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4 flex flex-wrap items-end gap-3">
            <FilterSelect label="Country" value={pendingFilters.country} onChange={v => setPendingFilters(f => ({ ...f, country: v }))}
              options={countries.map(c => ({ value: c.id, label: c.name }))} />
            <FilterSelect label="Donor" value={pendingFilters.donor} onChange={v => setPendingFilters(f => ({ ...f, donor: v }))}
              options={donors.map(d => ({ value: d.id, label: d.name }))} />
            <FilterSelect label="Lead Partner" value={pendingFilters.lead_partner} onChange={v => setPendingFilters(f => ({ ...f, lead_partner: v }))}
              options={partners.map(p => ({ value: p.id, label: p.name }))} />
            <FilterSelect label="Thematic Focus" value={pendingFilters.thematic_focus} onChange={v => setPendingFilters(f => ({ ...f, thematic_focus: v }))}
              options={thematic.map(t => ({ value: t.id, label: t.name }))} />
            <FilterSelect label="Project" value={pendingFilters.project} onChange={v => setPendingFilters(f => ({ ...f, project: v }))}
              options={projects.map(p => ({ value: p.id, label: p.name }))} />
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
              <StatCard icon={Users} label="Total People Reached" value={fmtNumber(data.total_people_reached.total)} color={C.orange} />
              <StatCard icon={FolderKanban} label="Active Projects" value={data.active_projects} color={C.green} />
              <StatCard icon={Coins} label="Donors" value={data.donor_count} color={C.blue} />
              <StatCard icon={Globe} label="Countries" value={data.country_count} color={C.pink} />
              <StatCard icon={Users} label="Lead Partners" value={data.lead_partner_count} color={C.muted} />
              <StatCard icon={Layers} label="Thematic Areas" value={data.thematic_area_count} color={C.red} />
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

function FilterSelect({ label, value, onChange, options }: {
  label: string; value?: number; onChange: (v: number | undefined) => void;
  options: { value: number; label: string }[];
}) {
  return (
    <div className="min-w-[160px]">
      <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
      <Select
        value={value?.toString() ?? 'all'}
        onValueChange={v => onChange(v === 'all' ? undefined : Number(v))}
      >
        <SelectTrigger className="h-9"><SelectValue placeholder={`All ${label}`} /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All {label}s</SelectItem>
          {options.map(o => (
            <SelectItem key={o.value} value={o.value.toString()}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
