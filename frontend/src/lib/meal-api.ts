import api from '@/lib/api';

// ─────────────────────────────────────────────
// Brand colours — matches the existing sidebar / SND Africa theme exactly.
// ─────────────────────────────────────────────
export const C = {
  orange: '#C8793A',
  green: '#4A6830',
  red: '#C0392B',
  brown: '#3D1A08',
  sandy: '#E8C97A',
  muted: '#8B6A4A',
  blue: '#5B8DB8',
  pink: '#B85B8D',
};

export const STATUS_COLORS: Record<string, string> = {
  COMPLETED: C.green,
  ONGOING: C.orange,
  PARTIALLY_DONE: C.sandy,
  NOT_STARTED: C.red,
  ON_HOLD: C.muted,
  ACTIVE: C.green,
  INACTIVE: C.muted,
};

export const STATUS_LABELS: Record<string, string> = {
  COMPLETED: 'Completed',
  ONGOING: 'Ongoing',
  PARTIALLY_DONE: 'Partially Done',
  NOT_STARTED: 'Not Started',
  ON_HOLD: 'On Hold',
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
};

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
export interface ReachBreakdown {
  total: number;
  male: number; male_pct: number;
  female: number; female_pct: number;
  pwd: number; pwd_pct: number;
}

export interface StatusBucket { status: string; label: string; count: number; percentage: number; }
export interface StatusBreakdown { total: number; breakdown: StatusBucket[]; }

export interface CountryMini { id: number; name: string; iso_code: string; }
export interface DonorMini { id: number; name: string; logo: string | null; }
export interface LeadPartnerMini { id: number; name: string; logo: string | null; }
export interface ThematicFocusMini { id: number; name: string; icon: string; }
export interface MealDocument { id: number; title: string; file: string; uploaded_at: string; }

export interface IndicatorLike {
  id: number;
  name: string;
  target: number | null;
  achievement: number;
  unit: string;
  reporting_period: string;
  percentage_achievement: number | null;
  created_at: string;
  updated_at: string;
}

export interface Country {
  id: number; name: string; iso_code: string; flag: string | null; region: string; description: string;
  status: 'ACTIVE' | 'INACTIVE'; first_implementation_year: number | null; notes: string;
}

export interface ThematicFocus {
  id: number; name: string; description: string; icon: string;
  status: 'ACTIVE' | 'INACTIVE'; reporting_frequency: string; responsible_person: string;
  notes: string; reach_total: number; reach_male: number; reach_female: number; reach_pwd: number;
  reach_male_pct: number; reach_female_pct: number; reach_pwd_pct: number;
  indicators: IndicatorLike[]; created_at: string; updated_at: string;
}

export interface LeadPartner {
  id: number; name: string; description: string; status: 'ACTIVE' | 'INACTIVE';
  partner_type: string; head_office: string; website: string; logo: string | null;
  partnership_since: number | null; notes: string; indicators: IndicatorLike[];
  documents: MealDocument[];
}

export interface Donor {
  id: number; name: string; description: string; status: 'ACTIVE' | 'INACTIVE';
  donor_type: string; head_office: string; website: string; logo: string | null;
  partnership_since: number | null; notes: string; indicators: IndicatorLike[];
  documents: MealDocument[];
}

export interface LocationEntry {
  id: number; latitude: number; longitude: number; location_name: string;
}

export interface ProjectActivity {
  id: number; project: number; name: string; target: number; reach: number;
  reach_male: number; reach_female: number; reach_pwd: number;
  status: string; reporting_period: string; percentage_of_target: number | null;
  locations: LocationEntry[];
  created_at: string; updated_at: string;
}

export interface ProjectListItem {
  id: number; name: string; project_code: string;
  countries: CountryMini[]; donors: DonorMini[]; lead_partner: LeadPartnerMini | null;
  start_date: string; end_date: string; status: string; total_reach: number;
}

export interface Project extends ProjectListItem {
  description: string; thematic_focus: ThematicFocusMini[];
  budget: number | null; currency: string; duration_years: number;
  image: string | null; activities: ProjectActivity[]; indicators: IndicatorLike[];
  documents: MealDocument[];
  locations: LocationEntry[];
}

