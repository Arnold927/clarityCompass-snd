'use client';

import { useSharedPortalAuth } from '@/app/shared-portal/auth-context';
import { Button } from '@/components/ui/button';

export function DebugAuth() {
  const { user, token, isAuthenticated, isLoading, logout } = useSharedPortalAuth();

  if (isLoading) {
    return <div>Loading auth...</div>;
  }

  return (
    <div className="fixed bottom-4 right-4 p-4 bg-white border rounded-lg shadow-lg z-50 max-w-sm">
      <h3 className="font-bold mb-2">Auth Debug</h3>
      <div className="space-y-2 text-sm">
        <div>
          <strong>Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}
        </div>
        <div>
          <strong>User:</strong> {user?.email || 'None'}
        </div>
        <div>
          <strong>Role:</strong> {user?.role || 'None'}
        </div>
        <div>
          <strong>Token:</strong> {token ? `${token.substring(0, 20)}...` : 'None'}
        </div>
        <div>
          <strong>LocalStorage:</strong>
          <div className="mt-1 p-2 bg-gray-100 rounded text-xs">
            <div>access: {localStorage.getItem('access') ? 'Yes' : 'No'}</div>
            <div>refresh: {localStorage.getItem('refresh') ? 'Yes' : 'No'}</div>
          </div>
        </div>
      </div>
      <Button onClick={logout} size="sm" className="mt-3 w-full">
        Logout
      </Button>
    </div>
  );
}