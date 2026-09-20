"use client";

import type { ReactNode } from "react";
import {
  GanttChartSquare, LayoutDashboard, Coins, Users, Globe, Layers,
  Menu, X, ChevronLeft, ChevronRight, LogOut, Shield,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { ngoAuth } from "@/lib/api";
import api from "@/lib/api";
import { type AppRole, ROLE_LABELS } from "@/lib/rbac";
import { GlobalSearch } from "@/components/meal/global-search";

// ── SND Africa MEAL Dashboard — the 5 modules + Dashboard. This is the
// entire visible app; the legacy modules (Strategic Plan, Programs,
// Reporting, Community Feedback, Data Collection, AI Reporter) still exist
// in the codebase but are intentionally not linked here. ──────────────────
const ALL_MENU_ITEMS = [
  { href: "/dashboard",       label: "Dashboard",       icon: LayoutDashboard,  alwaysVisible: true },
  { href: "/projects",        label: "Projects",        icon: GanttChartSquare, alwaysVisible: true },
  { href: "/donors",          label: "Donors",          icon: Coins,            alwaysVisible: true },
  { href: "/lead-partners",   label: "Lead Partners",   icon: Users,            alwaysVisible: true },
  { href: "/countries",       label: "Countries",       icon: Globe,            alwaysVisible: true },
  { href: "/thematic-focus",  label: "Thematic Focus",  icon: Layers,           alwaysVisible: true },
];

// SND colour tokens
const SIDEBAR_BG    = "#1E1004";
const SIDEBAR_BORDER= "#2E1A09";
const ACTIVE_BG     = "#C8793A";
const ACTIVE_TEXT   = "#FFFFFF";
const INACTIVE_TEXT = "#C8A87A";
const HOVER_BG      = "#2E1A09";

const ROLE_BADGE_COLORS: Record<AppRole, string> = {
  senior_management: "#E8955A",   // light orange  — most senior, brightest
  program_manager:   "#C8793A",   // mid orange    — base brand colour
  me:                "#8A4E20",   // deep brown-orange — same hue, darker
};

function SndLogoMark({ size = 36 }: { size?: number }) {
  return (
    <img
      src="/logo.png"
      alt="SND Africa"
      style={{ width: size, height: size, objectFit: "contain", flexShrink: 0 }}
    />
  );
}

/** Turns a display name into 1–2 uppercase initials */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function SidebarContent({
  collapsed, pathname, onLinkClick, role, userName,
}: { collapsed: boolean; pathname: string; onLinkClick?: () => void; role: AppRole | null; userName: string }) {
  // All 5 modules are always visible — no per-role gating needed anymore.
  const visibleItems = ALL_MENU_ITEMS;

  return (
    <>
      <GlobalSearch collapsed={collapsed} />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-0.5">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  onClick={onLinkClick}
                  title={collapsed ? item.label : undefined}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all duration-150"
                  style={isActive
                    ? { backgroundColor: ACTIVE_BG, color: ACTIVE_TEXT }
                    : { color: INACTIVE_TEXT }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = HOVER_BG; }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className={cn("truncate transition-all duration-200", collapsed && "opacity-0 w-0 overflow-hidden")}>
                    {item.label}
                  </span>
                  {isActive && !collapsed && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white opacity-60" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User info — avatar with initials + name + role badge */}
      <div className="border-t px-3 py-3" style={{ borderColor: SIDEBAR_BORDER }}>
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          {/* Avatar circle with initials */}
          <div
            className="shrink-0 flex items-center justify-center rounded-full text-white font-semibold text-xs select-none"
            style={{ width: 32, height: 32, backgroundColor: role ? ROLE_BADGE_COLORS[role] : "#C8793A", minWidth: 32 }}
            title={userName || undefined}
          >
            {getInitials(userName)}
          </div>
          {/* Name + role label — hidden when collapsed */}
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-xs font-medium truncate leading-tight" style={{ color: "#F5E6C8" }}>
                    {userName || "User"}
                  </p>
                </TooltipTrigger>
                <TooltipContent side="right">{userName || "User"}</TooltipContent>
              </Tooltip>
              {role && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Shield className="h-2.5 w-2.5 shrink-0" style={{ color: ROLE_BADGE_COLORS[role] }} />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-xs truncate" style={{ color: ROLE_BADGE_COLORS[role] }}>
                        {ROLE_LABELS[role]}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="right">{ROLE_LABELS[role]}</TooltipContent>
                  </Tooltip>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tagline */}
      {!collapsed && (
        <div className="px-4 py-3 border-t" style={{ borderColor: SIDEBAR_BORDER }}>
          <p className="text-xs italic leading-tight" style={{ color: "#5A3820" }}>
            Confronting crisis · Building Resilience · Transforming lives
          </p>
        </div>
      )}

      {/* Logout */}
      <div className="border-t p-3" style={{ borderColor: SIDEBAR_BORDER }}>
        <button
          onClick={() => ngoAuth.logout()}
          className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors cursor-pointer"
          style={{ color: INACTIVE_TEXT, background: "transparent", border: "none" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = HOVER_BG; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span className={cn("transition-all duration-200", collapsed && "opacity-0 w-0 overflow-hidden")}>
            Log out
          </span>
        </button>
      </div>
    </>
  );
}

interface AppLayoutProps { children: ReactNode; platform?: "ngo"; }

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [role, setRole] = useState<AppRole | null>(null);
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    setMounted(true);
    if (localStorage.getItem("desktop-sidebar-collapsed") === "true") setIsCollapsed(true);

    const userData = ngoAuth.getUser();
    const storedRole = (userData?.app_role ?? null) as AppRole | null;

    const deriveName = (d: Record<string, any>) =>
      `${d.first_name ?? ""} ${d.last_name ?? ""}`.trim() || d.name || d.username || "";

    if (storedRole) {
      setRole(storedRole);
      setUserName(deriveName(userData ?? {}));
    } else if (ngoAuth.isAuthenticated()) {
      // app_role missing — fetch from API (handles pre-RBAC sessions)
      api.get('/auth/me/')
        .then((res) => {
          const freshRole = (res.data?.app_role ?? null) as AppRole | null;
          setRole(freshRole);
          setUserName(deriveName(res.data ?? {}));
          const existing = ngoAuth.getUser() ?? {};
          localStorage.setItem('ngo_user', JSON.stringify({ ...existing, ...res.data }));
        })
        .catch(() => {});
    }
  }, []);

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem("desktop-sidebar-collapsed", String(next));
  };

  const sidebarW   = mounted && isCollapsed ? "w-16"             : "w-64 min-w-[220px]";
  const mainMargin = mounted && isCollapsed ? "md:ml-16"         : "md:ml-64";
  const collapsed  = mounted && isCollapsed;

  return (
    <div className="flex min-h-dvh">
      {/* ── Desktop Sidebar ── */}
      <aside
        className={cn("hidden md:flex flex-col fixed inset-y-0 left-0 z-30 transition-all duration-300", sidebarW)}
        style={{ backgroundColor: SIDEBAR_BG, borderRight: `1px solid ${SIDEBAR_BORDER}` }}
      >
        {/* Header */}
        <div className="p-4 border-b" style={{ borderColor: SIDEBAR_BORDER }}>
          {collapsed ? (
            <div className="flex flex-col items-center gap-3">
              <SndLogoMark size={28} />
              <Button variant="ghost" size="icon" onClick={toggleCollapse}
                className="h-7 w-7"
                style={{ color: "#7A5030" }}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <a
                href="https://sndafrica.org"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 focus:outline-none"
                title="Visit SND Africa"
              >
                <SndLogoMark size={36} />
                <div>
                  <p className="text-sm font-bold leading-tight whitespace-nowrap" style={{ color: "#F5E6C8", fontFamily: "'Lora', serif" }}>SND Africa</p>
                  <p className="text-xs leading-tight whitespace-nowrap" style={{ color: "#7A5030" }}>M&amp;E Portal</p>
                </div>
              </a>
              <Button variant="ghost" size="icon" onClick={toggleCollapse}
                className="h-8 w-8 shrink-0"
                style={{ color: "#7A5030" }}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <SidebarContent collapsed={collapsed} pathname={pathname} role={role} userName={userName} />
      </aside>

      {/* ── Main ── */}
      <main className={cn("flex-1 transition-all duration-300", mainMargin)}>
        {/* Mobile menu button */}
        <Button variant="outline" size="icon" onClick={() => setIsMobileOpen(true)}
          className="fixed top-4 left-4 z-40 h-10 w-10 rounded-full shadow-md md:hidden"
          style={{ backgroundColor: SIDEBAR_BG, borderColor: "#C8793A", color: "#E8C97A" }}>
          <Menu className="h-5 w-5" />
        </Button>

        <div className="min-h-dvh bg-background p-4 md:p-6 pt-16 md:pt-6">
          {children}
        </div>
      </main>

      {/* ── Mobile Drawer ── */}
      <aside
        className={cn("fixed inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-300 md:hidden",
          isMobileOpen ? "translate-x-0" : "-translate-x-full")}
        style={{ backgroundColor: SIDEBAR_BG, borderRight: `1px solid ${SIDEBAR_BORDER}` }}
      >
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: SIDEBAR_BORDER }}>
          <a
            href="https://sndafrica.org"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 focus:outline-none"
            title="Visit SND Africa"
          >
            <SndLogoMark size={32} />
            <div>
              <p className="text-sm font-bold" style={{ color: "#F5E6C8", fontFamily: "'Lora', serif" }}>SND Africa</p>
              <p className="text-xs" style={{ color: "#7A5030" }}>M&amp;E Portal</p>
            </div>
          </a>
          <Button variant="ghost" size="icon" onClick={() => setIsMobileOpen(false)}
            className="h-8 w-8" style={{ color: "#7A5030" }}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <SidebarContent collapsed={false} pathname={pathname} onLinkClick={() => setIsMobileOpen(false)} role={role} userName={userName} />
      </aside>

      {/* Mobile overlay */}
      <div
        className={cn("fixed inset-0 z-40 bg-black/50 transition-all duration-300 md:hidden",
          isMobileOpen ? "opacity-100 visible" : "opacity-0 invisible")}
        onClick={() => setIsMobileOpen(false)}
      />
    </div>
  );
}