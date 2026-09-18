'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, FileText, BarChart, MessageSquare,
  Bell, Users, Settings, FolderOpen, Shield
} from "lucide-react";
import { usePortalPermissions } from "@/hooks/use-portal-permissions";

interface SharedPortalNavigationProps {
  onNavigate?: () => void;
}

const navigationItems = [
  { name: "Dashboard",     href: "/shared-portal",                icon: LayoutDashboard, roles: ['ngo_user','donor_reviewer','oversight_body','admin'] },
  { name: "Proposals",     href: "/shared-portal/proposals",      icon: FileText,         roles: ['ngo_user','donor_reviewer','oversight_body','admin'] },
  { name: "Reports",       href: "/shared-portal/reports",        icon: BarChart,         roles: ['ngo_user','donor_reviewer','oversight_body','admin'] },
  { name: "Messages",      href: "/shared-portal/messages",       icon: MessageSquare,    roles: ['ngo_user','donor_reviewer','oversight_body','admin'] },
  { name: "Documents",     href: "/shared-portal/documents",      icon: FolderOpen,       roles: ['ngo_user','donor_reviewer','oversight_body','admin'] },
  { name: "Notifications", href: "/shared-portal/notifications",  icon: Bell,             roles: ['ngo_user','donor_reviewer','oversight_body','admin'] },
  { name: "Partners",      href: "/shared-portal/partners",       icon: Users,            roles: ['admin'] },
  { name: "Admin",         href: "/shared-portal/admin",          icon: Shield,           roles: ['admin'] },
  { name: "Settings",      href: "/shared-portal/settings",       icon: Settings,         roles: ['ngo_user','donor_reviewer','oversight_body','admin'] },
];

export function SharedPortalNavigation({ onNavigate }: SharedPortalNavigationProps) {
  const pathname = usePathname();
  const permissions = usePortalPermissions();

  const filteredItems = navigationItems.filter(item => {
    if (item.roles.includes('admin') && permissions.isAdmin) return true;
    if (item.roles.includes('ngo_user') && permissions.isNGOUser) return true;
    if (item.roles.includes('donor_reviewer') && permissions.isDonorReviewer) return true;
    if (item.roles.includes('oversight_body') && permissions.isOversightBody) return true;
    return false;
  });

  return (
    <nav className="grid gap-0.5">
      {filteredItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/shared-portal" && pathname.startsWith(item.href));

        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "text-white"
                : "text-muted-foreground hover:text-foreground"
            )}
            style={isActive
              ? { backgroundColor: "#C8793A" }      /* burnt orange active */
              : undefined
            }
            onMouseEnter={e => {
              if (!isActive)
                (e.currentTarget as HTMLElement).style.backgroundColor = "hsl(42 50% 92%)"; /* light sandy hover */
            }}
            onMouseLeave={e => {
              if (!isActive)
                (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
            }}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.name}
            {item.name === "Notifications" && (
              <span
                className="ml-auto flex h-4 w-4 items-center justify-center rounded-full text-[10px] text-white"
                style={{ backgroundColor: "#C8793A", outline: isActive ? "1px solid rgba(255,255,255,0.4)" : "none" }}
              >
                3
              </span>
            )}
            {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white opacity-60" />}
          </Link>
        );
      })}
    </nav>
  );
}
