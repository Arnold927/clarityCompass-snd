from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Count, F, Value, DateField
from django.db.models.functions import TruncMonth, TruncWeek
from django.utils import timezone
from django.http import HttpResponse
from datetime import datetime, timedelta
import csv
import openpyxl
from .models import Complaint, ComplaintFollowUp, ComplaintAttachment, ComplaintComment
from .serializers import (
    ComplaintListSerializer, ComplaintDetailSerializer,
    ComplaintCreateUpdateSerializer, ComplaintFollowUpSerializer,
    ComplaintAttachmentSerializer, ComplaintCommentSerializer,
    ComplaintStatsSerializer
)


class ComplaintViewSet(viewsets.ModelViewSet):
    """ViewSet for Complaint CRUD operations"""
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['case_id', 'full_name', 'description', 'phone_number']
    ordering_fields = ['created_at', 'updated_at', 'deadline', 'priority', 'status']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Filter queryset based on user permissions"""
        user = self.request.user
        
        queryset = Complaint.objects.select_related(
            'created_by', 'assigned_to', 'updated_by', 'project'
        ).prefetch_related(
            'followups', 'attachments', 'comments'
        )
        
        can_view_all = (
            user.is_superuser
            or getattr(user, 'app_role', None) in (
                'senior_management',
                'program_manager',
            )
            or user.has_perm('complaints.can_view_all_complaints')
        )
        if not can_view_all:
            queryset = queryset.filter(
                Q(assigned_to=user) | Q(created_by=user)
            )
        
        status_param = self.request.query_params.get('status')
        if status_param and status_param != 'all':
            queryset = queryset.filter(status=status_param)
        
        priority_param = self.request.query_params.get('priority')
        if priority_param and priority_param != 'all':
            queryset = queryset.filter(priority=priority_param)
        
        sensitivity_param = self.request.query_params.get('sensitivity_level')
        if sensitivity_param:
            queryset = queryset.filter(sensitivity_level=sensitivity_param)

        category_param = self.request.query_params.get('category')
        if category_param:
            queryset = queryset.filter(category=category_param)

        project_id_param = self.request.query_params.get('project_id')
        if project_id_param:
            if project_id_param == 'none':
                queryset = queryset.filter(project__isnull=True)
            else:
                queryset = queryset.filter(project_id=project_id_param)
        
        assigned_to_param = self.request.query_params.get('assigned_to')
        if assigned_to_param:
            if assigned_to_param == 'unassigned':
                queryset = queryset.filter(assigned_to__isnull=True)
            else:
                queryset = queryset.filter(assigned_to_id=assigned_to_param)
        
        date_from = self.request.query_params.get('date_from')
        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)
        
        date_to = self.request.query_params.get('date_to')
        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)
        
        if self.request.query_params.get('overdue') == 'true':
            today = timezone.now().date()
            queryset = queryset.filter(
                deadline__lt=today,
                status__in=['pending', 'in_progress']
            )
        
        return queryset
    
    @action(detail=True, methods=['get'])
    def debug_serializer(self, request, pk=None):
        """Debug endpoint to see serialized data"""
        complaint = self.get_object()
        serializer = ComplaintDetailSerializer(complaint, context={'request': request})
        
        return Response({
            'fields_present': list(serializer.data.keys()),
            'complainant_data': {
                'full_name': serializer.data.get('full_name'),
                'gender': serializer.data.get('gender'),
                'phone_number': serializer.data.get('phone_number'),
                'id_number': serializer.data.get('id_number'),
                'nationality': serializer.data.get('nationality'),
            }
        })
    
    def get_serializer_class(self):
        """Return different serializers for different actions"""
        if self.action == 'list':
            return ComplaintListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return ComplaintCreateUpdateSerializer
        return ComplaintDetailSerializer
    
    def perform_create(self, serializer):
        """Set created_by and updated_by on creation"""
        serializer.save(
            created_by=self.request.user,
            updated_by=self.request.user
        )
    
    def perform_update(self, serializer):
        """Set updated_by on update"""
        serializer.save(updated_by=self.request.user)
    
    @action(detail=False, methods=['get'])
    def my_tasks(self, request):
        """Get complaints assigned to current user"""
        complaints = self.get_queryset().filter(assigned_to=request.user)
        serializer = ComplaintListSerializer(complaints, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def overdue(self, request):
        """Get overdue complaints"""
        today = timezone.now().date()
        complaints = self.get_queryset().filter(
            deadline__lt=today,
            status__in=['pending', 'in_progress']
        )
        serializer = ComplaintListSerializer(complaints, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get statistics for dashboard"""
        user = request.user
        queryset = self.get_queryset()
        
        today = timezone.now().date()
        
        stats = {
            'total': queryset.count(),
            'pending': queryset.filter(status='pending').count(),
            'in_progress': queryset.filter(status='in_progress').count(),
            'completed': queryset.filter(status='completed').count(),
            'overdue': queryset.filter(
                deadline__lt=today,
                status__in=['pending', 'in_progress']
            ).count(),
            'my_tasks': queryset.filter(assigned_to=user).count(),
            'high_priority': queryset.filter(priority__in=['high', 'critical']).count(),
            'unassigned': queryset.filter(assigned_to__isnull=True).count(),
            'by_sensitivity': list(queryset.values('sensitivity_level').annotate(
                count=Count('id')
            ).order_by('sensitivity_level')),
            'by_category': list(queryset.values('category').annotate(
                count=Count('id')
            )),
            'by_status': list(queryset.values('status').annotate(
                count=Count('id')
            )),
            'by_priority': list(queryset.values('priority').annotate(
                count=Count('id')
            )),
        }
        
        serializer = ComplaintStatsSerializer(stats)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def assign(self, request, pk=None):
        """Assign complaint to a user"""
        complaint = self.get_object()
        user_id = request.data.get('user_id')
        
        if not user_id:
            return Response(
                {'error': 'user_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(id=user_id)
            complaint.assigned_to = user
            complaint.updated_by = request.user
            complaint.save()
            
            serializer = ComplaintDetailSerializer(complaint, context={'request': request})
            return Response(serializer.data)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'])
    def add_comment(self, request, pk=None):
        """Add comment to complaint"""
        complaint = self.get_object()
        content = request.data.get('content')
        
        if not content:
            return Response(
                {'error': 'content is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        comment = ComplaintComment.objects.create(
            complaint=complaint,
            user=request.user,
            content=content
        )
        
        serializer = ComplaintCommentSerializer(comment, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def add_followup(self, request, pk=None):
        """Add follow-up to complaint"""
        complaint = self.get_object()
        serializer = ComplaintFollowUpSerializer(data=request.data, context={'request': request})
        
        if serializer.is_valid():
            followup = serializer.save(
                complaint=complaint,
                followed_by=request.user
            )
            
            complaint.actions_taken = followup.action_taken
            complaint.updated_by = request.user
            complaint.save()
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def add_attachment(self, request, pk=None):
        """Add attachment to complaint"""
        complaint = self.get_object()
        serializer = ComplaintAttachmentSerializer(
            data=request.data,
            context={'request': request}
        )
        
        if serializer.is_valid():
            serializer.save(
                complaint=complaint,
                uploaded_by=request.user
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        """Close a complaint"""
        complaint = self.get_object()
        complaint.date_case_closed = timezone.now().date()
        complaint.status = 'completed'
        complaint.updated_by = request.user
        complaint.save()
        
        serializer = ComplaintDetailSerializer(complaint, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        """Export complaints to CSV"""
        complaints = self.get_queryset()
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="complaints_export.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            'Case ID', 'Status', 'Date Received', 'Channel', 'Full Name',
            'Gender', 'Phone', 'ID Number', 'Nationality', 'Feedback Type',
            'Geographic Area', 'Sensitivity Level', 'Category', 'Sub Category',
            'Description', 'Assigned To', 'Status', 'Priority', 'Created At'
        ])
        
        for complaint in complaints:
            writer.writerow([
                complaint.case_id,
                complaint.case_status,
                complaint.date_feedback_received.strftime('%Y-%m-%d %H:%M'),
                complaint.feedback_channel,
                complaint.full_name,
                complaint.gender,
                complaint.phone_number or '',
                complaint.id_number or '',
                complaint.nationality or '',
                complaint.feedback_type,
                complaint.geographic_area,
                complaint.sensitivity_level,
                complaint.category,
                complaint.sub_category,
                complaint.description[:100] + '...' if len(complaint.description) > 100 else complaint.description,
                complaint.assigned_to.username if complaint.assigned_to else '',
                complaint.status,
                complaint.priority,
                complaint.created_at.strftime('%Y-%m-%d %H:%M'),
            ])
        
        return response


class ComplaintFollowUpViewSet(viewsets.ModelViewSet):
    """ViewSet for Complaint Follow-ups"""
    permission_classes = [IsAuthenticated]
    serializer_class = ComplaintFollowUpSerializer
    
    def get_queryset(self):
        return ComplaintFollowUp.objects.filter(
            complaint_id=self.kwargs.get('complaint_pk')
        ).select_related('followed_by')
    
    def perform_create(self, serializer):
        serializer.save(
            complaint_id=self.kwargs.get('complaint_pk'),
            followed_by=self.request.user
        )


class ComplaintAttachmentViewSet(viewsets.ModelViewSet):
    """ViewSet for Complaint Attachments"""
    permission_classes = [IsAuthenticated]
    serializer_class = ComplaintAttachmentSerializer
    
    def get_queryset(self):
        return ComplaintAttachment.objects.filter(
            complaint_id=self.kwargs.get('complaint_pk')
        ).select_related('uploaded_by')
    
    def perform_create(self, serializer):
        serializer.save(
            complaint_id=self.kwargs.get('complaint_pk'),
            uploaded_by=self.request.user
        )


class ComplaintCommentViewSet(viewsets.ModelViewSet):
    """ViewSet for Complaint Comments"""
    permission_classes = [IsAuthenticated]
    serializer_class = ComplaintCommentSerializer
    
    def get_queryset(self):
        return ComplaintComment.objects.filter(
            complaint_id=self.kwargs.get('complaint_pk')
        ).select_related('user')
    
    def perform_create(self, serializer):
        serializer.save(
            complaint_id=self.kwargs.get('complaint_pk'),
            user=self.request.user
        )