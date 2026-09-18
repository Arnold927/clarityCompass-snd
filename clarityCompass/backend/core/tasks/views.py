from django.shortcuts import render, get_object_or_404
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import (
    KeyActivity, Task, TaskUpdate, TaskIndicatorData, TaskReport, TaskIndicatorProgress, TaskIndicatorDisaggregatedValue,
    TaskTOR, TaskCompletionReport, TaskNotification
)
from .serializers import (
    KeyActivitySerializer, TaskSerializer, TaskUpdateSerializer, TaskIndicatorDataSerializer, TaskReportSerializer,
    TaskIndicatorProgressSerializer, TaskCreateUpdateSerializer, TaskTORSerializer, TaskTORUploadSerializer, TaskCompletionReportSerializer,
    TaskNotificationSerializer, TaskCompletionReportSubmitSerializer
)
from rest_framework.response import Response
from rest_framework import viewsets, filters, status
from django_filters.rest_framework import DjangoFilterBackend
from strategic.models import Disaggregator
from projects.models import ProjectOutputIndicator
from projects.serializers import ProjectOutputIndicatorSerializer
from django.core.mail import send_mail, EmailMultiAlternatives
from django.conf import settings
from django.db import transaction
from django.contrib.auth import get_user_model
from django.utils.html import strip_tags

User = get_user_model()


