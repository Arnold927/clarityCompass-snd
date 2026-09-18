'use client';

import { SharedPortalHeader } from "@/components/shared-portal/shared-portal-header";
import { SharedPortalSidebar } from "@/components/shared-portal/shared-portal-sidebar";
import { ProtectedRoute } from '@/components/shared-portal/protected-route';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <SharedPortalHeader />
        <div className="flex">
          <SharedPortalSidebar />
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}