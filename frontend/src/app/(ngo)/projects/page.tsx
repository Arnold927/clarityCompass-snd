'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { usePageTitle } from '@/components/meal/use-page-title';
import AppLayout from '@/components/layout/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Tooltip as UiTooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import {
  Home, ChevronRight, ChevronLeft, ChevronRightCircle, Plus, Pencil, ArrowLeft,
  Download, Globe, Coins, Users, Layers, Calendar, Wallet, Image as ImageIcon,
} from 'lucide-react';
import {
  mealApi, C, fmtNumber, fmtDate, STATUS_LABELS,
  type Project, type ProjectListItem, type ProjectOverview,
  type Country, type Donor, type LeadPartner, type ThematicFocus,
} from '@/lib/meal-api';
import { ReachSummaryCards, StatusBreakdownCard, StatusPill, InfoItem } from '@/components/meal/shared-cards';
import { useSortableData, SortableTableHead } from '@/components/meal/use-sortable-data';
import { usePagination, PaginationControls } from '@/components/meal/use-pagination';
import { TableFilterBar } from '@/components/meal/table-filter-bar';
import { ActivityManager } from '@/components/meal/activity-manager';
import { IndicatorManager } from '@/components/meal/indicator-manager';
import { DocumentManager } from '@/components/meal/document-manager';
import { ProjectFormDialog } from '@/components/meal/project-form-dialog';
import { openBrandedReport } from '@/components/meal/export-report';

const PROJECT_STATUS_OPTIONS = Object.entries(STATUS_LABELS)
  .filter(([k]) => k !== 'ACTIVE' && k !== 'INACTIVE')
  .map(([value, label]) => ({ value, label }));

function InfoLinkList({ icon: Icon, label, items }: { icon: any; label: string; items: { id: number; name: string; href: string }[] }) {
  const fullText = items.map(it => it.name).join(', ');
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 mt-0.5 shrink-0" style={{ color: C.orange }} />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        {items.length === 0 ? (
          <p className="text-sm font-medium">—</p>
        ) : (
          <UiTooltip>
            <TooltipTrigger asChild>
              <p className="text-sm font-medium truncate">
                {items.map((it, idx) => (
                  <React.Fragment key={it.id}>
                    {idx > 0 && ', '}
                    <Link href={it.href} className="hover:underline" style={{ color: C.orange }}>{it.name}</Link>
                  </React.Fragment>
                ))}
              </p>
            </TooltipTrigger>
            <TooltipContent>{fullText}</TooltipContent>
          </UiTooltip>
        )}
      </div>
    </div>
  );
}

