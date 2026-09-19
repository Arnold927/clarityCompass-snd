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
  Home, ChevronRight, ChevronLeft, ChevronRightCircle, Plus, Pencil, ArrowLeft,
  Download, Globe, Coins, Calendar, Building2, Landmark, Image as ImageIcon,
} from 'lucide-react';
import {
  mealApi, C, fmtDate, fmtNumber, STATUS_LABELS,
  type LeadPartner, type PortfolioOverview, type ProjectListItem,
} from '@/lib/meal-api';
import { usePageTitle } from '@/components/meal/use-page-title';
import { ReachSummaryCards, StatusBreakdownCard, StatusPill, IndicatorCard, InfoItem } from '@/components/meal/shared-cards';
import { ReachByCountryBars } from '@/components/meal/reach-charts';
import { useSortableData, SortableTableHead } from '@/components/meal/use-sortable-data';
import { usePagination, PaginationControls } from '@/components/meal/use-pagination';
import { TableFilterBar } from '@/components/meal/table-filter-bar';
import { IndicatorManager } from '@/components/meal/indicator-manager';
import { DocumentManager } from '@/components/meal/document-manager';
import { LeadPartnerFormDialog } from '@/components/meal/lead-partner-form-dialog';
import { openBrandedReport } from '@/components/meal/export-report';

const PARTNER_TYPE_LABELS: Record<string, string> = {
  INTERNATIONAL_NGO: 'International NGO', LOCAL_NGO: 'Local NGO',
  GOVERNMENT: 'Government Agency', UN_AGENCY: 'UN Agency', OTHER: 'Other',
};

const PARTNER_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: STATUS_LABELS.ACTIVE },
  { value: 'INACTIVE', label: STATUS_LABELS.INACTIVE },
];

