import json
from django.utils import timezone
from .models import ActivityLog

class ActivityLoggingMiddleware:
    """Middleware to log all user activities"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        if request.path.startswith(('/static/', '/media/', '/admin/')):
            return self.get_response(request)
        
        response = self.get_response(request)
        
        if request.user.is_authenticated and hasattr(request.user, 'shared_portal_profile'):
            try:
                self._log_activity(request, response)
            except Exception:
                pass
        
        return response
    
    def _log_activity(self, request, response):
        user_profile = request.user.shared_portal_profile
        
        action_map = {
            'GET': 'read',
            'POST': 'create',
            'PUT': 'update',
            'PATCH': 'update',
            'DELETE': 'delete'
        }
        
        action_type = action_map.get(request.method, 'other')
        
        path_parts = request.path.strip('/').split('/')
        if len(path_parts) >= 2 and path_parts[0] == 'api':
            resource_type = path_parts[1]
        else:
            resource_type = 'unknown'
        
        resource_id = None
        if len(path_parts) >= 3 and path_parts[2].isdigit():
            resource_id = path_parts[2]
        
        description = f"{request.method} {request.path}"
        if request.method in ['POST', 'PUT', 'PATCH']:
            try:
                data = dict(request.POST) if request.POST else {}
                if request.body and not data:
                    try:
                        data = json.loads(request.body.decode('utf-8'))
                        sensitive_fields = ['password', 'token', 'secret', 'key']
                        for field in sensitive_fields:
                            if field in data:
                                data[field] = '***REDACTED***'
                    except:
                        data = {'raw_body': 'unparseable'}
                
                if data:
                    description += f" | Data: {str(data)[:200]}"
            except:
                pass
        
        ActivityLog.objects.create(
            user=user_profile,
            action_type=action_type,
            resource_type=resource_type,
            resource_id=resource_id or '',
            description=description[:500],
            ip_address=self._get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:500]
        )
    
    def _get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip