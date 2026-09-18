import { ReactNode } from 'react';
import { usePortalPermissions } from '@/hooks/use-portal-permissions';

interface RoleBasedViewProps {
  children: ReactNode;
  roles: string[];
  fallback?: ReactNode;
}

export function RoleBasedView({ children, roles, fallback }: RoleBasedViewProps) {
  const permissions = usePortalPermissions();
  
  const hasAccess = () => {
    if (roles.includes('admin') && permissions.isAdmin) return true;
    if (roles.includes('ngo_user') && permissions.isNGOUser) return true;
    if (roles.includes('donor_reviewer') && permissions.isDonorReviewer) return true;
    if (roles.includes('oversight_body') && permissions.isOversightBody) return true;
    if (roles.includes('partner_user') && permissions.isPartnerUser) return true;
    return false;
  };
  
  if (hasAccess()) {
    return <>{children}</>;
  }
  
  return fallback ? <>{fallback}</> : null;
}
