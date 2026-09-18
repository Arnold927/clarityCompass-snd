'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSharedPortalAuth } from '@/app/shared-portal/auth-context';
import { Loader2 } from 'lucide-react';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useSharedPortalAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [shouldRedirect, setShouldRedirect] = useState(false);

  const isPublicRoute = pathname === '/shared-portal/login' || 
                       pathname === '/shared-portal/register' ||
                       pathname === '/shared-portal/forgot-password';

  useEffect(() => {
    if (isPublicRoute) {
      setShouldRedirect(false);
      return;
    }

    if (!isLoading && !isAuthenticated) {
      setShouldRedirect(true);
    }
  }, [isAuthenticated, isLoading, isPublicRoute]);

  useEffect(() => {
    if (shouldRedirect) {
      router.push('/shared-portal/login');
    }
  }, [shouldRedirect, router]);

  if (!isPublicRoute && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading shared portal...</p>
        </div>
      </div>
    );
  }

  if (shouldRedirect) {
    return null;
  }

  return <>{children}</>;
}