function ProjectListView({ projects, loading, onOpen, onNew }: {
  projects: ProjectListItem[]; loading: boolean; onOpen: (id: number) => void; onNew: () => void;
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const filtered = projects.filter(p =>
    (statusFilter === 'ALL' || p.status === statusFilter) &&
    p.name.toLowerCase().includes(search.toLowerCase())
  );
  const { sortedItems, sortKey, direction, requestSort } = useSortableData<ProjectListItem>(filtered);
  const pagination = usePagination(sortedItems, 10);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold" style={{ color: C.brown }}>Projects</h1>
          <Button onClick={onNew} style={{ backgroundColor: C.orange }} className="text-white">
            <Plus className="h-4 w-4 mr-2" /> New Project
          </Button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : (
          <>
            <TableFilterBar
              search={search}
              onSearchChange={v => { setSearch(v); pagination.setPage(1); }}
              searchPlaceholder="Search projects..."
              searchLabel="Search projects"
              statusOptions={PROJECT_STATUS_OPTIONS}
              statusValue={statusFilter}
              onStatusChange={v => { setStatusFilter(v); pagination.setPage(1); }}
            />
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead label="Project Name" sortKey="name" activeKey={sortKey} direction={direction} onSort={requestSort} />
                    <TableHead>Countries</TableHead>
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
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      {projects.length === 0 ? 'No projects yet. Create the first one to get started.' : 'No projects match your filters.'}
                    </TableCell></TableRow>
                  )}
                  {pagination.pageItems.map(p => (
                    <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onOpen(p.id)}>
                      <TableCell className="font-medium" style={{ color: C.orange }}>{p.name}</TableCell>
                      <TableCell>{p.countries.map(c => c.name).join(', ') || '—'}</TableCell>
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
            </div>
            <PaginationControls
              page={pagination.page} totalPages={pagination.totalPages} totalItems={pagination.totalItems}
              pageSize={10} onPrev={pagination.prevPage} onNext={pagination.nextPage} onPage={pagination.setPage}
              itemLabel="projects"
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function ProjectsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [projectList, setProjectList] = useState<ProjectListItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [overview, setOverview] = useState<ProjectOverview | null>(null);
  usePageTitle(project ? `${project.name} | Projects | SND Africa MEAL` : 'Projects | SND Africa MEAL');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [tab, setTab] = useState('overview');
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

  // Lookups for the Edit/New Project form
  const [countries, setCountries] = useState<Country[]>([]);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [leadPartners, setLeadPartners] = useState<LeadPartner[]>([]);
  const [thematicFocusAreas, setThematicFocusAreas] = useState<ThematicFocus[]>([]);

  useEffect(() => {
    Promise.all([mealApi.countries(), mealApi.donors(), mealApi.leadPartners(), mealApi.thematicFocusAreas()])
      .then(([c, d, p, t]) => { setCountries(c); setDonors(d); setLeadPartners(p); setThematicFocusAreas(t); })
      .catch(() => {});
  }, []);

  // The list is the default landing view: selectedId stays null unless the
  // URL explicitly names a project, rather than auto-picking the first one.
  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const list = await mealApi.projects();
      setProjectList(list);
      const paramId = Number(searchParams.get('project'));
      const initial = list.find(p => p.id === paramId)?.id ?? null;
      setSelectedId(initial);
      const paramTab = searchParams.get('tab');
      if (paramTab) setTab(paramTab);
    } finally {
      setLoadingList(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  const loadDetail = useCallback(async (id: number) => {
    setLoadingDetail(true);
    try {
      const [p, o] = await Promise.all([mealApi.project(id), mealApi.projectOverview(id)]);
      setProject(p);
      setOverview(o);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId === null) {
      setProject(null);
      setOverview(null);
      return;
    }
    loadDetail(selectedId);
    router.replace(`/projects?project=${selectedId}&tab=${tab}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const handleTabChange = (newTab: string) => {
    setTab(newTab);
    if (selectedId !== null) router.replace(`/projects?project=${selectedId}&tab=${newTab}`);
  };

  const refreshCurrent = useCallback(() => {
    if (selectedId !== null) loadDetail(selectedId);
    loadList();
  }, [selectedId, loadDetail, loadList]);

  const backToList = () => {
    setSelectedId(null);
    router.push('/projects');
  };

  const currentIndex = projectList.findIndex(p => p.id === selectedId);
  const goPrev = () => { if (currentIndex > 0) setSelectedId(projectList[currentIndex - 1].id); };
  const goNext = () => { if (currentIndex >= 0 && currentIndex < projectList.length - 1) setSelectedId(projectList[currentIndex + 1].id); };

  const exportReport = () => {
    if (!project || !overview) return;
    openBrandedReport({
      moduleLabel: 'Project',
      title: project.name,
      subtitle: project.description,
      metaItems: [
        { label: 'Status', value: STATUS_LABELS[project.status] ?? project.status },
        { label: 'Start', value: fmtDate(project.start_date) },
        { label: 'End', value: fmtDate(project.end_date) },
      ],
      kpis: [
        { label: 'Total People Reached', value: fmtNumber(overview.total_people_reached.total) },
        { label: `Male (${overview.total_people_reached.male_pct}%)`, value: fmtNumber(overview.total_people_reached.male) },
        { label: `Female (${overview.total_people_reached.female_pct}%)`, value: fmtNumber(overview.total_people_reached.female) },
        { label: `PWD (${overview.total_people_reached.pwd_pct}%)`, value: fmtNumber(overview.total_people_reached.pwd) },
      ],
      tables: [
        {
          title: 'Activities',
          columns: ['Activity', 'Target', 'Reach', 'Male', 'Female', 'PWD', 'Status'],
          rows: project.activities.map(a => [a.name, a.target, a.reach, a.reach_male, a.reach_female, a.reach_pwd, STATUS_LABELS[a.status] ?? a.status]),
        },
        {
          title: 'Indicators',
          columns: ['Indicator', 'Target', 'Achievement', 'Unit', 'Reporting Period'],
          rows: project.indicators.map(i => [i.name, i.target ?? '—', i.achievement, i.unit, i.reporting_period]),
        },
      ],
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link href="/dashboard" aria-label="Home" className="hover:text-foreground"><Home className="h-3.5 w-3.5" /></Link> <ChevronRight className="h-3.5 w-3.5" />
          {selectedId === null ? (
            <span className="text-foreground font-medium">Projects</span>
          ) : (
            <>
              <button onClick={backToList} className="hover:text-foreground hover:underline">Projects</button>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-foreground font-medium">Project Details</span>
            </>
          )}
        </div>

        {selectedId === null ? (
          <ProjectListView
            projects={projectList}
            loading={loadingList}
            onOpen={id => setSelectedId(id)}
            onNew={() => { setFormMode('create'); setFormOpen(true); }}
          />
        ) : (
          <>
            {/* Selector row */}
            <Card>
              <CardContent className="p-4 flex flex-wrap items-end gap-3">
                <Button variant="outline" onClick={backToList} aria-label="Back to all projects">
                  <ArrowLeft className="h-4 w-4 mr-2" /> All Projects
                </Button>
                <div className="min-w-[280px] flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">Select Project</label>
                  <Select value={selectedId ? String(selectedId) : ''} onValueChange={v => setSelectedId(Number(v))}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select a project" /></SelectTrigger>
                    <SelectContent>
                      {projectList.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" size="icon" onClick={goPrev} disabled={currentIndex <= 0} aria-label="Previous" title="Previous"><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" onClick={goNext} disabled={currentIndex < 0 || currentIndex >= projectList.length - 1} aria-label="Next" title="Next"><ChevronRightCircle className="h-4 w-4" /></Button>
              </CardContent>
            </Card>

            {loadingDetail || !project || !overview ? (
              <div className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            ) : (
              <>
                {/* Title card */}
                <Card>
                  <CardContent className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex items-start gap-4 min-w-0">
                        <div className="h-16 w-16 rounded-lg overflow-hidden bg-muted flex items-center justify-center shrink-0">
                          {project.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={project.image} alt={project.name} className="h-full w-full object-cover" />
                          ) : <ImageIcon className="h-6 w-6 text-muted-foreground" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-xl font-bold" style={{ color: C.brown }}>{project.name}</h1>
                            <StatusPill status={project.status} />
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{project.description}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button variant="outline" onClick={() => { setFormMode('edit'); setFormOpen(true); }}>
                          <Pencil className="h-4 w-4 mr-2" /> Edit Project
                        </Button>
                        <Button variant="outline" onClick={exportReport}>
                          <Download className="h-4 w-4 mr-2" /> Export Report
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mt-5 pt-5 border-t">
                      <InfoLinkList icon={Globe} label="Countries" items={project.countries.map(c => ({ id: c.id, name: c.name, href: `/countries?country=${c.id}` }))} />
                      <InfoLinkList icon={Coins} label="Donor(s)" items={project.donors.map(d => ({ id: d.id, name: d.name, href: `/donors?donor=${d.id}` }))} />
                      <InfoLinkList icon={Users} label="Lead Partner" items={project.lead_partner ? [{ id: project.lead_partner.id, name: project.lead_partner.name, href: `/lead-partners?partner=${project.lead_partner.id}` }] : []} />
                      <InfoLinkList icon={Layers} label="Thematic Focus" items={project.thematic_focus.map(t => ({ id: t.id, name: t.name, href: `/thematic-focus?area=${t.id}` }))} />
                      <InfoItem icon={Calendar} label="Start Date" value={fmtDate(project.start_date)} />
                      <InfoItem icon={Calendar} label="End Date" value={fmtDate(project.end_date)} />
                      <InfoItem icon={Wallet} label="Duration" value={`${project.duration_years} years`} />
                    </div>
                  </CardContent>
                </Card>

                <Tabs value={tab} onValueChange={handleTabChange}>
                  <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="activities">Activities</TabsTrigger>
                    <TabsTrigger value="indicators">Indicators</TabsTrigger>
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-4 mt-4">
                    <ReachSummaryCards
                      total={overview.total_people_reached.total}
                      male={overview.total_people_reached.male} malePct={overview.total_people_reached.male_pct}
                      female={overview.total_people_reached.female} femalePct={overview.total_people_reached.female_pct}
                      pwd={overview.total_people_reached.pwd} pwdPct={overview.total_people_reached.pwd_pct}
                    />

                    <div className="grid lg:grid-cols-2 gap-4">
                      <StatusBreakdownCard title="Activity Status" data={overview.activity_status} />

                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                          <CardTitle className="text-base">Project Key Indicators</CardTitle>
                          <button className="text-xs font-medium" style={{ color: C.orange }} onClick={() => handleTabChange('indicators')}>View All →</button>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader><TableRow><TableHead>Indicator</TableHead><TableHead>Target</TableHead><TableHead>Achievement</TableHead><TableHead>%</TableHead></TableRow></TableHeader>
                            <TableBody>
                              {overview.indicators.slice(0, 5).map(i => (
                                <TableRow key={i.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/indicators/project/${i.id}`)}>
                                  <TableCell className="font-medium" style={{ color: C.orange }}>{i.name}</TableCell>
                                  <TableCell>{i.target !== null ? fmtNumber(i.target) : '—'}</TableCell>
                                  <TableCell>{fmtNumber(i.achievement)}</TableCell>
                                  <TableCell>{i.percentage_achievement !== null ? `${i.percentage_achievement}%` : '—'}</TableCell>
                                </TableRow>
                              ))}
                              {overview.indicators.length === 0 && (
                                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">No indicators yet.</TableCell></TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-base">Project Activities</CardTitle>
                        <button className="text-xs font-medium" style={{ color: C.orange }} onClick={() => handleTabChange('activities')}>View All →</button>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader><TableRow><TableHead>Activity</TableHead><TableHead>Target</TableHead><TableHead>Reach</TableHead><TableHead>Male</TableHead><TableHead>Female</TableHead><TableHead>PWD</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                          <TableBody>
                            {project.activities.map(a => (
                              <TableRow key={a.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/activities/${a.id}`)}>
                                <TableCell className="font-medium" style={{ color: C.orange }}>{a.name}</TableCell>
                                <TableCell>{fmtNumber(a.target)}</TableCell>
                                <TableCell>{fmtNumber(a.reach)}</TableCell>
                                <TableCell>{fmtNumber(a.reach_male)}</TableCell>
                                <TableCell>{fmtNumber(a.reach_female)}</TableCell>
                                <TableCell>{fmtNumber(a.reach_pwd)}</TableCell>
                                <TableCell><StatusPill status={a.status} /></TableCell>
                              </TableRow>
                            ))}
                            {project.activities.length === 0 && (
                              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-4">No activities yet.</TableCell></TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>

                    <div className="grid lg:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader><CardTitle className="text-base">Project Description</CardTitle></CardHeader>
                        <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{project.description || 'No description provided.'}</p></CardContent>
                      </Card>
                      <Card>
                        <CardHeader><CardTitle className="text-base">Quick Information</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-2 gap-y-2 text-sm">
                          <span className="text-muted-foreground">Project Code</span><span>{project.project_code || '—'}</span>
                          <span className="text-muted-foreground">Status</span><span><StatusPill status={project.status} /></span>
                          <span className="text-muted-foreground">Budget</span><span>{project.budget ? `${project.currency} ${fmtNumber(project.budget)}` : '—'}</span>
                          <span className="text-muted-foreground">Start Date</span><span>{fmtDate(project.start_date)}</span>
                          <span className="text-muted-foreground">End Date</span><span>{fmtDate(project.end_date)}</span>
                          <span className="text-muted-foreground">Duration</span><span>{project.duration_years} years</span>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="activities" className="mt-4">
                    <ActivityManager
                      activities={project.activities}
                      onCreate={async (values) => { await mealApi.addActivity(project.id, values); refreshCurrent(); }}
                      onUpdate={async (id, values) => { await mealApi.updateActivity(id, values); refreshCurrent(); }}
                    />
                  </TabsContent>

                  <TabsContent value="indicators" className="mt-4">
                    <IndicatorManager
                      title="Project Indicators"
                      kind="project"
                      indicators={project.indicators}
                      onCreate={async (values) => { await mealApi.addProjectIndicator(project.id, values); refreshCurrent(); }}
                      onUpdate={async (id, values) => { await mealApi.updateProjectIndicator(id, values); refreshCurrent(); }}
                    />
                  </TabsContent>

                  <TabsContent value="documents" className="mt-4">
                    <DocumentManager
                      kind="project"
                      documents={project.documents}
                      onUpload={async (title, file) => { await mealApi.addDocument(project.id, title, file); refreshCurrent(); }}
                      onDelete={async (id) => { await mealApi.deleteDocument(id); refreshCurrent(); }}
                    />
                  </TabsContent>
                </Tabs>
              </>
            )}
          </>
        )}

        <ProjectFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          project={formMode === 'edit' ? project : null}
          countries={countries}
          donors={donors}
          leadPartners={leadPartners}
          thematicFocusAreas={thematicFocusAreas}
          onSaved={refreshCurrent}
        />
      </div>
    </AppLayout>
  );
}