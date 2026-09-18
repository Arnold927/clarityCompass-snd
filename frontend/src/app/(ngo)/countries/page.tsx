'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/layout/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import {
  Home, ChevronRight, ChevronLeft, ChevronRightCircle, Plus, Pencil,
  Download, Building2, Coins, Users, Landmark, Calendar, Activity,
} from 'lucide-react';
import {
  mealApi, C, fmtDate, fmtNumber, flagEmoji, STATUS_LABELS,
  type Country, type CountryOverview, type ProjectListItem,
} from '@/lib/meal-api';
import { usePageTitle } from '@/components/meal/use-page-title';
import { ReachSummaryCards, StatusPill } from '@/components/meal/shared-cards';
import { useSortableData, SortableTableHead } from '@/components/meal/use-sortable-data';
import { usePagination, PaginationControls } from '@/components/meal/use-pagination';
import { TableFilterBar } from '@/components/meal/table-filter-bar';
import { ReachByYearChart, ReachByGenderDonut } from '@/components/meal/reach-charts';
import { CountryFormDialog } from '@/components/meal/country-form-dialog';
import { openBrandedReport } from '@/components/meal/export-report';

const PROJECT_STATUS_OPTIONS = Object.entries(STATUS_LABELS)
  .filter(([k]) => k !== 'ACTIVE' && k !== 'INACTIVE')
  .map(([value, label]) => ({ value, label }));

function CountryFlag({ isoCode, flag, className }: { isoCode: string; flag: string | null; className?: string }) {
  if (flag) {
    return <img src={flag} alt="" className={`object-cover rounded-sm ${className ?? ''}`} />;
  }
  return <span className={className}>{flagEmoji(isoCode)}</span>;
}

function InfoItem({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 mt-0.5 shrink-0" style={{ color: C.orange }} />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value ?? '—'}</p>
      </div>
    </div>
  );
}

