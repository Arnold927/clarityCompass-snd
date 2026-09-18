'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ngoAuth } from '@/lib/api';

export function NGOAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!ngoAuth.isAuthenticated()) {
      router.push('/login');
    }
  }, [router]);

  if (!mounted) return null;

  if (!ngoAuth.isAuthenticated()) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">Loading NGO authentication...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
