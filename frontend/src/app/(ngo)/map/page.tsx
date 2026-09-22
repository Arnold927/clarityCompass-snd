'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import AppLayout from '@/components/layout/app-layout';
import { usePageTitle } from '@/components/meal/use-page-title';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Home, ChevronRight, Filter, AlertCircle, MapPin, FolderKanban, Globe2, List, Diamond, Circle, ChevronDown, Search, ArrowUpDown, Download } from 'lucide-react';
import {
  mealApi, C, fmtNumber, STATUS_COLORS, STATUS_LABELS,
  type DashboardFilters, type MapPoint,
  type Country, type Donor, type LeadPartner, type ThematicFocus, type ProjectListItem,
} from '@/lib/meal-api';
import { FilterSelect, DateRangeFilter } from '@/components/meal/filter-controls';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { pointInCountryBoundary } from '@/lib/geo';
import kenyaBoundary from '@/data/kenya-boundary.json';
import ethiopiaBoundary from '@/data/ethiopia-boundary.json';

// Duplicated (not imported) from portfolio-map-view.tsx deliberately — that
// module imports leaflet at the top level, and pulling anything from it
// into this file's normal (non-dynamic) import graph risks dragging
// Leaflet into server-side rendering, which is exactly what the
// next/dynamic wrapper below exists to prevent. A one-line function is
// cheap to keep in sync manually; the SSR risk isn't worth it.
function pointKey(p: MapPoint) {
  return `${p.kind}-${p.location_id}`;
}

// Leaflet needs `window`, so the actual map is loaded client-side only —
// rendering it during Next.js's server-side build would throw.
const PortfolioMapView = dynamic(() => import('@/components/meal/portfolio-map-view'), {
  ssr: false,
  loading: () => <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">Loading map…</div>,
});

const PROJECT_STATUS_OPTIONS = [
  { value: 'NOT_STARTED', label: 'Not Started' },
  { value: 'ONGOING', label: 'Ongoing' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'ON_HOLD', label: 'On Hold' },
];