export interface MapPoint {
  kind: 'project' | 'activity';
  id: number; location_id: number; name: string; status: string;
  latitude: number; longitude: number; location_name: string;
  target: number | null; reach: number;
  project_id: number; project_name: string;
}

export interface NeedsAttentionItem {
  kind: 'activity' | 'indicator';
  id: number; name: string;
  target: number | null; value: number; percentage: number;
  project_id?: number; // present only for activity items
}

export interface YearReach { year: number; reach: number; male: number; female: number; pwd: number; }

export interface ProjectOverview {
  total_people_reached: ReachBreakdown;
  activity_status: StatusBreakdown;
  indicators: IndicatorLike[];
  needs_attention: NeedsAttentionItem[];
}

export interface PortfolioOverview {
  total_people_reached: ReachBreakdown;
  project_status: StatusBreakdown;
  reach_by_country: { country: string; reach: number; male: number; female: number; pwd: number }[];
  reach_by_year: YearReach[];
  reach_change_pct: number | null;
  project_count: number; country_count: number; donor_count: number;
  lead_partner_count: number; thematic_area_count: number;
  needs_attention: NeedsAttentionItem[];
}

export interface CountryOverview {
  total_people_reached: ReachBreakdown;
  reach_by_year: YearReach[];
  latest_activity_year: number | null;
  reach_change_pct: number | null;
  project_count: number; donor_count: number; lead_partner_count: number;
  thematic_area_count: number; main_thematic_areas: { id: number; name: string }[];
}

export interface DashboardOverview {
  total_people_reached: ReachBreakdown;
  active_projects: number; donor_count: number; country_count: number;
  lead_partner_count: number; thematic_area_count: number;
  project_status: StatusBreakdown; activity_status: StatusBreakdown;
  key_achievements: { name: string; achievement: number; target: number | null; unit: string; percentage_achievement: number | null }[];
  reach_by_year: YearReach[];
  reach_change_pct: number | null;
  reach_by_country: { country: string; reach: number; male: number; female: number; pwd: number }[];
  needs_attention: NeedsAttentionItem[];
}

export interface DashboardFilters {
  country?: number; donor?: number; lead_partner?: number;
  thematic_focus?: number; project?: number; status?: string;
  start_after?: string; end_before?: string;
}

export interface SearchResult {
  kind: 'project' | 'donor' | 'lead-partner' | 'country' | 'thematic-focus' | 'indicator';
  indicator_kind?: IndicatorKind;
  id: number; name: string; subtitle: string;
}

export interface ProjectFilters {
  country?: number; donor?: number; lead_partner?: number;
  thematic_focus?: number; status?: string;
}

// ─────────────────────────────────────────────
// Cross-module "kind" helpers — used by the standalone Activity/Indicator/
// Document detail pages and by the reverse links on the Project page.
// ─────────────────────────────────────────────
export type IndicatorKind = 'project' | 'donor' | 'lead-partner' | 'thematic-focus';
export type DocumentKind = 'project' | 'donor' | 'lead-partner';

export interface IndicatorDetail extends IndicatorLike {
  project?: number; donor?: number; lead_partner?: number; thematic_focus?: number;
}
export interface DocumentDetail extends MealDocument {
  project?: number; donor?: number; lead_partner?: number;
}

export const INDICATOR_KIND_LABELS: Record<IndicatorKind, string> = {
  project: 'Project', donor: 'Donor', 'lead-partner': 'Lead Partner', 'thematic-focus': 'Thematic Focus',
};
export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
  project: 'Project', donor: 'Donor', 'lead-partner': 'Lead Partner',
};

export function moduleHref(kind: IndicatorKind | DocumentKind, id: number, tab?: string): string {
  const t = tab ? `&tab=${tab}` : '';
  switch (kind) {
    case 'project': return `/projects?project=${id}${t}`;
    case 'donor': return `/donors?donor=${id}${t}`;
    case 'lead-partner': return `/lead-partners?partner=${id}${t}`;
    case 'thematic-focus': return `/thematic-focus?area=${id}${t}`;
  }
}

export function indicatorParentId(kind: IndicatorKind, ind: IndicatorDetail): number | undefined {
  if (kind === 'project') return ind.project;
  if (kind === 'donor') return ind.donor;
  if (kind === 'lead-partner') return ind.lead_partner;
  return ind.thematic_focus;
}

