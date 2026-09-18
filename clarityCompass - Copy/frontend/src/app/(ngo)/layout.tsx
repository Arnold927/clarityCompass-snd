"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { SharedPortalAuthProvider } from '@/app/shared-portal/auth-context';
import { Toaster } from '@/components/ui/toaster';
import { ngoAuth } from "@/lib/api";
import { type AppRole, getPermissions } from "@/lib/rbac";

// Pages only accessible to Program Managers and M&E (not Senior Management view-only)
// Data-collection: PM uploads deliverables, M&E views/downloads
const RESTRICTED_PATHS: { path: string; check: (perms: ReturnType<typeof getPermissions>) => boolean }[] = [
  {
    path: "/data-collection",
    check: (p) => p.canDocumentFieldVisit || p.isMEOfficer,
  },
];

function RoleAwareAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    if (!ngoAuth.isAuthenticated()) {
      router.push('/login');
      return;
    }

    const userData = ngoAuth.getUser();
    const role = (userData?.app_role ?? 'program_manager') as AppRole;
    const perms = getPermissions(role);

    for (const rule of RESTRICTED_PATHS) {
      if (pathname.startsWith(rule.path) && !rule.check(perms)) {
        router.replace('/dashboard');
        return;
      }
    }
  }, [pathname, router]);

  if (!mounted) return null;

  if (!ngoAuth.isAuthenticated()) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto" />
          <p className="mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function NGOLayout({ children }: { children: React.ReactNode }) {
  return (
    <SharedPortalAuthProvider>
      <RoleAwareAuthGuard>
        {children}
      </RoleAwareAuthGuard>
      <Toaster />
    </SharedPortalAuthProvider>
  );
}