export default function MapPage() {
  usePageTitle('Map | SND Africa MEAL');

  const [countries, setCountries] = useState<Country[]>([]);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [partners, setPartners] = useState<LeadPartner[]>([]);
  const [thematic, setThematic] = useState<ThematicFocus[]>([]);
  const [projects, setProjects] = useState<ProjectListItem[]>([]);

  const [pendingFilters, setPendingFilters] = useState<DashboardFilters>({});
  const [filters, setFilters] = useState<DashboardFilters>({});
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [pendingRestrictToBorder, setPendingRestrictToBorder] = useState(false);
  const [restrictToBorder, setRestrictToBorder] = useState(false);

  const [points, setPoints] = useState<MapPoint[]>([]);
  const [ungeotaggedCount, setUngeotaggedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [quickFilter, setQuickFilter] = useState<'kenya' | 'ethiopia' | null>(null);
  const [listSearch, setListSearch] = useState('');
  const [listSortKey, setListSortKey] = useState<'name' | 'status' | 'reach'>('name');

  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter(v => v !== undefined && v !== '').length + (restrictToBorder ? 1 : 0);
  }, [filters, restrictToBorder]);

  const stats = useMemo(() => {
    const distinctProjects = new Set(points.map(p => p.project_id)).size;
    let kenyaCount = 0, ethiopiaCount = 0;
    for (const p of points) {
      const inKenya = pointInCountryBoundary(p.longitude, p.latitude, kenyaBoundary, [ethiopiaBoundary]);
      const inEthiopia = pointInCountryBoundary(p.longitude, p.latitude, ethiopiaBoundary, [kenyaBoundary]);
      if (inKenya) kenyaCount++;
      if (inEthiopia) ethiopiaCount++;
    }
    return { total: points.length, distinctProjects, kenyaCount, ethiopiaCount };
  }, [points]);

  // Drill-down: clicking the Kenya/Ethiopia KPI cards narrows what's shown
  // on the map and in the list below, without needing to touch the filter
  // bar or re-fetch — it's a quick, client-side view of a subset of what's
  // already loaded, toggled back off by clicking the same card again.
  const displayedPoints = useMemo(() => {
    if (!quickFilter) return points;
    const boundary = quickFilter === 'kenya' ? kenyaBoundary : ethiopiaBoundary;
    const other = quickFilter === 'kenya' ? ethiopiaBoundary : kenyaBoundary;
    return points.filter(p => pointInCountryBoundary(p.longitude, p.latitude, boundary, [other]));
  }, [points, quickFilter]);

  const listPoints = useMemo(() => {
    let list = displayedPoints;
    if (listSearch.trim()) {
      const q = listSearch.trim().toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.location_name.toLowerCase().includes(q) ||
        p.project_name.toLowerCase().includes(q)
      );
    }
    const sorted = [...list].sort((a, b) => {
      if (listSortKey === 'reach') return b.reach - a.reach;
      if (listSortKey === 'status') return (STATUS_LABELS[a.status] ?? a.status).localeCompare(STATUS_LABELS[b.status] ?? b.status);
      return a.name.localeCompare(b.name);
    });
    return sorted;
  }, [displayedPoints, listSearch, listSortKey]);

  // Status mix of what's currently on the map (respects the Kenya/Ethiopia
  // drill-down, unlike the KPI cards themselves, which deliberately stay on
  // full totals) — a slim segmented bar rather than a separate chart card,
  // so it reads as part of the KPI strip rather than a new page section.
  const statusBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of displayedPoints) counts[p.status] = (counts[p.status] ?? 0) + 1;
    const total = displayedPoints.length;
    return Object.entries(counts)
      .map(([status, count]) => ({ status, count, pct: total > 0 ? (count / total) * 100 : 0 }))
      .sort((a, b) => b.count - a.count);
  }, [displayedPoints]);

  const exportCsv = () => {
    const headers = ['Name', 'Kind', 'Status', 'Reach', 'Target', 'Project', 'Location', 'Latitude', 'Longitude'];
    const escape = (v: unknown) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = listPoints.map(p => [
      p.name, p.kind, STATUS_LABELS[p.status] ?? p.status, p.reach, p.target ?? '', p.project_name, p.location_name, p.latitude, p.longitude,
    ]);
    const csv = [headers, ...rows].map(row => row.map(escape).join(',')).join('\r\n');
    // A UTF-8 BOM is required here — without it, Excel on Windows silently
    // assumes the system's local ANSI code page instead of UTF-8, and any
    // non-ASCII character (the en dash in "PROTECT – Cross-Border", for
    // instance) gets mis-decoded into garbled bytes like "â€"" on open.
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `map-pins-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    Promise.all([
      mealApi.countries(), mealApi.donors(), mealApi.leadPartners(),
      mealApi.thematicFocusAreas(), mealApi.projects(),
    ]).then(([c, d, p, t, pr]) => {
      setCountries(c); setDonors(d); setPartners(p); setThematic(t); setProjects(pr);
    }).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    mealApi.mapPoints(filters)
      .then(data => {
        let pts = data.points;
        if (restrictToBorder && filters.country) {
          const countryName = countries.find(c => c.id === filters.country)?.name;
          const boundary = countryName === 'Kenya' ? kenyaBoundary : countryName === 'Ethiopia' ? ethiopiaBoundary : null;
          const otherBoundary = countryName === 'Kenya' ? ethiopiaBoundary : countryName === 'Ethiopia' ? kenyaBoundary : null;
          if (boundary) pts = pts.filter(p => pointInCountryBoundary(p.longitude, p.latitude, boundary, otherBoundary ? [otherBoundary] : []));
        }
        setPoints(pts);
        setUngeotaggedCount(data.ungeotagged_activity_count);
      })
      .finally(() => setLoading(false));
  }, [filters, restrictToBorder, countries]);

  useEffect(() => { load(); }, [load]);

  const applyFilters = () => {
    setFilters({
      ...pendingFilters,
      start_after: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
      end_before: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
    });
    setRestrictToBorder(pendingRestrictToBorder);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link href="/dashboard" aria-label="Home" className="hover:text-foreground"><Home className="h-3.5 w-3.5" /></Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium">Map</span>
        </div>

        <div>
          <h1 className="text-2xl font-bold" style={{ color: C.brown }}>Portfolio Map</h1>
          <p className="text-sm text-muted-foreground">Where projects and activities are actually taking place, across Kenya and Ethiopia</p>
        </div>

        <Card>
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <CollapsibleTrigger asChild>
              <button type="button" className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" style={{ color: C.orange }} />
                  <span className="text-sm font-semibold" style={{ color: C.brown }}>Filters</span>
                  {activeFilterCount > 0 && (
                    <span className="text-xs font-medium rounded-full px-2 py-0.5" style={{ backgroundColor: `${C.orange}22`, color: C.orange }}>
                      {activeFilterCount} active
                    </span>
                  )}
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" style={{ transform: filtersOpen ? 'rotate(180deg)' : undefined }} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
          <CardContent className="p-4 pt-0 space-y-3">
            <div className="flex flex-wrap items-end gap-3">
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
              <div className="min-w-[160px]">
                <label className="text-xs text-muted-foreground mb-1 block">Status</label>
                <Select
                  value={pendingFilters.status ?? 'all'}
                  onValueChange={v => setPendingFilters(f => ({ ...f, status: v === 'all' ? undefined : v }))}
                >
                  <SelectTrigger className="h-9"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {PROJECT_STATUS_OPTIONS.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DateRangeFilter range={dateRange} onChange={setDateRange} />
              <Button onClick={() => { applyFilters(); setFiltersOpen(false); }} style={{ backgroundColor: C.orange }} className="text-white">
                <Filter className="h-4 w-4 mr-2" /> Apply Filters
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="restrict-to-border"
                checked={pendingRestrictToBorder}
                onCheckedChange={v => setPendingRestrictToBorder(v === true)}
                disabled={!pendingFilters.country}
              />
              <label
                htmlFor="restrict-to-border"
                className={`text-sm ${pendingFilters.country ? 'text-foreground' : 'text-muted-foreground'} cursor-pointer select-none`}
              >
                Only show pins physically inside the selected country's borders
                {!pendingFilters.country && ' (select a country above first)'}
                {' — '}otherwise, a cross-border project's pins all show whenever any of its tagged countries is selected.
              </label>
            </div>
          </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {ungeotaggedCount > 0 && (
          <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm" style={{ borderColor: `${C.sandy}88`, backgroundColor: `${C.sandy}22`, color: C.brown }}>
            <AlertCircle className="h-4 w-4 shrink-0" style={{ color: C.orange }} />
            {ungeotaggedCount} {ungeotaggedCount === 1 ? 'activity has' : 'activities have'} no location set yet, and {ungeotaggedCount === 1 ? "isn't" : "aren't"} shown on the map below.
          </div>
        )}

        {!loading && points.length > 0 && (
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-3 flex items-center gap-2.5">
                  <MapPin className="h-5 w-5 shrink-0" style={{ color: C.orange }} />
                  <div>
                    <p className="text-xl font-bold leading-none" style={{ color: C.brown }}>{fmtNumber(stats.total)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Pins Shown</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 flex items-center gap-2.5">
                  <FolderKanban className="h-5 w-5 shrink-0" style={{ color: C.orange }} />
                  <div>
                    <p className="text-xl font-bold leading-none" style={{ color: C.brown }}>{fmtNumber(stats.distinctProjects)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Projects Represented</p>
                  </div>
                </CardContent>
              </Card>
              <button type="button" onClick={() => setQuickFilter(q => q === 'kenya' ? null : 'kenya')} className="text-left">
                <Card className="transition-all" style={quickFilter === 'kenya' ? { borderColor: C.green, boxShadow: `0 0 0 1px ${C.green}` } : undefined}>
                  <CardContent className="p-3 flex items-center gap-2.5">
                    <Globe2 className="h-5 w-5 shrink-0" style={{ color: C.green }} />
                    <div>
                      <p className="text-xl font-bold leading-none" style={{ color: C.brown }}>{fmtNumber(stats.kenyaCount)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Physically in Kenya</p>
                    </div>
                  </CardContent>
                </Card>
              </button>
              <button type="button" onClick={() => setQuickFilter(q => q === 'ethiopia' ? null : 'ethiopia')} className="text-left">
                <Card className="transition-all" style={quickFilter === 'ethiopia' ? { borderColor: C.sandy, boxShadow: `0 0 0 1px ${C.sandy}` } : undefined}>
                  <CardContent className="p-3 flex items-center gap-2.5">
                    <Globe2 className="h-5 w-5 shrink-0" style={{ color: C.sandy }} />
                    <div>
                      <p className="text-xl font-bold leading-none" style={{ color: C.brown }}>{fmtNumber(stats.ethiopiaCount)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Physically in Ethiopia</p>
                    </div>
                  </CardContent>
                </Card>
              </button>
            </div>
            {statusBreakdown.length > 0 && (
              <div className="mt-2 px-3 py-2 rounded-md border bg-card">
                <div className="flex h-2 rounded-full overflow-hidden w-full">
                  {statusBreakdown.map(s => (
                    <div
                      key={s.status}
                      style={{ width: `${s.pct}%`, backgroundColor: STATUS_COLORS[s.status] ?? C.muted }}
                      title={`${STATUS_LABELS[s.status] ?? s.status}: ${s.count}`}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                  {statusBreakdown.map(s => (
                    <div key={s.status} className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span className="inline-block h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[s.status] ?? C.muted }} />
                      {STATUS_LABELS[s.status] ?? s.status} ({s.count})
                    </div>
                  ))}
                </div>
              </div>
            )}
            {quickFilter && (
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <span>Showing only pins physically in {quickFilter === 'kenya' ? 'Kenya' : 'Ethiopia'} on the map and list below.</span>
                <button type="button" onClick={() => setQuickFilter(null)} className="underline hover:no-underline" style={{ color: C.orange }}>Clear</button>
              </div>
            )}
          </div>
        )}

        <Card>
          <CardContent style={{ padding: 0 }} className="relative">
            {loading ? (
              <div style={{ height: 900, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Skeleton className="w-full h-full" />
              </div>
            ) : (
              <div style={{ position: 'relative', width: '100%', isolation: 'isolate' }}>
                <div style={{ height: 900, position: 'relative', zIndex: 0 }}>
                  <PortfolioMapView points={displayedPoints} selectedKey={selectedKey} onMarkerClick={setSelectedKey} />
                </div>
                {displayedPoints.length === 0 && (
                  <div className="absolute inset-x-0 top-4 flex justify-center pointer-events-none z-[1000] px-4">
                    <div className="bg-white/95 border rounded-md shadow-md px-4 py-2.5 text-center pointer-events-auto">
                      <p className="text-sm font-medium">
                        {points.length > 0 ? 'No pins match the current drill-down.' : 'No geotagged projects or activities match your filters.'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {points.length > 0 ? 'Clear the Kenya/Ethiopia drill-down above to see everything again.' : 'Add a location when creating or editing a project or activity to see it here.'}
                      </p>
                    </div>
                  </div>
                )}
                {displayedPoints.length > 0 && (
                  <div className="absolute left-3 bottom-3 z-[1000] bg-white/95 border rounded-md shadow-md px-3 py-2.5 text-xs pointer-events-none">
                    <p className="font-semibold mb-1.5" style={{ color: C.brown }}>Legend</p>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Diamond className="h-3 w-3" style={{ color: C.muted }} fill={C.muted} />
                      <span className="text-muted-foreground">Project</span>
                      <Circle className="h-2.5 w-2.5 ml-2" style={{ color: C.muted }} fill={C.muted} />
                      <span className="text-muted-foreground">Activity</span>
                    </div>
                    <div className="grid grid-cols-1 gap-y-0.5 mt-1.5 pt-1.5 border-t">
                      {Object.entries(STATUS_LABELS).filter(([k]) => STATUS_COLORS[k] && ['NOT_STARTED', 'ONGOING', 'PARTIALLY_DONE', 'COMPLETED', 'ON_HOLD'].includes(k)).map(([k, label]) => (
                        <div key={k} className="flex items-center gap-1.5">
                          <span className="inline-block h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[k] }} />
                          <span className="text-muted-foreground">{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        <p className="text-xs text-muted-foreground text-center -mt-2">
          Framed on Kenya and southern/central Ethiopia by default — pan or zoom out to see Ethiopia's far north (Gondar, Tigray).
        </p>

        {!loading && points.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <div className="px-4 py-3 border-b flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <List className="h-4 w-4" style={{ color: C.orange }} />
                  <p className="text-sm font-semibold" style={{ color: C.brown }}>All Pins Shown ({listPoints.length}{listPoints.length !== points.length ? ` of ${points.length}` : ''})</p>
                </div>
                <div className="relative flex-1 min-w-[180px] max-w-xs">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={listSearch}
                    onChange={e => setListSearch(e.target.value)}
                    placeholder="Search pins by name or location..."
                    className="w-full h-8 pl-8 pr-3 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div className="flex items-center gap-1.5 ml-auto">
                  <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                  <Select value={listSortKey} onValueChange={v => setListSortKey(v as typeof listSortKey)}>
                    <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                      <SelectItem value="reach">Reach</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" className="h-8" onClick={exportCsv} disabled={listPoints.length === 0}>
                    <Download className="h-3.5 w-3.5 mr-1.5" /> Export CSV
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground px-4 pt-2">Click a row to locate it on the map above</p>
              <div className="max-h-[400px] overflow-y-auto divide-y">
                {listPoints.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">No pins match "{listSearch}".</p>
                )}
                {listPoints.map(p => {
                  const key = pointKey(p);
                  const isSelected = key === selectedKey;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedKey(key)}
                      className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-muted/50 transition-colors"
                      style={isSelected ? { backgroundColor: `${C.orange}18` } : undefined}
                    >
                      {p.kind === 'project'
                        ? <Diamond className="h-3.5 w-3.5 shrink-0" style={{ color: STATUS_COLORS[p.status] ?? C.muted }} fill={STATUS_COLORS[p.status] ?? C.muted} />
                        : <Circle className="h-3 w-3 shrink-0" style={{ color: STATUS_COLORS[p.status] ?? C.muted }} fill={STATUS_COLORS[p.status] ?? C.muted} />}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate" style={{ color: C.brown }}>{p.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {p.kind === 'activity' ? `Part of ${p.project_name}` : 'Project'}
                          {p.location_name ? ` — ${p.location_name}` : ''}
                        </p>
                      </div>
                      <span className="text-xs shrink-0" style={{ color: STATUS_COLORS[p.status] ?? C.muted }}>{STATUS_LABELS[p.status] ?? p.status}</span>
                      <span className="text-xs text-muted-foreground shrink-0 w-20 text-right">
                        {p.target !== null ? `${fmtNumber(p.reach)}/${fmtNumber(p.target)}` : fmtNumber(p.reach)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}