function ProjectsTable({ projects, onOpen, showFilters = true }: { projects: ProjectListItem[]; onOpen: (id: number) => void; showFilters?: boolean }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const filtered = projects.filter(p =>
    (statusFilter === 'ALL' || p.status === statusFilter) &&
    p.name.toLowerCase().includes(search.toLowerCase())
  );
  const { sortedItems, sortKey, direction, requestSort } = useSortableData<ProjectListItem>(filtered);
  const pagination = usePagination(sortedItems, showFilters ? 10 : sortedItems.length || 1);

  return (
    <div>
      {showFilters && (
        <TableFilterBar
          search={search}
          onSearchChange={v => { setSearch(v); pagination.setPage(1); }}
          searchPlaceholder="Search projects..."
          searchLabel="Search projects"
          statusOptions={PROJECT_STATUS_OPTIONS}
          statusValue={statusFilter}
          onStatusChange={v => { setStatusFilter(v); pagination.setPage(1); }}
        />
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <SortableTableHead label="Project Name" sortKey="name" activeKey={sortKey} direction={direction} onSort={requestSort} />
            <TableHead>Donor(s)</TableHead>
            <TableHead>Lead Partner</TableHead>
            <SortableTableHead label="Start Date" sortKey="start_date" activeKey={sortKey} direction={direction} onSort={requestSort} />
            <SortableTableHead label="End Date" sortKey="end_date" activeKey={sortKey} direction={direction} onSort={requestSort} />
            <SortableTableHead label="Status" sortKey="status" activeKey={sortKey} direction={direction} onSort={requestSort} />
            <SortableTableHead label="People Reached" sortKey="total_reach" activeKey={sortKey} direction={direction} onSort={requestSort} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {pagination.pageItems.length === 0 && (
            <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">
              {projects.length === 0 ? 'No projects classified under this country yet.' : 'No projects match your filters.'}
            </TableCell></TableRow>
          )}
          {pagination.pageItems.map((p, idx) => (
            <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onOpen(p.id)}>
              <TableCell>{(pagination.page - 1) * 10 + idx + 1}</TableCell>
              <TableCell className="font-medium" style={{ color: C.orange }}>{p.name}</TableCell>
              <TableCell>{p.donors.map(d => d.name).join(', ') || '—'}</TableCell>
              <TableCell>{p.lead_partner?.name || '—'}</TableCell>
              <TableCell>{fmtDate(p.start_date)}</TableCell>
              <TableCell>{fmtDate(p.end_date)}</TableCell>
              <TableCell><StatusPill status={p.status} /></TableCell>
              <TableCell>{p.total_reach.toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {showFilters && (
        <PaginationControls
          page={pagination.page} totalPages={pagination.totalPages} totalItems={pagination.totalItems}
          pageSize={10} onPrev={pagination.prevPage} onNext={pagination.nextPage} onPage={pagination.setPage}
          itemLabel="projects"
        />
      )}
    </div>
  );
}

export default function CountriesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [countryList, setCountryList] = useState<Country[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [country, setCountry] = useState<Country | null>(null);
  usePageTitle(country ? `${country.name} | Countries | SND Africa MEAL` : 'Countries | SND Africa MEAL');
  const [overview, setOverview] = useState<CountryOverview | null>(null);
  const [countryProjects, setCountryProjects] = useState<ProjectListItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [tab, setTab] = useState('overview');
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const list = await mealApi.countries();
      setCountryList(list);
      const paramId = Number(searchParams.get('country'));
      const initial = list.find(c => c.id === paramId)?.id ?? list[0]?.id ?? null;
      setSelectedId(initial);
    } finally {
      setLoadingList(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  const loadDetail = useCallback(async (id: number) => {
    setLoadingDetail(true);
    try {
      const [c, o, projects] = await Promise.all([
        mealApi.country(id), mealApi.countryOverview(id), mealApi.projects({ country: id }),
      ]);
      setCountry(c);
      setOverview(o);
      setCountryProjects(projects);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId === null) { setCountry(null); setOverview(null); setCountryProjects([]); return; }
    loadDetail(selectedId);
    router.replace(`/countries?country=${selectedId}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const refreshCurrent = useCallback(() => {
    if (selectedId !== null) loadDetail(selectedId);
    loadList();
  }, [selectedId, loadDetail, loadList]);

  const currentIndex = countryList.findIndex(c => c.id === selectedId);
  const goPrev = () => { if (currentIndex > 0) setSelectedId(countryList[currentIndex - 1].id); };
  const goNext = () => { if (currentIndex >= 0 && currentIndex < countryList.length - 1) setSelectedId(countryList[currentIndex + 1].id); };
  const openProject = (id: number) => router.push(`/projects?project=${id}`);

  const exportReport = () => {
    if (!country || !overview) return;
    openBrandedReport({
      moduleLabel: 'Country',
      title: country.name,
      subtitle: country.description,
      metaItems: [
        { label: 'Region', value: country.region },
        { label: 'First Implementation', value: country.first_implementation_year },
        { label: 'Latest Activity', value: overview.latest_activity_year },
      ],
      kpis: [
        { label: 'Total Reached', value: fmtNumber(overview.total_people_reached.total) },
        { label: 'Male', value: fmtNumber(overview.total_people_reached.male) },
        { label: 'Female', value: fmtNumber(overview.total_people_reached.female) },
        { label: 'PWD', value: fmtNumber(overview.total_people_reached.pwd) },
        { label: 'Projects', value: overview.project_count },
      ],
      tables: [
        {
          title: `Projects in ${country.name}`,
          columns: ['Project', 'Donor(s)', 'Lead Partner', 'Start', 'End', 'Status', 'Reached'],
          rows: countryProjects.map(p => [
            p.name, p.donors.map(d => d.name).join(', '), p.lead_partner?.name ?? '—',
            fmtDate(p.start_date), fmtDate(p.end_date), STATUS_LABELS[p.status] ?? p.status, p.total_reach,
          ]),
        },
      ],
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link href="/dashboard" aria-label="Home" className="hover:text-foreground"><Home className="h-3.5 w-3.5" /></Link> <ChevronRight className="h-3.5 w-3.5" />
          <span>Countries</span> <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium">Country Details</span>
        </div>

        <Card>
          <CardContent className="p-4 flex flex-wrap items-end gap-3">
            <div className="min-w-[280px] flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Select Country</label>
              {loadingList ? <Skeleton className="h-9 w-full" /> : (
                <Select value={selectedId ? String(selectedId) : ''} onValueChange={v => setSelectedId(Number(v))}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select a country" /></SelectTrigger>
                  <SelectContent>
                    {countryList.map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        <span className="inline-flex items-center gap-2">
                          <CountryFlag isoCode={c.iso_code} flag={c.flag} className="w-5 h-3.5 text-base leading-none" />
                          {c.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <Button variant="outline" size="icon" onClick={goPrev} disabled={currentIndex <= 0} aria-label="Previous" title="Previous"><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" onClick={goNext} disabled={currentIndex < 0 || currentIndex >= countryList.length - 1} aria-label="Next" title="Next"><ChevronRightCircle className="h-4 w-4" /></Button>
            <Button variant="outline" onClick={() => { setFormMode('create'); setFormOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> New Country
            </Button>
          </CardContent>
        </Card>

        {!loadingList && countryList.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-sm text-muted-foreground mb-4">No countries yet. Add the first one to get started.</p>
              <Button onClick={() => { setFormMode('create'); setFormOpen(true); }} style={{ backgroundColor: C.orange }} className="text-white">
                <Plus className="h-4 w-4 mr-2" /> New Country
              </Button>
            </CardContent>
          </Card>
        ) : loadingDetail || !country || !overview ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <>
            <Card>
              <CardContent className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                      <CountryFlag isoCode={country.iso_code} flag={country.flag} className="w-full h-full text-4xl" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-xl font-bold" style={{ color: C.brown }}>{country.name}</h1>
                        <StatusPill status={country.status} />
                        <button
                          onClick={() => { setFormMode('edit'); setFormOpen(true); }}
                          className="text-muted-foreground hover:text-foreground"
                          title="Edit country details"
                          aria-label="Edit country details"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{country.description || 'No description yet.'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="outline" onClick={exportReport}>
                      <Download className="h-4 w-4 mr-2" /> Export Report
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-5 pt-5 border-t">
                  <InfoItem icon={Building2} label="Total Projects" value={overview.project_count} />
                  <InfoItem icon={Coins} label="Donor Partners" value={overview.donor_count} />
                  <InfoItem icon={Users} label="Lead Partners" value={overview.lead_partner_count} />
                  <InfoItem icon={Landmark} label="Thematic Areas" value={overview.thematic_area_count} />
                  <InfoItem icon={Calendar} label="First Implementation" value={country.first_implementation_year} />
                  <InfoItem icon={Activity} label="Latest Activity" value={overview.latest_activity_year} />
                </div>
              </CardContent>
            </Card>

            <Tabs value={tab} onValueChange={setTab}>
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="projects">Projects</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-4">
                <ReachSummaryCards
                  totalLabel={`Total People Reached in ${country.name}`}
                  trendPct={overview.reach_change_pct}
                  total={overview.total_people_reached.total}
                  male={overview.total_people_reached.male} malePct={overview.total_people_reached.male_pct}
                  female={overview.total_people_reached.female} femalePct={overview.total_people_reached.female_pct}
                  pwd={overview.total_people_reached.pwd} pwdPct={overview.total_people_reached.pwd_pct}
                />

                <div className="grid lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader><CardTitle className="text-base">Reach by Year</CardTitle></CardHeader>
                    <CardContent><ReachByYearChart data={overview.reach_by_year} /></CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-base">Reach by Gender and PWD</CardTitle></CardHeader>
                    <CardContent>
                      <ReachByGenderDonut
                        male={overview.total_people_reached.male}
                        female={overview.total_people_reached.female}
                        pwd={overview.total_people_reached.pwd}
                      />
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">Projects in {country.name}</CardTitle>
                    <button className="text-xs font-medium" style={{ color: C.orange }} onClick={() => setTab('projects')}>View All →</button>
                  </CardHeader>
                  <CardContent><ProjectsTable projects={countryProjects.slice(0, 5)} onOpen={openProject} showFilters={false} /></CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-base">Country Information</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-2 gap-y-2 text-sm">
                    <span className="text-muted-foreground">Country</span><span>{country.name}</span>
                    <span className="text-muted-foreground">Region</span><span>{country.region || '—'}</span>
                    <span className="text-muted-foreground">Total Projects</span><span>{overview.project_count}</span>
                    <span className="text-muted-foreground">Donor Partners</span><span>{overview.donor_count}</span>
                    <span className="text-muted-foreground">Lead Partners</span><span>{overview.lead_partner_count}</span>
                    <span className="text-muted-foreground">Thematic Areas</span><span>{overview.thematic_area_count}</span>
                    <span className="text-muted-foreground">First Implementation</span><span>{country.first_implementation_year ?? '—'}</span>
                    <span className="text-muted-foreground">Latest Activity</span><span>{overview.latest_activity_year ?? '—'}</span>
                    <span className="text-muted-foreground">Main Thematic Areas</span>
                    <span>{overview.main_thematic_areas.length > 0 ? overview.main_thematic_areas.join(', ') : '—'}</span>
                    <span className="text-muted-foreground">Notes</span><span>{country.notes || '—'}</span>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="projects" className="mt-4">
                <Card>
                  <CardContent className="p-4">
                    <ProjectsTable projects={countryProjects} onOpen={openProject} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}

        <CountryFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          country={formMode === 'edit' ? country : null}
          onSaved={refreshCurrent}
        />
      </div>
    </AppLayout>
  );
}