class KeyActivityViewSet(viewsets.ModelViewSet):
    queryset = KeyActivity.objects.all()
    serializer_class = KeyActivitySerializer
    permission_classes = [IsAuthenticated]


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    filterset_fields = ['project', 'status']
    search_fields = ['title', 'description']

    def get_serializer_class(self):
        """Return different serializer for create/update operations"""
        if self.action in ['create', 'update', 'partial_update']:
            return TaskCreateUpdateSerializer
        return TaskSerializer

    def get_queryset(self):
        """Optionally filter queryset based on query parameters"""
        queryset = Task.objects.all()
        
        project_id = self.request.query_params.get('project')
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        
        activity_id = self.request.query_params.get('activity')
        if activity_id:
            queryset = queryset.filter(activity_id=activity_id)
        
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        
        # Filter tasks that need TOR (PLANNED and no TOR)
        needs_tor = self.request.query_params.get('needs_tor')
        if needs_tor == 'true':
            queryset = queryset.filter(status='PLANNED')
            # We'll filter further in Python since has_tor is not a DB field
            queryset = [task for task in queryset if not hasattr(task, 'tor') or not task.tor]
            # Return list instead of queryset for this special case
            return queryset
        
        # Filter tasks that need completion report (ONGOING and no report)
        needs_completion = self.request.query_params.get('needs_completion')
        if needs_completion == 'true':
            queryset = queryset.filter(status='ONGOING')
            # Filter in Python
            queryset = [task for task in queryset if not hasattr(task, 'completion_report') or not task.completion_report]
            return queryset
        
        return queryset

    def partial_update(self, request, *args, **kwargs):
        """Handle PATCH requests to update only qaAdjustments or other fields"""
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    # ============= NEW WORKFLOW ACTIONS =============

    @action(detail=True, methods=['post'], url_path='upload-tor')
    @transaction.atomic
    def upload_tor(self, request, pk=None):
        """
        Upload TOR for a task and mark as ONGOING.
        Notifies all users with app_role='me' by in-app notification + email.
        """
        task = self.get_object()

        if hasattr(task, 'tor') and task.tor:
            return Response(
                {'error': 'TOR already uploaded for this task'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = TaskTORUploadSerializer(
            data=request.data,
            context={'task': task}
        )

        if serializer.is_valid():
            tor = TaskTOR.objects.create(
                task=task,
                file=serializer.validated_data['file'],
                description=serializer.validated_data.get('description', ''),
                uploaded_by=request.user
            )

            task.status = 'ONGOING'
            task.save()

            # ── Find M&E users via app_role ──────────────────────────────────
            me_users = User.objects.filter(app_role='me', is_active=True, email__isnull=False).exclude(email='')
            if not me_users.exists():
                me_users = User.objects.filter(is_superuser=True, is_active=True)

            uploader_name = request.user.get_full_name() or request.user.username
            project_title = task.project.title if task.project else 'N/A'
            focal_person  = (
                task.focal_person.member_name
                if task.focal_person and task.focal_person.member_name
                else (task.focal_person.user.get_full_name() if task.focal_person and task.focal_person.user else 'Not assigned')
            )
            tor_url = request.build_absolute_uri(tor.file.url)
            portal_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')

            notifications_created = []
            for user in me_users:
                TaskNotification.objects.create(
                    task=task,
                    notification_type='TOR_UPLOADED',
                    message=f"TOR uploaded for task '{task.title}' by {uploader_name}. Click to review.",
                    sent_to=user
                )
                notifications_created.append(user.email)

                html_body = self._tor_uploaded_email(
                    recipient_name=user.get_full_name() or user.username,
                    task_title=task.title,
                    project_title=project_title,
                    focal_person=focal_person,
                    uploaded_by=uploader_name,
                    tor_url=tor_url,
                    portal_url=portal_url,
                )
                self._send_html_email(
                    to_email=user.email,
                    subject=f"[ClarityCompass] TOR Uploaded — {task.title}",
                    html_body=html_body,
                )

            return Response({
                'message': 'TOR uploaded successfully. Task status updated to ONGOING. M&E has been notified.',
                'tor': TaskTORSerializer(tor, context={'request': request}).data,
                'status': task.status,
                'notifications_sent': len(notifications_created),
            }, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='submit-completion-report')
    @transaction.atomic
    def submit_completion_report(self, request, pk=None):
        """
        Step 5: After field visit, upload activity report and participants list
        When this is done, the task is automatically updated to COMPLETED
        """
        task = self.get_object()
        
        # Check if completion report already exists
        if hasattr(task, 'completion_report') and task.completion_report:
            return Response(
                {'error': 'Completion report already submitted for this task'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if TOR exists (should be uploaded first)
        if not hasattr(task, 'tor') or not task.tor:
            return Response(
                {'error': 'Please upload TOR before submitting the completion report'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate using the serializer
        serializer = TaskCompletionReportSubmitSerializer(
            data=request.data,
            context={'task': task}
        )
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Create the completion report
            report = TaskCompletionReport.objects.create(
                task=task,
                activity_report=serializer.validated_data['activity_report'],
                participants_list=serializer.validated_data['participants_list'],
                notes=serializer.validated_data.get('notes', ''),
                submitted_by=request.user
            )

            # Update task status to COMPLETED
            task.status = 'COMPLETED'
            task.save()

            # ── Notify M&E users ─────────────────────────────────────────────
            me_users = User.objects.filter(app_role='me', is_active=True, email__isnull=False).exclude(email='')
            if not me_users.exists():
                me_users = User.objects.filter(is_superuser=True, is_active=True)

            submitter_name = request.user.get_full_name() or request.user.username
            project_title  = task.project.title if task.project else 'N/A'
            focal_person   = (
                task.focal_person.member_name
                if task.focal_person and task.focal_person.member_name
                else (task.focal_person.user.get_full_name() if task.focal_person and task.focal_person.user else 'Not assigned')
            )
            activity_report_url  = request.build_absolute_uri(report.activity_report.url)
            participants_url     = request.build_absolute_uri(report.participants_list.url)
            portal_url           = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')

            notifications_sent = []
            for user in me_users:
                TaskNotification.objects.create(
                    task=task,
                    notification_type='REPORT_SUBMITTED',
                    message=f"Completion report submitted for task '{task.title}' by {submitter_name}. Activity report and participants list are ready for download.",
                    sent_to=user
                )
                notifications_sent.append(user.email)

                html_body = self._report_submitted_email(
                    recipient_name=user.get_full_name() or user.username,
                    task_title=task.title,
                    project_title=project_title,
                    focal_person=focal_person,
                    submitted_by=submitter_name,
                    notes=report.notes or '',
                    activity_report_url=activity_report_url,
                    participants_url=participants_url,
                    portal_url=portal_url,
                )
                self._send_html_email(
                    to_email=user.email,
                    subject=f"[ClarityCompass] Completion Report Submitted — {task.title}",
                    html_body=html_body,
                )

            return Response({
                'message': 'Completion report submitted successfully. Task status updated to COMPLETED. M&E has been notified.',
                'completion_report': TaskCompletionReportSerializer(report, context={'request': request}).data,
                'status': task.status,
                'notifications_sent': len(notifications_sent),
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            print(f"Error creating completion report: {e}")
            import traceback
            traceback.print_exc()
            return Response(
                {'error': f'Failed to create completion report: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    
    @action(detail=True, methods=['get'], url_path='tor')
    def get_tor(self, request, pk=None):
        """Get TOR details for a task"""
        task = self.get_object()
        
        if not hasattr(task, 'tor') or not task.tor:
            return Response(
                {'error': 'No TOR found for this task'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = TaskTORSerializer(task.tor, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='completion-report')
    def get_completion_report(self, request, pk=None):
        """Get completion report details for a task"""
        task = self.get_object()
        
        if not hasattr(task, 'completion_report') or not task.completion_report:
            return Response(
                {'error': 'No completion report found for this task'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = TaskCompletionReportSerializer(task.completion_report, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='notifications')
    def get_notifications(self, request, pk=None):
        """Get all notifications for a task"""
        task = self.get_object()
        notifications = task.notifications.all()
        serializer = TaskNotificationSerializer(notifications, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='my-tasks')
    def my_tasks(self, request):
        """Get tasks assigned to the current user (as staff/focal person)"""
        try:
            from projects.models import ProjectTeamMember
            team_member = ProjectTeamMember.objects.get(user=request.user)
            tasks = Task.objects.filter(focal_person=team_member)
            serializer = self.get_serializer(tasks, many=True)
            return Response(serializer.data)
        except ProjectTeamMember.DoesNotExist:
            return Response([], status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='pending-tor')
    def pending_tor(self, request):
        """Get tasks that are planned but don't have TOR uploaded yet"""
        tasks = Task.objects.filter(status='PLANNED')
        tasks_without_tor = []
        for task in tasks:
            if not hasattr(task, 'tor') or not task.tor:
                tasks_without_tor.append(task)
        
        serializer = self.get_serializer(tasks_without_tor, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='pending-completion')
    def pending_completion(self, request):
        """Get tasks that are ongoing but don't have completion report yet"""
        tasks = Task.objects.filter(status='ONGOING')
        tasks_without_report = []
        for task in tasks:
            if not hasattr(task, 'completion_report') or not task.completion_report:
                tasks_without_report.append(task)
        
        serializer = self.get_serializer(tasks_without_report, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='notifications/mark-read')
    def mark_notifications_read(self, request, pk=None):
        """Mark notifications as read for a task"""
        task = self.get_object()
        
        serializer = NotificationMarkAsReadSerializer(data=request.data)
        if serializer.is_valid():
            notification_ids = serializer.validated_data.get('notification_ids', [])
            mark_all = serializer.validated_data.get('mark_all', False)
            
            if mark_all:
                notifications = task.notifications.filter(sent_to=request.user, is_read=False)
            else:
                notifications = task.notifications.filter(
                    id__in=notification_ids, 
                    sent_to=request.user, 
                    is_read=False
                )
            
            from django.utils import timezone
            count = notifications.update(is_read=True, read_at=timezone.now())
            
            return Response({
                'message': f'{count} notification(s) marked as read',
                'count': count
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='my-notifications')
    def my_notifications(self, request):
        """Get all notifications for the current user"""
        notifications = TaskNotification.objects.filter(sent_to=request.user).order_by('-sent_at')
        
        # Optional filtering by read status
        is_read = request.query_params.get('is_read')
        if is_read is not None:
            is_read_bool = is_read.lower() == 'true'
            notifications = notifications.filter(is_read=is_read_bool)
        
        # Optional filtering by task
        task_id = request.query_params.get('task_id')
        if task_id:
            notifications = notifications.filter(task_id=task_id)
        
        serializer = TaskNotificationSerializer(notifications, many=True)
        return Response(serializer.data)

    # ============= EXISTING INDICATOR ACTIONS (unchanged) =============

    @action(detail=True, methods=['post'])
    def link_indicator(self, request, pk=None):
        """Link an output indicator to this task and create disaggregated value records"""
        task = self.get_object()
        indicator_id = request.data.get('indicator_id')
        target_contribution = request.data.get('target_contribution', 0)
        
        if not indicator_id:
            return Response(
                {'error': 'indicator_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            indicator = ProjectOutputIndicator.objects.get(id=indicator_id)
            
            if task.output and indicator.output_id != task.output.id:
                return Response(
                    {'error': 'Indicator does not belong to this task\'s output'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            progress, created = TaskIndicatorProgress.objects.update_or_create(
                task=task,
                output_indicator=indicator,
                defaults={
                    'target_contribution': target_contribution,
                    'actual_contribution': 0
                }
            )
            
            if created:
                disaggregators = indicator.disaggregators.all()
                
                for disaggregator in disaggregators:
                    TaskIndicatorDisaggregatedValue.objects.create(
                        task_indicator_progress=progress,
                        disaggregator=disaggregator,
                        target=0,
                        actual=0
                    )
            
            serializer = TaskIndicatorProgressSerializer(progress)
            return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
            
        except ProjectOutputIndicator.DoesNotExist:
            return Response(
                {'error': 'Indicator not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'], url_path='indicators/(?P<progress_id>[^/.]+)/disaggregate-all')
    def add_all_disaggregated_values(self, request, pk=None, progress_id=None):
        """Add or update all disaggregated values for a progress record at once"""
        try:
            progress = TaskIndicatorProgress.objects.get(
                id=progress_id, 
                task_id=pk
            )
        except TaskIndicatorProgress.DoesNotExist:
            return Response(
                {'error': 'Progress record not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        values = request.data.get('values', [])
        updated_values = []
        
        for value_data in values:
            disaggregator_id = value_data.get('disaggregator_id')
            target = value_data.get('target', 0)
            actual = value_data.get('actual', 0)
            
            if not disaggregator_id:
                continue
            
            try:
                disaggregator = Disaggregator.objects.get(id=disaggregator_id)
                
                value, created = TaskIndicatorDisaggregatedValue.objects.update_or_create(
                    task_indicator_progress=progress,
                    disaggregator=disaggregator,
                    defaults={
                        'target': target,
                        'actual': actual
                    }
                )
                
                updated_values.append({
                    'id': value.id,
                    'disaggregator_id': value.disaggregator_id,
                    'disaggregator_name': value.disaggregator.name,
                    'target': value.target,
                    'actual': value.actual
                })
                
            except Disaggregator.DoesNotExist:
                continue
        
        return Response(updated_values, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'], url_path='indicators/(?P<progress_id>[^/.]+)/bulk-disaggregate')
    def bulk_add_disaggregated_values(self, request, pk=None, progress_id=None):
        """Add or update multiple disaggregated values in a single transaction"""
        try:
            progress = TaskIndicatorProgress.objects.get(
                id=progress_id, 
                task_id=pk
            )
        except TaskIndicatorProgress.DoesNotExist:
            return Response(
                {'error': 'Progress record not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        values = request.data.get('values', [])
        updated_values = []
        
        from django.db import transaction
        
        with transaction.atomic():
            for value_data in values:
                disaggregator_id = value_data.get('disaggregator_id')
                target = value_data.get('target', 0)
                actual = value_data.get('actual', 0)
                
                if not disaggregator_id:
                    continue
                
                try:
                    disaggregator = Disaggregator.objects.get(id=disaggregator_id)
                    
                    value, created = TaskIndicatorDisaggregatedValue.objects.update_or_create(
                        task_indicator_progress=progress,
                        disaggregator=disaggregator,
                        defaults={
                            'target': target,
                            'actual': actual
                        }
                    )
                    
                    updated_values.append({
                        'id': value.id,
                        'disaggregator_id': value.disaggregator_id,
                        'disaggregator_name': value.disaggregator.name,
                        'target': value.target,
                        'actual': value.actual
                    })
                    
                except Disaggregator.DoesNotExist:
                    continue
        
        return Response(updated_values, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='indicators/(?P<progress_id>[^/.]+)/bulk-update-actuals')
    def bulk_update_actuals(self, request, pk=None, progress_id=None):
        """Update multiple disaggregated actual values in a single transaction"""
        try:
            progress = TaskIndicatorProgress.objects.get(
                id=progress_id, 
                task_id=pk
            )
        except TaskIndicatorProgress.DoesNotExist:
            return Response(
                {'error': 'Progress record not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        values = request.data.get('values', [])
        updated_values = []
        
        from django.db import transaction
        
        with transaction.atomic():
            for value_data in values:
                disaggregator_id = value_data.get('disaggregator_id')
                actual = value_data.get('actual', 0)
                target = value_data.get('target', 0)
                
                if not disaggregator_id:
                    continue
                
                try:
                    disaggregator = Disaggregator.objects.get(id=disaggregator_id)
                    
                    value, created = TaskIndicatorDisaggregatedValue.objects.update_or_create(
                        task_indicator_progress=progress,
                        disaggregator=disaggregator,
                        defaults={
                            'target': target,
                            'actual': actual
                        }
                    )
                    
                    updated_values.append({
                        'id': value.id,
                        'disaggregator_id': value.disaggregator_id,
                        'disaggregator_name': value.disaggregator.name,
                        'target': value.target,
                        'actual': value.actual
                    })
                    
                except Disaggregator.DoesNotExist:
                    continue
        
        total_actual = sum(v['actual'] for v in updated_values)
        progress.actual_contribution = total_actual
        progress.save(update_fields=['actual_contribution'])
        
        return Response(updated_values, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def available_indicators(self, request, pk=None):
        """Get all indicators that can be linked to this task"""
        task = self.get_object()
        
        if not task.output:
            return Response([])
        
        all_indicators = ProjectOutputIndicator.objects.filter(output=task.output)
        
        linked_indicator_ids = TaskIndicatorProgress.objects.filter(
            task=task
        ).values_list('output_indicator_id', flat=True)
        
        available = all_indicators.exclude(id__in=linked_indicator_ids)
        
        serializer = ProjectOutputIndicatorSerializer(available, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='indicators/(?P<progress_id>[^/.]+)/disaggregate')
    def add_disaggregated_value(self, request, pk=None, progress_id=None):
        """Add disaggregated values to a task-indicator progress record"""
        try:
            progress = TaskIndicatorProgress.objects.get(
                id=progress_id, 
                task_id=pk
            )
        except TaskIndicatorProgress.DoesNotExist:
            return Response(
                {'error': 'Progress record not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        disaggregator_id = request.data.get('disaggregator_id')
        target = request.data.get('target', 0)
        actual = request.data.get('actual', 0)
        
        if not disaggregator_id:
            return Response(
                {'error': 'disaggregator_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            disaggregator = Disaggregator.objects.get(id=disaggregator_id)
            
            value, created = TaskIndicatorDisaggregatedValue.objects.update_or_create(
                task_indicator_progress=progress,
                disaggregator=disaggregator,
                defaults={
                    'target': target,
                    'actual': actual
                }
            )
            
            return Response({
                'id': value.id,
                'disaggregator_id': value.disaggregator_id,
                'disaggregator_name': value.disaggregator.name,
                'target': value.target,
                'actual': value.actual,
                'created': created
            }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
            
        except Disaggregator.DoesNotExist:
            return Response(
                {'error': 'Disaggregator not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )

    # ============= EMAIL HELPERS =============

    def _send_html_email(self, to_email: str, subject: str, html_body: str):
        """Send an HTML email with a plain-text fallback."""
        try:
            plain_body = strip_tags(html_body)
            msg = EmailMultiAlternatives(
                subject=subject,
                body=plain_body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[to_email],
            )
            msg.attach_alternative(html_body, "text/html")
            msg.send(fail_silently=False)
        except Exception as e:
            print(f"[ClarityCompass] Failed to send email to {to_email}: {e}")

    def _send_email_notification(self, to_email, subject, message):
        """Legacy plain-text helper kept for backward compatibility."""
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[to_email],
                fail_silently=True,
            )
        except Exception as e:
            print(f"Failed to send email: {e}")

    # ── HTML email templates ────────────────────────────────────────────────

    def _email_wrapper(self, title: str, colour: str, body_html: str) -> str:
        """Shared branded wrapper for all ClarityCompass emails."""
        return f"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>{title}</title>
</head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:{colour};padding:28px 36px;">
            <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.75);letter-spacing:1.5px;text-transform:uppercase;">ClarityCompass M&amp;E Portal</p>
            <h1 style="margin:6px 0 0;font-size:22px;color:#ffffff;font-weight:600;">{title}</h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 36px;color:#3D2B10;font-size:15px;line-height:1.7;">
            {body_html}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#F5F0E8;padding:20px 36px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9A7B5A;font-style:italic;">
              Confronting crisis &middot; Building Resilience &middot; Transforming lives
            </p>
            <p style="margin:6px 0 0;font-size:11px;color:#B89A78;">
              This is an automated message from ClarityCompass. Please do not reply.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""

    def _detail_row(self, label: str, value: str) -> str:
        return f"""
        <tr>
          <td style="padding:6px 12px 6px 0;color:#7A5A30;font-size:13px;white-space:nowrap;vertical-align:top;">{label}</td>
          <td style="padding:6px 0;font-size:14px;color:#2D1A08;font-weight:500;">{value}</td>
        </tr>"""

    def _action_button(self, label: str, url: str, colour: str = "#C8793A") -> str:
        return f"""
        <p style="text-align:center;margin:28px 0 8px;">
          <a href="{url}"
             style="display:inline-block;background:{colour};color:#ffffff;text-decoration:none;
                    padding:12px 30px;border-radius:6px;font-size:15px;font-weight:600;">
            {label}
          </a>
        </p>"""

    def _tor_uploaded_email(self, recipient_name, task_title, project_title,
                             focal_person, uploaded_by, tor_url, portal_url) -> str:
        details = (
            self._detail_row("Project:", project_title)
            + self._detail_row("Task:", task_title)
            + self._detail_row("Focal Person:", focal_person)
            + self._detail_row("Uploaded by:", uploaded_by)
        )
        body = f"""
        <p>Dear <strong>{recipient_name}</strong>,</p>
        <p>
          A <strong>Terms of Reference (TOR)</strong> has been uploaded for a field visit task.
          As an M&amp;E officer, please review it at your earliest convenience.
        </p>

        <table cellpadding="0" cellspacing="0" style="margin:20px 0;width:100%;">
          {details}
        </table>

        {self._action_button("Download TOR Document", tor_url, "#C8793A")}
        {self._action_button("Open Portal", portal_url, "#5A3010")}

        <p style="margin-top:24px;font-size:13px;color:#7A5A30;">
          The task status has been updated to <strong>Ongoing</strong>.
          You will receive another notification once the completion report is submitted.
        </p>"""
        return self._email_wrapper("TOR Uploaded — Action Required", "#C8793A", body)

    def _report_submitted_email(self, recipient_name, task_title, project_title,
                                  focal_person, submitted_by, notes,
                                  activity_report_url, participants_url, portal_url) -> str:
        details = (
            self._detail_row("Project:", project_title)
            + self._detail_row("Task:", task_title)
            + self._detail_row("Focal Person:", focal_person)
            + self._detail_row("Submitted by:", submitted_by)
            + (self._detail_row("Notes:", notes) if notes else "")
        )
        body = f"""
        <p>Dear <strong>{recipient_name}</strong>,</p>
        <p>
          A <strong>Completion Report</strong> has been submitted for the field visit task below.
          The activity report and participants list are now available for download.
        </p>

        <table cellpadding="0" cellspacing="0" style="margin:20px 0;width:100%;">
          {details}
        </table>

        <table cellpadding="0" cellspacing="0" style="width:100%;margin:24px 0;">
          <tr>
            <td style="padding-right:8px;">
              <a href="{activity_report_url}"
                 style="display:block;text-align:center;background:#4A7C59;color:#fff;text-decoration:none;
                        padding:11px 20px;border-radius:6px;font-size:14px;font-weight:600;">
                &#8595;&nbsp; Activity Report
              </a>
            </td>
            <td style="padding-left:8px;">
              <a href="{participants_url}"
                 style="display:block;text-align:center;background:#4A7C59;color:#fff;text-decoration:none;
                        padding:11px 20px;border-radius:6px;font-size:14px;font-weight:600;">
                &#8595;&nbsp; Participants List
              </a>
            </td>
          </tr>
        </table>

        {self._action_button("Open Portal", portal_url, "#5A3010")}

        <p style="margin-top:24px;font-size:13px;color:#7A5A30;">
          The task status has been updated to <strong>Completed</strong>.
        </p>"""
        return self._email_wrapper("Completion Report Submitted", "#4A7C59", body)

class TaskUpdateViewSet(viewsets.ModelViewSet):
    queryset = TaskUpdate.objects.all()
    serializer_class = TaskUpdateSerializer
    permission_classes = [IsAuthenticated]

class TaskIndicatorProgressViewSet(viewsets.ModelViewSet):
    queryset = TaskIndicatorProgress.objects.all()
    serializer_class = TaskIndicatorProgressSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['task', 'output_indicator']
    ordering_fields = ['id', 'task', 'output_indicator']

class TaskIndicatorDataViewSet(viewsets.ModelViewSet):
    queryset = TaskIndicatorData.objects.all()
    serializer_class = TaskIndicatorDataSerializer
    permission_classes = [IsAuthenticated]

class TaskReportViewSet(viewsets.ModelViewSet):
    queryset = TaskReport.objects.all()
    serializer_class = TaskReportSerializer
    permission_classes = [IsAuthenticated] 

    def perform_create(self, serializer):
        serializer.save(submitted_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(submitted_by=self.request.user)
    def get_queryset(self):
        queryset = super().get_queryset()
        
        task_id = self.request.query_params.get('task')
        indicator_id = self.request.query_params.get('indicator')
        
        if task_id:
            queryset = queryset.filter(task_id=task_id)
        if indicator_id:
            queryset = queryset.filter(indicator_id=indicator_id)
            
        return queryset
    
class UserRoleViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def can_edit_baseline_target(self, request):
        """Check if user can edit baseline/target for a specific indicator"""
        indicator_id = request.query_params.get('indicator_id')
        
        if not indicator_id:
            return Response({'error': 'indicator_id required'}, status=400)
        
        try:
            from strategic.models import CorporateIndicator
            indicator = CorporateIndicator.objects.get(id=indicator_id)
            
            from projects.models import ProjectIndicator
            project_indicator = ProjectIndicator.objects.filter(
                linked_corporate_indicator=indicator
            ).first()
            
            if not project_indicator or not project_indicator.project:
                return Response({'can_edit': False, 'reason': 'Project not found for this indicator'})
            
            project = project_indicator.project
            
            is_project_manager = project.team_memberships.filter(
                user=request.user,
                role='PROJECT_MANAGER'
            ).exists()
            
            return Response({
                'can_edit': is_project_manager,
                'project_id': project.id,
                'project_title': project.title
            })
            
        except CorporateIndicator.DoesNotExist:
            return Response({'error': 'Indicator not found'}, status=404)
        except Exception as e:
            return Response({'error': str(e)}, status=500)
        

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_indicator_baseline_target(request, indicator_id):
    """Update baseline and target values for an indicator"""
    try:
        from tasks.views import UserRoleViewSet
        from rest_framework.request import Request
        from rest_framework.test import APIRequestFactory
        
        factory = APIRequestFactory()
        mock_request = factory.get(f'/check/?indicator_id={indicator_id}')
        mock_request.user = request.user
        mock_request.query_params = {'indicator_id': indicator_id}
        
        role_viewset = UserRoleViewSet()
        permission_response = role_viewset.can_edit_baseline_target(mock_request)
        
        if not permission_response.data.get('can_edit', False):
            return Response({'error': 'Unauthorized'}, status=403)
        
        from strategic.models import CorporateIndicator, IndicatorDisaggregation
        indicator = CorporateIndicator.objects.get(id=indicator_id)
        
        updated_fields = []
        if 'baseline_value' in request.data:
            indicator.baseline_value = request.data['baseline_value']
            updated_fields.append('baseline_value')
        
        if 'target_value' in request.data:
            indicator.target_value = request.data['target_value']
            updated_fields.append('target_value')
        
        if updated_fields:
            indicator.save()
        
        disaggregator_updates = []
        if 'disaggregators' in request.data:
            for disagg_data in request.data['disaggregators']:
                disagg_id = disagg_data.get('id')
                try:
                    disagg = IndicatorDisaggregation.objects.get(
                        id=disagg_id,
                        indicator=indicator
                    )
                    
                    if 'baseline_value' in disagg_data:
                        disagg.baseline_value = disagg_data['baseline_value']
                    
                    if 'target_value' in disagg_data:
                        disagg.target_value = disagg_data['target_value']
                    
                    disagg.save()
                    disaggregator_updates.append(disagg_id)
                    
                except IndicatorDisaggregation.DoesNotExist:
                    continue
        
        return Response({
            'success': True,
            'message': f'Updated {len(updated_fields)} indicator fields and {len(disaggregator_updates)} disaggregators',
            'indicator': {
                'id': indicator.id,
                'baseline_value': indicator.baseline_value,
                'target_value': indicator.target_value
            }
        })
        
    except CorporateIndicator.DoesNotExist:
        return Response({'error': 'Indicator not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)



@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_baselines_and_targets(request):
    """
    Save baseline and target values for indicators and disaggregators
    """
    try:
        data = request.data
        task_id = data.get('task_id')
        project_indicator_id = data.get('indicator_id')
        
        if not task_id or not project_indicator_id:
            return Response({'error': 'task_id and indicator_id are required'}, status=400)
        
        from tasks.models import Task, TaskReport
        from strategic.models import IndicatorDisaggregation, Disaggregator
        from projects.models import ProjectIndicator
        
        task = get_object_or_404(Task, id=task_id)
        project_indicator = get_object_or_404(ProjectIndicator, id=project_indicator_id)
        
        if not task.activity or not task.activity.linked_project_indicator:
            return Response({'error': 'Task activity has no linked indicator'}, status=400)
        
        if task.activity.linked_project_indicator.id != project_indicator.id:
            return Response({
                'error': 'Indicator mismatch',
                'message': f'The indicator linked to the activity (ID: {task.activity.linked_project_indicator.id}) does not match the provided indicator (ID: {project_indicator.id})'
            }, status=400)
        
        task_report, created = TaskReport.objects.update_or_create(
            task=task,
            indicator=project_indicator,
            defaults={
                'baseline_value': data.get('main_baseline'),
                'target_value': data.get('main_target'),
                'main_indicator_value': None,
                'reported_data': {},
                'is_baseline_set': True,
                'submitted_by': request.user,
            }
        )
        
        
        updated_disaggregations = []
        
        if 'disaggregator_updates' in data:
            for disagg_update in data['disaggregator_updates']:
                disagg_id = disagg_update.get('id')
                baseline_value = disagg_update.get('baseline_value')
                target_value = disagg_update.get('target_value')
                
                if disagg_id is not None:
                    try:
                        disaggregator = Disaggregator.objects.get(id=disagg_id)
                        
                        indicator_disagg, created = IndicatorDisaggregation.objects.update_or_create(
                            project_indicator=project_indicator,
                            disaggregator=disaggregator,
                            defaults={
                                'baseline_value': baseline_value,
                                'target_value': target_value,
                                'notes': f'Baselines set via task {task.id} reporting'
                            }
                        )
                        
                        updated_disaggregations.append({
                            'id': indicator_disagg.id,
                            'disaggregator_id': disaggregator.id,
                            'disaggregator_name': disaggregator.name,
                            'baseline_value': baseline_value,
                            'target_value': target_value
                        })
                        
                    except Disaggregator.DoesNotExist:
                        print(f"Warning: Disaggregator {disagg_id} not found")
                        continue
        
        return Response({
            'success': True,
            'message': 'Baselines and targets saved successfully',
            'task_report_id': task_report.id,
            'project_indicator_id': project_indicator.id,
            'corporate_indicator_id': project_indicator.corporate_indicator.id if project_indicator.corporate_indicator else None,
            'main_baseline': task_report.baseline_value,
            'main_target': task_report.target_value,
            'updated_disaggregations': updated_disaggregations,
            'is_baseline_set': True
        })
        
    except Exception as e:
        print(f"Error in save_baselines_and_targets: {e}")
        import traceback
        traceback.print_exc()
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_task_report_data(request, task_id):
    """
    Get all report data for a task
    """
    try:
        from tasks.models import Task, TaskReport
        from strategic.models import CorporateIndicator, IndicatorDisaggregation, Disaggregator
        from projects.models import ProjectIndicator
        
        task = get_object_or_404(Task, id=task_id)
        
        response_data = {
            'task': {
                'id': task.id,
                'title': task.title,
                'activity_name': task.activity.name if task.activity else None,
                'start_date': task.start_date,
                'end_date': task.end_date,
            },
            'baselines_set': False,
            'main_indicator': {
                'baseline': None,
                'target': None,
                'reported_value': None
            },
            'disaggregators': [],
            'has_indicator': False,
            'reported_data': {}
        }
        
        project_indicator = None
        if task.activity and task.activity.linked_project_indicator:
            project_indicator = task.activity.linked_project_indicator
            response_data['has_indicator'] = True
            
            if project_indicator.corporate_indicator:
                response_data['indicator_name'] = project_indicator.corporate_indicator.name
                response_data['corporate_indicator_id'] = project_indicator.corporate_indicator.id
            elif project_indicator.name:
                response_data['indicator_name'] = project_indicator.name
            else:
                response_data['indicator_name'] = 'Unnamed Indicator'
            
            response_data['project_indicator_id'] = project_indicator.id
            
            task_report = TaskReport.objects.filter(
                task=task,
                indicator=project_indicator
            ).first()
            
            if task_report:
                response_data['baselines_set'] = task_report.is_baseline_set
                response_data['main_indicator']['baseline'] = task_report.baseline_value
                response_data['main_indicator']['target'] = task_report.target_value
                response_data['main_indicator']['reported_value'] = task_report.main_indicator_value
                response_data['reported_data'] = task_report.reported_data or {}
                response_data['task_report_id'] = task_report.id
            else:
                if project_indicator.corporate_indicator:
                    response_data['main_indicator']['baseline'] = project_indicator.corporate_indicator.baseline_value
                    response_data['main_indicator']['target'] = project_indicator.corporate_indicator.target_value
                else:
                    response_data['main_indicator']['baseline'] = None
                    response_data['main_indicator']['target'] = None
            
            indicator_disaggregations = IndicatorDisaggregation.objects.filter(
                project_indicator=project_indicator
            ).select_related('disaggregator')
            
            if indicator_disaggregations.exists():
                for ind_disagg in indicator_disaggregations:
                    disaggregator_data = {
                        'id': ind_disagg.disaggregator.id,
                        'name': ind_disagg.disaggregator.name,
                        'baseline': ind_disagg.baseline_value,
                        'target': ind_disagg.target_value
                    }
                    response_data['disaggregators'].append(disaggregator_data)
            elif project_indicator.corporate_indicator:
                for disaggregator in project_indicator.corporate_indicator.disaggregators.all():
                    disaggregator_data = {
                        'id': disaggregator.id,
                        'name': disaggregator.name,
                        'baseline': None,
                        'target': None
                    }
                    response_data['disaggregators'].append(disaggregator_data)
            else:
                response_data['disaggregators'] = []
                
        else:
            response_data['error'] = 'No indicator linked to this task'
            response_data['activity_id'] = task.activity.id if task.activity else None
            response_data['activity_name'] = task.activity.name if task.activity else None
        
        return Response(response_data)
        
    except Exception as e:
        print(f"Error in get_task_report_data: {e}")
        import traceback
        traceback.print_exc()
        return Response({'error': str(e)}, status=500)
    

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_task_report_history(request):
    """
    Get all historical reports for a task and indicator
    """
    try:
        from tasks.models import TaskReport
        from projects.models import ProjectIndicator
        
        task_id = request.GET.get('task_id')
        indicator_id = request.GET.get('indicator_id')
        
        if not task_id or not indicator_id:
            return Response({'error': 'task_id and indicator_id are required'}, status=400)
        
        project_indicator = get_object_or_404(ProjectIndicator, id=indicator_id)
        
        reports = TaskReport.objects.filter(
            task_id=task_id,
            indicator=project_indicator
        ).order_by('-submitted_at')
        
        report_data = []
        for report in reports:
            report_data.append({
                'id': report.id,
                'main_indicator_value': report.main_indicator_value,
                'reported_data': report.reported_data or {},
                'submitted_at': report.submitted_at,
                'submitted_by': {
                    'id': report.submitted_by.id,
                    'name': report.submitted_by.get_full_name() or report.submitted_by.username,
                    'email': report.submitted_by.email
                } if report.submitted_by else None,
                'notes': getattr(report, 'notes', None)
            })
        
        return Response(report_data)
        
    except Exception as e:
        print(f"Error in get_task_report_history: {e}")
        import traceback
        traceback.print_exc()
        return Response({'error': str(e)}, status=500)

