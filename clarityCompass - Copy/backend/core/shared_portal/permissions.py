from rest_framework import permissions

class IsPortalUser(permissions.BasePermission):
    """Check if user has a shared portal profile"""
    
    def has_permission(self, request, view):
        return hasattr(request.user, 'shared_portal_profile')


class IsNGOUser(permissions.BasePermission):
    """Check if user is an NGO user"""
    
    def has_permission(self, request, view):
        if hasattr(request.user, 'shared_portal_profile'):
            return request.user.shared_portal_profile.role == 'ngo_user'
        return False


class IsPartnerUser(permissions.BasePermission):
    """Check if user is a partner (donor/oversight) user"""
    
    def has_permission(self, request, view):
        if hasattr(request.user, 'shared_portal_profile'):
            return request.user.shared_portal_profile.role in ['donor_reviewer', 'oversight_body']
        return False


class CanAccessProposal(permissions.BasePermission):
    """Check if user can access specific proposal"""
    
    def has_object_permission(self, request, view, obj):
        user_profile = request.user.shared_portal_profile
        
        if user_profile.role == 'ngo_user':
            return obj.ngo == user_profile.ngo
        elif user_profile.role in ['donor_reviewer', 'oversight_body']:
            return user_profile.organization in obj.partner_organizations.all()
        
        return False


class CanReviewProposal(permissions.BasePermission):
    """Check if user can review proposal"""
    
    def has_object_permission(self, request, view, obj):
        user_profile = request.user.shared_portal_profile
        
        if user_profile.role not in ['donor_reviewer', 'oversight_body']:
            return False
        
        return (
            user_profile.organization in obj.partner_organizations.all() and
            obj.status in ['submitted', 'under_review', 'returned_for_edits']
        )
    

    