const PROJECT_STATUS_OPTIONS = Object.entries(STATUS_LABELS)
  .filter(([k]) => k !== 'ACTIVE' && k !== 'INACTIVE')
  .map(([value, label]) => ({ value, label }));

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
            <SortableTableHead label="Project Name" sortKey="name" activeKey={sortKey} direction={direction} onSort={requestSort} />
            <TableHead>Countries</TableHead>
            <TableHead>Donor(s)</TableHead>
            <SortableTableHead label="Start Date" sortKey="start_date" activeKey={sortKey} direction={direction} onSort={requestSort} />
            <SortableTableHead label="End Date" sortKey="end_date" activeKey={sortKey} direction={direction} onSort={requestSort} />
            <SortableTableHead label="Status" sortKey="status" activeKey={sortKey} direction={direction} onSort={requestSort} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {pagination.pageItems.length === 0 && (
            <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">
              {projects.length === 0 ? 'No projects linked yet.' : 'No projects match your filters.'}
            </TableCell></TableRow>
          )}
          {pagination.pageItems.map(p => (
            <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onOpen(p.id)}>
              <TableCell className="font-medium" style={{ color: C.orange }}>{p.name}</TableCell>
              <TableCell>{p.countries.map(c => c.name).join(', ') || '—'}</TableCell>
              <TableCell>{p.donors.map(d => d.name).join(', ') || '—'}</TableCell>
              <TableCell>{fmtDate(p.start_date)}</TableCell>
              <TableCell>{fmtDate(p.end_date)}</TableCell>
              <TableCell><StatusPill status={p.status} /></TableCell>
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

function LeadPartnerListView({ partners, loading, onOpen, onNew }: {
  partners: LeadPartner[]; loading: boolean; onOpen: (id: number) => void; onNew: () => void;
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const filtered = partners.filter(p =>
    (statusFilter === 'ALL' || p.status === statusFilter) &&
    p.name.toLowerCase().includes(search.toLowerCase())
  );
  const { sortedItems, sortKey, direction, requestSort } = useSortableData<LeadPartner>(filtered);
  const pagination = usePagination(sortedItems, 10);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold" style={{ color: C.brown }}>Lead Partners</h1>
          <Button onClick={onNew} style={{ backgroundColor: C.orange }} className="text-white">
            <Plus className="h-4 w-4 mr-2" /> New Lead Partner
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
              searchPlaceholder="Search lead partners..."
              searchLabel="Search lead partners"
              statusOptions={PARTNER_STATUS_OPTIONS}
              statusValue={statusFilter}
              onStatusChange={v => { setStatusFilter(v); pagination.setPage(1); }}
            />
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead label="Partner Name" sortKey="name" activeKey={sortKey} direction={direction} onSort={requestSort} />
                    <SortableTableHead label="Type" sortKey="partner_type" activeKey={sortKey} direction={direction} onSort={requestSort} />
                    <TableHead>Head Office</TableHead>
                    <SortableTableHead label="Partnership Since" sortKey="partnership_since" activeKey={sortKey} direction={direction} onSort={requestSort} />
                    <SortableTableHead label="Status" sortKey="status" activeKey={sortKey} direction={direction} onSort={requestSort} />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagination.pageItems.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      {partners.length === 0 ? 'No lead partners yet. Add the first one to get started.' : 'No lead partners match your filters.'}
                    </TableCell></TableRow>
                  )}
                  {pagination.pageItems.map(p => (
                    <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onOpen(p.id)}>
                      <TableCell className="font-medium" style={{ color: C.orange }}>{p.name}</TableCell>
                      <TableCell>{PARTNER_TYPE_LABELS[p.partner_type] ?? p.partner_type}</TableCell>
                      <TableCell>{p.head_office || '—'}</TableCell>
                      <TableCell>{p.partnership_since ?? '—'}</TableCell>
                      <TableCell><StatusPill status={p.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <PaginationControls
              page={pagination.page} totalPages={pagination.totalPages} totalItems={pagination.totalItems}
              pageSize={10} onPrev={pagination.prevPage} onNext={pagination.nextPage} onPage={pagination.setPage}
              itemLabel="lead partners"
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function LeadPartnersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [partnerList, setPartnerList] = useState<LeadPartner[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [partner, setPartner] = useState<LeadPartner | null>(null);
  usePageTitle(partner ? `${partner.name} | Lead Partners | SND Africa MEAL` : 'Lead Partners | SND Africa MEAL');
  const [overview, setOverview] = useState<PortfolioOverview | null>(null);
  const [partnerProjects, setPartnerProjects] = useState<ProjectListItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [tab, setTab] = useState('overview');
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

  // The list is the default landing view: selectedId stays null unless the
  // URL explicitly names a lead partner, rather than auto-picking the first one.
  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const list = await mealApi.leadPartners();
      setPartnerList(list);
      const paramId = Number(searchParams.get('partner'));
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
      const [p, o, projects] = await Promise.all([
        mealApi.leadPartner(id), mealApi.leadPartnerOverview(id), mealApi.projects({ lead_partner: id }),
      ]);
      setPartner(p);
      setOverview(o);
      setPartnerProjects(projects);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId === null) {
      setPartner(null);
      setOverview(null);
      setPartnerProjects([]);
      return;
    }
    loadDetail(selectedId);
    router.replace(`/lead-partners?partner=${selectedId}&tab=${tab}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const handleTabChange = (newTab: string) => {
    setTab(newTab);
    if (selectedId !== null) router.replace(`/lead-partners?partner=${selectedId}&tab=${newTab}`);
  };

  const refreshCurrent = useCallback(() => {
    if (selectedId !== null) loadDetail(selectedId);
    loadList();
  }, [selectedId, loadDetail, loadList]);

  const backToList = () => {
    setSelectedId(null);
    router.push('/lead-partners');
  };

  const currentIndex = partnerList.findIndex(p => p.id === selectedId);
  const goPrev = () => { if (currentIndex > 0) setSelectedId(partnerList[currentIndex - 1].id); };
  const goNext = () => { if (currentIndex >= 0 && currentIndex < partnerList.length - 1) setSelectedId(partnerList[currentIndex + 1].id); };
  const openProject = (id: number) => router.push(`/projects?project=${id}`);

  const exportReport = () => {
    if (!partner || !overview) return;
    openBrandedReport({
      moduleLabel: 'Lead Partner',
      title: partner.name,
      subtitle: partner.description,
      metaItems: [
        { label: 'Type', value: PARTNER_TYPE_LABELS[partner.partner_type] ?? partner.partner_type },
        { label: 'Head Office', value: partner.head_office },
        { label: 'Partnership Since', value: partner.partnership_since },
        { label: 'Status', value: STATUS_LABELS[partner.status] ?? partner.status },
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
          title: 'Projects',
          columns: ['Project', 'Countries', 'Start', 'End', 'Status'],
          rows: partnerProjects.map(p => [p.name, p.countries.map(c => c.name).join(', '), fmtDate(p.start_date), fmtDate(p.end_date), STATUS_LABELS[p.status] ?? p.status]),
        },
        {
          title: 'Key Indicators',
          columns: ['Indicator', 'Target', 'Achievement', 'Unit'],
          rows: partner.indicators.map(i => [i.name, i.target ?? '—', i.achievement, i.unit]),
        },
      ],
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link href="/dashboard" aria-label="Home" className="hover:text-foreground"><Home className="h-3.5 w-3.5" /></Link> <ChevronRight className="h-3.5 w-3.5" />
          {selectedId === null ? (
            <span className="text-foreground font-medium">Lead Partners</span>
          ) : (
            <>
              <button onClick={backToList} className="hover:text-foreground hover:underline">Lead Partners</button>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-foreground font-medium">Lead Partner Details</span>
            </>
          )}
        </div>

        {selectedId === null ? (
          <LeadPartnerListView
            partners={partnerList}
            loading={loadingList}
            onOpen={id => setSelectedId(id)}
            onNew={() => { setFormMode('create'); setFormOpen(true); }}
          />
        ) : (
          <>
            <Card>
              <CardContent className="p-4 flex flex-wrap items-end gap-3">
                <Button variant="outline" onClick={backToList} aria-label="Back to all lead partners">
                  <ArrowLeft className="h-4 w-4 mr-2" /> All Lead Partners
                </Button>
                <div className="min-w-[280px] flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">Select Lead Partner</label>
                  <Select value={selectedId ? String(selectedId) : ''} onValueChange={v => setSelectedId(Number(v))}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select a lead partner" /></SelectTrigger>
                    <SelectContent>
                      {partnerList.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" size="icon" onClick={goPrev} disabled={currentIndex <= 0} aria-label="Previous" title="Previous"><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" onClick={goNext} disabled={currentIndex < 0 || currentIndex >= partnerList.length - 1} aria-label="Next" title="Next"><ChevronRightCircle className="h-4 w-4" /></Button>
              </CardContent>
            </Card>

            {loadingDetail || !partner || !overview ? (
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
                        <div className="h-16 w-16 rounded-lg overflow-hidden bg-muted flex items-center justify-center shrink-0">
                          {partner.logo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={partner.logo} alt={partner.name} className="h-full w-full object-contain" />
                          ) : <ImageIcon className="h-6 w-6 text-muted-foreground" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-xl font-bold" style={{ color: C.brown }}>{partner.name}</h1>
                            <StatusPill status={partner.status} />
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{partner.description}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button variant="outline" onClick={() => { setFormMode('edit'); setFormOpen(true); }}>
                          <Pencil className="h-4 w-4 mr-2" /> Edit Lead Partner
                        </Button>
                        <Button variant="outline" onClick={exportReport}>
                          <Download className="h-4 w-4 mr-2" /> Export Report
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-5 pt-5 border-t">
                      <InfoItem icon={Building2} label="Total Projects" value={overview.project_count} />
                      <InfoItem icon={Globe} label="Countries" value={overview.country_count} />
                      <InfoItem icon={Landmark} label="Thematic Areas" value={overview.thematic_area_count} />
                      <InfoItem icon={Coins} label="Donor Partnerships" value={overview.donor_count} />
                      <InfoItem icon={Calendar} label="Partnership Since" value={partner.partnership_since} />
                    </div>
                  </CardContent>
                </Card>

                <Tabs value={tab} onValueChange={handleTabChange}>
                  <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="projects">Projects</TabsTrigger>
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
                      <StatusBreakdownCard title="Projects by Status" data={overview.project_status} />
                      <Card>
                        <CardHeader><CardTitle className="text-base">People Reached by Country</CardTitle></CardHeader>
                        <CardContent><ReachByCountryBars data={overview.reach_by_country} /></CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-base">Projects under this Lead Partner</CardTitle>
                        <button className="text-xs font-medium" style={{ color: C.orange }} onClick={() => handleTabChange('projects')}>View All →</button>
                      </CardHeader>
                      <CardContent><ProjectsTable projects={partnerProjects.slice(0, 5)} onOpen={openProject} showFilters={false} /></CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-base">Lead Partner Key Indicators</CardTitle>
                        <button className="text-xs font-medium" style={{ color: C.orange }} onClick={() => handleTabChange('indicators')}>View All →</button>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {partner.indicators.length === 0 && <p className="text-sm text-muted-foreground col-span-full">No indicators yet.</p>}
                        {partner.indicators.map(i => <IndicatorCard key={i.id} indicator={i} kind="lead-partner" />)}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader><CardTitle className="text-base">Lead Partner Information</CardTitle></CardHeader>
                      <CardContent className="grid grid-cols-2 gap-y-2 text-sm">
                        <span className="text-muted-foreground">Partner Name</span><span>{partner.name}</span>
                        <span className="text-muted-foreground">Description</span><span>{partner.description || '—'}</span>
                        <span className="text-muted-foreground">Head Office</span><span>{partner.head_office || '—'}</span>
                        <span className="text-muted-foreground">Type</span><span>{PARTNER_TYPE_LABELS[partner.partner_type] ?? partner.partner_type}</span>
                        <span className="text-muted-foreground">Website</span>
                        <span>{partner.website ? <a href={partner.website} target="_blank" rel="noopener noreferrer" style={{ color: C.orange }}>{partner.website}</a> : '—'}</span>
                        <span className="text-muted-foreground">Status</span><span><StatusPill status={partner.status} /></span>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="projects" className="mt-4">
                    <Card>
                      <CardContent className="p-4">
                        <ProjectsTable projects={partnerProjects} onOpen={openProject} />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="indicators" className="mt-4">
                    <IndicatorManager
                      title="Lead Partner Key Indicators"
                      kind="lead-partner"
                      indicators={partner.indicators}
                      onCreate={async (values) => { await mealApi.addLeadPartnerIndicator(partner.id, values); refreshCurrent(); }}
                      onUpdate={async (id, values) => { await mealApi.updateLeadPartnerIndicator(id, values); refreshCurrent(); }}
                    />
                  </TabsContent>

                  <TabsContent value="documents" className="mt-4">
                    <DocumentManager
                      kind="lead-partner"
                      documents={partner.documents}
                      onUpload={async (title, file) => { await mealApi.addLeadPartnerDocument(partner.id, title, file); refreshCurrent(); }}
                      onDelete={async (id) => { await mealApi.deleteLeadPartnerDocument(id); refreshCurrent(); }}
                    />
                  </TabsContent>
                </Tabs>
              </>
            )}
          </>
        )}

        <LeadPartnerFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          leadPartner={formMode === 'edit' ? partner : null}
          onSaved={refreshCurrent}
        />
      </div>
    </AppLayout>
  );
}