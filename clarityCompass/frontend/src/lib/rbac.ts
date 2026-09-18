// src/lib/rbac.ts
// ─────────────────────────────────────────────────────────────────────────────
// Role-Based Access Control — single source of truth for the M&E Portal.
//
// Roles
//   senior_management  → Executive Director / Head of Programmes
//   program_manager    → Programme Managers
//   me                 → Monitoring & Evaluation officers
// ─────────────────────────────────────────────────────────────────────────────

export type AppRole = 'senior_management' | 'program_manager' | 'me';

// What each role can do
export interface RolePermissions {
  // ── Dashboards ────────────────────────────────────────────────────────────
  canViewDashboard: boolean;
  canViewActivityCompletionProgress: boolean;
  canViewIndicatorProgress: boolean;

  // ── Field visits / TOR / deliverables ────────────────────────────────────
  canDocumentFieldVisit: boolean;         // Program Managers
  canUploadMEDeliverables: boolean;       // Program Managers
  canUploadTOR: boolean;                  // Program Managers AND M&E officers

  // ── Editing & updates ─────────────────────────────────────────────────────
  canEditData: boolean;                   // M&E only
  canUpdateIndicatorValues: boolean;      // M&E only
  canManageIndicators: boolean;           // Program Managers AND M&E officers

  // ── Deliverable downloads (TOR, activity reports, participants list) ───────
  canDownloadDeliverables: boolean;       // All roles

  // ── Complaints ────────────────────────────────────────────────────────────
  canViewComplaints: boolean;           // Senior Management & Program Managers

  // ── Role flags ────────────────────────────────────────────────────────────
  isSeniorManagement: boolean;
  isProgramManager: boolean;
  isMEOfficer: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Permission matrix
// ─────────────────────────────────────────────────────────────────────────────
export function getPermissions(role: AppRole | undefined | null): RolePermissions {
  const r = role ?? 'program_manager';

  const isSeniorManagement = r === 'senior_management';
  const isProgramManager   = r === 'program_manager';
  const isMEOfficer        = r === 'me';

  return {
    // Every role can view dashboards
    canViewDashboard:                  true,
    canViewActivityCompletionProgress: true,
    canViewIndicatorProgress:          true,

    // Only Program Managers document field visits / upload deliverables
    canDocumentFieldVisit:    isProgramManager,
    canUploadMEDeliverables:  isProgramManager,

    // Program Managers AND M&E officers can upload/submit TORs
    canUploadTOR: isProgramManager || isMEOfficer,

    // Only M&E can edit data or update indicators
    canEditData:              isMEOfficer,
    canUpdateIndicatorValues: isMEOfficer,

    // All roles can view and download deliverables (TOR, activity reports, participants list)
    // Only M&E officers can upload them
    canDownloadDeliverables:  true,

    // Program Managers and M&E can create/edit program indicators
    canManageIndicators: isProgramManager || isMEOfficer,

    // Senior Management and Program Managers can view complaints
    canViewComplaints: isSeniorManagement || isProgramManager,

    isSeniorManagement,
    isProgramManager,
    isMEOfficer,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Human-readable label
// ─────────────────────────────────────────────────────────────────────────────
export const ROLE_LABELS: Record<AppRole, string> = {
  senior_management: 'Senior Management',
  program_manager:   'Program Manager',
  me:                'Monitoring & Evaluation',
};