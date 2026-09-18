'use client';

import {
  Home,
  FileText,
  BarChart,
  MessageSquare,
  FolderOpen,
  Settings,
  Users,
  Calendar,
  Upload,
  Download,
  PlusCircle,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { useSharedPortalAuth } from "@/app/shared-portal/auth-context";

const navItems = [
  {
    title: "Dashboard",
    icon: Home,
    href: "/shared-portal",
    roles: ['ngo_user', 'donor_reviewer', 'oversight_body', 'admin'],
  },
  {
    title: "Proposals",
    icon: FileText,
    href: "/shared-portal/proposals",
    roles: ['ngo_user', 'donor_reviewer', 'oversight_body', 'admin'],
  },
  {
    title: "Reports",
    icon: BarChart,
    href: "/shared-portal/reports",
    roles: ['ngo_user', 'donor_reviewer', 'oversight_body', 'admin'],
  },
  {
    title: "Messages",
    icon: MessageSquare,
    href: "/shared-portal/messages",
    roles: ['ngo_user', 'donor_reviewer', 'oversight_body', 'admin'],
  },
  {
    title: "Documents",
    icon: FolderOpen,
    href: "/shared-portal/documents",
    roles: ['ngo_user', 'donor_reviewer', 'oversight_body', 'admin'],
  },
  {
    title: "Partners",
    icon: Users,
    href: "/shared-portal/partners",
    roles: ['admin', 'ngo_user'],
  },
  {
    title: "Calendar",
    icon: Calendar,
    href: "/shared-portal/calendar",
    roles: ['ngo_user', 'donor_reviewer', 'oversight_body', 'admin'],
  },
  {
    title: "Users",
    icon: UserCheck,
    href: "/shared-portal/users",
    roles: ['admin'],
  },
  {
    title: "Settings",
    icon: Settings,
    href: "/shared-portal/settings",
    roles: ['ngo_user', 'donor_reviewer', 'oversight_body', 'admin'],
  },
];

export function SharedPortalSidebar() {
  const pathname = usePathname();
  const { user } = useSharedPortalAuth();

  if (!user) return null;

  const filteredNavItems = navItems.filter(item => 
    item.roles.includes(user.role)
  );

  return (
    <aside className="w-64 border-r">
      <div className="p-6">
        {user.role === 'ngo_user' && (
          <Button className="w-full mb-4" style={{backgroundColor:"#C8793A",color:"#fff",border:"none"}} asChild>
            <Link href="/shared-portal/proposals/new">
              <Upload className="mr-2 h-4 w-4" />
              Submit New Proposal
            </Link>
          </Button>
        )}
        <Button variant="outline" className="w-full" style={{borderColor:"#C8793A",color:"#C8793A"}} asChild>
          <Link href={user.role === 'ngo_user' ? "/shared-portal/reports/new" : "/shared-portal/documents"}>
            {user.role === 'ngo_user' ? (
              <>
                <Download className="mr-2 h-4 w-4" />
                Share Report
              </>
            ) : (
              <>
                <FolderOpen className="mr-2 h-4 w-4" />
                View Documents
              </>
            )}
          </Link>
        </Button>
      </div>
      
      <nav className="px-4">
        {filteredNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "text-white"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
              style={isActive ? { backgroundColor: "#C8793A" } : undefined}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 mt-6 border-t">
        <h3 className="text-xs font-semibold text-muted-foreground mb-2">
          Quick Stats
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Active Proposals</span>
            <span className="font-medium">--</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Pending Reviews</span>
            <span className="font-medium">--</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Unread Messages</span>
            <span className="font-medium">--</span>
          </div>
        </div>
      </div>
    </aside>
  );
}