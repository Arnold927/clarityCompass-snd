from django.shortcuts import render
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count, Case, When, IntegerField, Prefetch
from django.utils import timezone
from .models import Decision, DecisionUpdate, Tag, Notification
from .serializers import DecisionSerializer, DecisionUpdateSerializer, TagSerializer, DashboardDecisionSerializer, UserSerializer, NotificationSerializer
from .filters import DecisionFilter
from django.contrib.auth import get_user_model
from rest_framework import permissions
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser  


class DecisionViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing decisions in the accountability ledger.
    """
    queryset = Decision.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = DecisionFilter
    search_fields = ['title', 'description', 'rationale', 'owner__username', 'assigned_to__username']
    ordering_fields = ['deadline', 'priority', 'created_at', 'updated_at']
    ordering = ['-priority', 'deadline']
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def get_serializer_class(self):
        if self.action == 'list' and self.request.query_params.get('dashboard'):
            return DashboardDecisionSerializer
        return DecisionSerializer
    
    def get_queryset(self):
        """
        Filter decisions based on user permissions and query parameters.
        """
        queryset = Decision.objects.all()
        
        queryset = queryset.select_related(
            'owner',
            'assigned_to',
            'created_by',
            'project',
        ).prefetch_related(
            'stakeholders',
            'tags',
            # 'updates',         # Reverse relationship to DecisionUpdate
            Prefetch('updates', queryset=DecisionUpdate.objects.select_related('user').order_by('-created_at')),
        )
        
        project_id = self.request.query_params.get('project_id')
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        
        priority_param = self.request.query_params.get('priority')
        if priority_param:
            queryset = queryset.filter(priority=priority_param)
        
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(Q(owner_id=user_id) | Q(assigned_to_id=user_id))
        
        if not self.request.user.is_superuser:
            queryset = queryset.filter(
                Q(owner=self.request.user) |
                Q(assigned_to=self.request.user) |
                Q(stakeholders=self.request.user) |
                Q(created_by=self.request.user)
            ).distinct()
        
        queryset = queryset.order_by('-priority', 'deadline')
        
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def add_update(self, request, pk=None):
        """Add an update/comment to a decision"""
        decision = self.get_object()
        serializer = DecisionUpdateSerializer(data=request.data)
        
        if serializer.is_valid():
            serializer.save(decision=decision, user=request.user)
            
            if 'status' in request.data:
                decision.status = request.data['status']
                if request.data['status'] == 'completed':
                    decision.completed_at = timezone.now()
                decision.save()
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def mark_complete(self, request, pk=None):
        """Mark a decision as complete"""
        decision = self.get_object()
        decision.status = 'completed'
        decision.completed_at = timezone.now()
        decision.progress_percentage = 100
        decision.save()
        
        DecisionUpdate.objects.create(
            decision=decision,
            user=request.user,
            update_text=f"Decision marked as completed. {request.data.get('completion_notes', '')}"
        )
        
        return Response({'status': 'completed', 'completed_at': decision.completed_at})
    
    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        """Get statistics for dashboard"""
        queryset = self.get_queryset()
        
        stats = {
            'total': queryset.count(),
            'completed': queryset.filter(status='completed').count(),
            'in_progress': queryset.filter(status='in_progress').count(),
            'overdue': queryset.filter(status='overdue').count(),
            'pending': queryset.filter(status='pending').count(),
            'by_priority': {
                'critical': queryset.filter(priority='critical').count(),
                'high': queryset.filter(priority='high').count(),
                'medium': queryset.filter(priority='medium').count(),
                'low': queryset.filter(priority='low').count(),
            },
            'by_type': dict(queryset.values_list('decision_type').annotate(count=Count('decision_type'))),
        }
        
        return Response(stats)
    
    @action(detail=False, methods=['get'])
    def my_tasks(self, request):
        """Get decisions assigned to the current user"""
        queryset = self.get_queryset().filter(
            Q(owner=request.user) | Q(assigned_to=request.user)
        ).distinct()
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


    @action(detail=True, methods=['post'])
    def update_progress(self, request, pk=None):
        """Update progress percentage"""
        decision = self.get_object()
        progress = request.data.get('progress_percentage')
        
        if progress is None:
            return Response(
                {'error': 'progress_percentage is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        decision.progress_percentage = progress
        
        if progress == 100:
            decision.status = 'completed'
            decision.completed_at = timezone.now()
        elif progress > 0 and decision.status == 'pending':
            decision.status = 'in_progress'
        
        decision.save()
        serializer = self.get_serializer(decision)
        return Response(serializer.data)
    

    @action(detail=True, methods=['get'])
    def comments(self, request, pk=None):
        """Get comments/updates for a decision"""
        decision = self.get_object()
        updates = decision.updates.all().order_by('-created_at')
        serializer = DecisionUpdateSerializer(updates, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_comment(self, request, pk=None):
        """Add a comment to a decision"""
        decision = self.get_object()
        serializer = DecisionUpdateSerializer(data=request.data)
        
        if serializer.is_valid():
            serializer.save(decision=decision, user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        """Get the history/audit trail for a decision"""
        decision = self.get_object()
        
        updates = decision.updates.all().order_by('-created_at')
        
        history_data = []
        for update in updates:
            history_data.append({
                'id': update.id,
                'decision_id': decision.id,
                'user_id': update.user.id,
                'action': 'comment',
                'changes': {
                    'update_text': update.update_text,
                },
                'created_at': update.created_at.isoformat(),
                'user_details': {
                    'id': update.user.id,
                    'username': update.user.username,
                    'full_name': f"{update.user.first_name} {update.user.last_name}".strip(),
                    'email': update.user.email
                }
            })
        
        history_data.append({
            'id': 0,
            'decision_id': decision.id,
            'user_id': decision.created_by.id,
            'action': 'created',
            'changes': {'title': decision.title, 'status': decision.status},
            'created_at': decision.created_at.isoformat(),
            'user_details': {
                'id': decision.created_by.id,
                'username': decision.created_by.username,
                'full_name': f"{decision.created_by.first_name} {decision.created_by.last_name}".strip(),
                'email': decision.created_by.email
            }
        })
        
        history_data.sort(key=lambda x: x['created_at'], reverse=True)
        
        return Response(history_data)


    def get_serializer(self, *args, **kwargs):
        if self.request.method in ['PUT', 'PATCH']:
            kwargs['partial'] = True
        return super().get_serializer(*args, **kwargs)

class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for notifications"""
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark notification as read"""
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'status': 'marked as read'})
    


class DecisionPermissions(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return (obj.owner == request.user or 
                obj.assigned_to == request.user or 
                obj.created_by == request.user or
                request.user.is_superuser)

class DecisionUpdateViewSet(viewsets.ModelViewSet):
    """API endpoint for decision updates"""
    queryset = DecisionUpdate.objects.all()
    serializer_class = DecisionUpdateSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        decision_id = self.request.query_params.get('decision_id')
        
        if decision_id:
            queryset = queryset.filter(decision_id=decision_id)
        
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class TagViewSet(viewsets.ModelViewSet):
    """API endpoint for tags"""
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [IsAuthenticated]

User = get_user_model()

class UserViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for listing users"""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return User.objects.filter(is_active=True)

