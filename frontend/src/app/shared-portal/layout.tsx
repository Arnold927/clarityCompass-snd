'use client';

import { SharedPortalAuthProvider } from './auth-context';
import { SharedPortalHeader } from "@/components/shared-portal/shared-portal-header";
import { SharedPortalSidebar } from "@/components/shared-portal/shared-portal-sidebar";
import { NotificationProvider } from "@/components/shared-portal/notification-provider";
import { ProtectedRoute } from '@/components/shared-portal/protected-route';
import { SharedPortalNavigation } from '@/components/shared-portal/navigation';
import { useSharedPortalAuth } from './auth-context';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";


export default function SharedPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SharedPortalAuthProvider>
      <NotificationProvider>
        <PortalLayoutContent>{children}</PortalLayoutContent>
      </NotificationProvider>
    </SharedPortalAuthProvider>
  );
}

function PortalLayoutContent({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useSharedPortalAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && 
        pathname?.startsWith('/shared-portal') &&
        !pathname.includes('/login') &&
        !pathname.includes('/register')) {
      router.push('/shared-portal/login');
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isAuthPage = pathname?.includes('/login') || pathname?.includes('/register');

  if (isAuthPage) {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Header */}
      <SharedPortalHeader />
      
      {/* Main Content Area */}
      <div className="flex">
        {/* Desktop Sidebar - Hidden on mobile */}
        <aside className={cn(
          "hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:z-40",
          "md:pt-16" // Account for fixed header
        )}>
          <div className="flex flex-col flex-1 min-h-0 border-r bg-background">
            {/* Sidebar Content */}
            <div className="flex flex-col flex-1 overflow-y-auto bg-white">
              {/* Logo/Sidebar Header */}
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold">Portal Navigation</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage your proposals and reports
                </p>
              </div>
              
              {/* Navigation */}
              <div className="p-4 flex-1">
                <SharedPortalNavigation />
              </div>
              
              {/* User Profile Footer */}
              <UserProfileSection />
            </div>
          </div>
        </aside>
        
        {/* Main Content */}
        <main className={cn(
          "flex-1",
          "md:ml-64", 
          "pt-16",
          "min-h-screen"
        )}>
          <div className="p-4 sm:p-6 md:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function UserProfileSection() {
  const { user, logout } = useSharedPortalAuth();

  if (!user) return null;

  const getUserOrganization = () => {
    switch(user.role) {
      case 'ngo_user':
        return user.ngo_name || user.ngoName || 'NGO';
      case 'donor_reviewer':
        return user.organization_name || user.organizationName || 'Donor';
      case 'oversight_body':
        return user.organization_name || user.organizationName || 'Oversight';
      default:
        return 'Organization';
    }
  };

  return (
    <div className="border-t p-4 bg-muted/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-medium text-primary">
              {user.firstName?.charAt(0) || user.ngoName?.charAt(0) || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {getUserOrganization()}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={logout}
          className="h-8 w-8"
          title="Logout"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

