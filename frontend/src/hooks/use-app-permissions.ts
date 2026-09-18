'use client';
// src/hooks/use-app-permissions.ts
// Reads the current user's app_role from localStorage and returns typed
// permissions. Re-fetches from the API on mount if app_role is missing
// (handles users who were logged in before the RBAC upgrade).

import { useState, useEffect } from 'react';
import api, { ngoAuth } from '@/lib/api';
import { type AppRole, type RolePermissions, getPermissions } from '@/lib/rbac';

type PermissionsResult = RolePermissions & { role: AppRole | null; loaded: boolean };

export function useAppPermissions(): PermissionsResult {
  const [role, setRole] = useState<AppRole | null>(() => {
    // Read synchronously on first render (safe in client components)
    if (typeof window === 'undefined') return null;
    const userData = ngoAuth.getUser();
    return (userData?.app_role ?? null) as AppRole | null;
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const userData = ngoAuth.getUser();
    const storedRole = (userData?.app_role ?? null) as AppRole | null;

    if (storedRole) {
      // Already have it — no fetch needed
      setRole(storedRole);
      setLoaded(true);
      return;
    }

    // app_role missing (user logged in before RBAC upgrade) — fetch from API
    if (!ngoAuth.isAuthenticated()) {
      setLoaded(true);
      return;
    }

    api.get('/auth/me/')
      .then((res) => {
        const freshRole = (res.data?.app_role ?? null) as AppRole | null;
        setRole(freshRole);
        // Persist updated user data so future renders use it directly
        const existing = ngoAuth.getUser() ?? {};
        localStorage.setItem('ngo_user', JSON.stringify({ ...existing, ...res.data }));
      })
      .catch(() => {
        // Leave role as null — getPermissions will fall back to program_manager
      })
      .finally(() => {
        setLoaded(true);
      });
  }, []);

  return {
    ...getPermissions(role),
    role,
    loaded,
  };
}
