import { useSharedPortalAuth } from "@/app/shared-portal/auth-context";

interface PortalPermissions {
  canViewProposals: boolean;
  canCreateProposals: boolean;
  canEditProposals: boolean;
  canSubmitProposals: boolean;
  canReviewProposals: boolean;
  
  canViewReports: boolean;
  canCreateReports: boolean;
  canReviewReports: boolean;
  
  canViewDashboard: boolean;
  canViewMessages: boolean;
  canViewNotifications: boolean;
  canViewDocuments: boolean;
  
  isNGOUser: boolean;
  isDonorReviewer: boolean;
  isOversightBody: boolean;
  isPartnerUser: boolean;
  isAdmin: boolean;
}

export function usePortalPermissions(): PortalPermissions {
  const { user } = useSharedPortalAuth();
  
  const role = user?.role || '';
  
  const isNGOUser = role === 'ngo_user';
  const isDonorReviewer = role === 'donor_reviewer';
  const isOversightBody = role === 'oversight_body';
  const isPartnerUser = isDonorReviewer || isOversightBody;
  const isAdmin = role === 'admin';
  
  return {
    canViewProposals: true,
    canCreateProposals: isNGOUser,
    canEditProposals: (isNGOUser),
    canSubmitProposals: isNGOUser,
    canReviewProposals: isPartnerUser,
    
    canViewReports: true,
    canCreateReports: isNGOUser,
    canReviewReports: isPartnerUser,
    
    canViewDashboard: true,
    canViewMessages: true,
    canViewNotifications: true,
    canViewDocuments: true,
    
    
    isNGOUser,
    isDonorReviewer,
    isOversightBody,
    isPartnerUser,
    isAdmin,
  };
}