export function documentParentId(kind: DocumentKind, doc: DocumentDetail): number | undefined {
  if (kind === 'project') return doc.project;
  if (kind === 'donor') return doc.donor;
  return doc.lead_partner;
}

export function searchResultHref(r: SearchResult): string {
  if (r.kind === 'indicator' && r.indicator_kind) return `/indicators/${r.indicator_kind}/${r.id}`;
  if (r.kind === 'country') return `/countries?country=${r.id}`;
  return moduleHref(r.kind as IndicatorKind, r.id);
}

// ─────────────────────────────────────────────
// API calls
// ─────────────────────────────────────────────
const qs = (params: Record<string, any>) => {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join('&')}` : '';
};

export const mealApi = {
  dashboard: (filters: DashboardFilters = {}) =>
    api.get<DashboardOverview>(`/meal/dashboard/${qs(filters)}`).then(r => r.data),

  countries: () => api.get<Country[]>('/meal/countries/').then(r => r.data),
  country: (id: number | string) => api.get<Country>(`/meal/countries/${id}/`).then(r => r.data),
  countryOverview: (id: number | string) => api.get<CountryOverview>(`/meal/countries/${id}/overview/`).then(r => r.data),
  saveCountry: (id: number | string | null, payload: any) =>
    id ? api.patch(`/meal/countries/${id}/`, payload) : api.post('/meal/countries/', payload),

  thematicFocusAreas: () => api.get<ThematicFocus[]>('/meal/thematic-focus/').then(r => r.data),
  thematicFocus: (id: number | string) => api.get<ThematicFocus>(`/meal/thematic-focus/${id}/`).then(r => r.data),
  saveThematicFocus: (id: number | string | null, payload: any) =>
    id ? api.patch(`/meal/thematic-focus/${id}/`, payload) : api.post('/meal/thematic-focus/', payload),
  addThematicFocusIndicator: (thematic_focus: number, payload: Partial<IndicatorLike>) =>
    api.post('/meal/thematic-focus-indicators/', { ...payload, thematic_focus }),
  updateThematicFocusIndicator: (id: number, payload: Partial<IndicatorLike>) =>
    api.patch(`/meal/thematic-focus-indicators/${id}/`, payload),

  leadPartners: () => api.get<LeadPartner[]>('/meal/lead-partners/').then(r => r.data),
  leadPartner: (id: number | string) => api.get<LeadPartner>(`/meal/lead-partners/${id}/`).then(r => r.data),
  leadPartnerOverview: (id: number | string) => api.get<PortfolioOverview>(`/meal/lead-partners/${id}/overview/`).then(r => r.data),
  saveLeadPartner: (id: number | string | null, payload: any) =>
    id ? api.patch(`/meal/lead-partners/${id}/`, payload) : api.post('/meal/lead-partners/', payload),
  addLeadPartnerIndicator: (lead_partner: number, payload: Partial<IndicatorLike>) =>
    api.post('/meal/lead-partner-indicators/', { ...payload, lead_partner }),
  updateLeadPartnerIndicator: (id: number, payload: Partial<IndicatorLike>) =>
    api.patch(`/meal/lead-partner-indicators/${id}/`, payload),
  addLeadPartnerDocument: (lead_partner: number, title: string, file: File) => {
    const fd = new FormData();
    fd.append('lead_partner', String(lead_partner));
    fd.append('title', title);
    fd.append('file', file);
    return api.post('/meal/lead-partner-documents/', fd);
  },
  deleteLeadPartnerDocument: (id: number) => api.delete(`/meal/lead-partner-documents/${id}/`),

  donors: () => api.get<Donor[]>('/meal/donors/').then(r => r.data),
  donor: (id: number | string) => api.get<Donor>(`/meal/donors/${id}/`).then(r => r.data),
  donorOverview: (id: number | string) => api.get<PortfolioOverview>(`/meal/donors/${id}/overview/`).then(r => r.data),
  saveDonor: (id: number | string | null, payload: any) =>
    id ? api.patch(`/meal/donors/${id}/`, payload) : api.post('/meal/donors/', payload),
  addDonorIndicator: (donor: number, payload: Partial<IndicatorLike>) =>
    api.post('/meal/donor-indicators/', { ...payload, donor }),
  updateDonorIndicator: (id: number, payload: Partial<IndicatorLike>) =>
    api.patch(`/meal/donor-indicators/${id}/`, payload),
  addDonorDocument: (donor: number, title: string, file: File) => {
    const fd = new FormData();
    fd.append('donor', String(donor));
    fd.append('title', title);
    fd.append('file', file);
    return api.post('/meal/donor-documents/', fd);
  },
  deleteDonorDocument: (id: number) => api.delete(`/meal/donor-documents/${id}/`),

  projects: (filters: ProjectFilters = {}) =>
    api.get<ProjectListItem[]>(`/meal/projects/${qs(filters)}`).then(r => r.data),
  project: (id: number | string) => api.get<Project>(`/meal/projects/${id}/`).then(r => r.data),
  projectOverview: (id: number | string) => api.get<ProjectOverview>(`/meal/projects/${id}/overview/`).then(r => r.data),
  saveProject: (id: number | string | null, payload: any) =>
    id ? api.patch(`/meal/projects/${id}/`, payload) : api.post('/meal/projects/', payload),
  addActivity: (project: number, payload: Partial<ProjectActivity>) =>
    api.post('/meal/project-activities/', { ...payload, project }),
  updateActivity: (id: number, payload: Partial<ProjectActivity>) =>
    api.patch(`/meal/project-activities/${id}/`, payload),
  addProjectLocation: (project: number, loc: { latitude: number; longitude: number; location_name: string }) =>
    api.post('/meal/project-locations/', { ...loc, project }),
  deleteProjectLocation: (id: number) => api.delete(`/meal/project-locations/${id}/`),
  addActivityLocation: (activity: number, loc: { latitude: number; longitude: number; location_name: string }) =>
    api.post('/meal/activity-locations/', { ...loc, activity }),
  deleteActivityLocation: (id: number) => api.delete(`/meal/activity-locations/${id}/`),
  addProjectIndicator: (project: number, payload: Partial<IndicatorLike>) =>
    api.post('/meal/project-indicators/', { ...payload, project }),
  updateProjectIndicator: (id: number, payload: Partial<IndicatorLike>) =>
    api.patch(`/meal/project-indicators/${id}/`, payload),
  addDocument: (project: number, title: string, file: File) => {
    const fd = new FormData();
    fd.append('project', String(project));
    fd.append('title', title);
    fd.append('file', file);
    return api.post('/meal/project-documents/', fd);
  },
  deleteDocument: (id: number) => api.delete(`/meal/project-documents/${id}/`),

  // ── Standalone detail-page fetches ──
  activity: (id: number | string) => api.get<ProjectActivity>(`/meal/project-activities/${id}/`).then(r => r.data),
  indicator: (kind: IndicatorKind, id: number | string) =>
    api.get<IndicatorDetail>(`/meal/${kind}-indicators/${id}/`).then(r => r.data),
  document: (kind: DocumentKind, id: number | string) =>
    api.get<DocumentDetail>(`/meal/${kind}-documents/${id}/`).then(r => r.data),

  search: (q: string) => api.get<{ results: SearchResult[] }>(`/meal/search/${qs({ q })}`).then(r => r.data.results),

  mapPoints: (filters: DashboardFilters) =>
    api.get<{ points: MapPoint[]; ungeotagged_activity_count: number }>(`/meal/map-points/${qs(filters)}`).then(r => r.data),
};

/** Resolves a parent's display name for an indicator/document detail page's "belongs to" link. */
export async function fetchModuleName(kind: IndicatorKind | DocumentKind, id: number): Promise<string> {
  switch (kind) {
    case 'project': return (await mealApi.project(id)).name;
    case 'donor': return (await mealApi.donor(id)).name;
    case 'lead-partner': return (await mealApi.leadPartner(id)).name;
    case 'thematic-focus': return (await mealApi.thematicFocus(id)).name;
  }
}

export function fmtNumber(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === '') return '—';
  const num = typeof n === 'string' ? Number(n) : n;
  if (Number.isNaN(num)) return '—';
  return num.toLocaleString();
}

export function fmtDate(d: string): string {
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function flagEmoji(isoCode: string): string {
  const code = isoCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return '🏳️';
  const points = [...code].map(c => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...points);
}