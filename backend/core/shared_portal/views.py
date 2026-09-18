from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Count, Case, When, IntegerField
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from .models import *
from .serializers import *
from .permissions import *
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework.views import APIView
from django.db import transaction
from rest_framework.decorators import api_view, permission_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated



class CollaborationProposalViewSet(viewsets.ModelViewSet):
    """API endpoint for collaboration proposals"""
    queryset = CollaborationProposal.objects.all()
    serializer_class = CollaborationProposalSerializer
    permission_classes = [permissions.IsAuthenticated, IsPortalUser]
    
    def get_queryset(self):
        user = self.request.user.shared_portal_profile
        queryset = super().get_queryset()

        queryset = queryset.prefetch_related(
            'partner_organizations',
            'documents',
            'feedback',
            'feedback__reviewer',
            'feedback__reviewer__user',
            'feedback__reviewer__organization',
            'ngo',
            'ngo__users',
            'created_by',
            'created_by__user',
            'project'
        ).select_related(
            'ngo',
            'created_by',
            'project'
        )
        
        if user.role == 'ngo_user':
            queryset = queryset.filter(ngo=user.ngo)
        elif user.role in ['donor_reviewer', 'oversight_body']:
            queryset = queryset.filter(partner_organizations__in=[user.organization])
        
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        search_query = self.request.query_params.get('search')
        if search_query:
            queryset = queryset.filter(
                Q(title__icontains=search_query) |
                Q(description__icontains=search_query)
            )
        
        return queryset.distinct()
    
    def perform_create(self, serializer):
        user_profile = self.request.user.shared_portal_profile
        serializer.save(
            ngo=user_profile.ngo,
            created_by=user_profile,
            submission_date=timezone.now() if serializer.validated_data.get('status') == 'submitted' else None
        )
    
    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """Submit proposal for review"""
        proposal = self.get_object()
        user_profile = request.user.shared_portal_profile
        
        if user_profile.ngo != proposal.ngo:
            return Response(
                {'error': 'You can only submit proposals from your NGO'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        proposal.status = 'submitted'
        proposal.submission_date = timezone.now()
        proposal.save()
        
        self._notify_partners(proposal, 'submitted')
        
        return Response({'status': 'Proposal submitted successfully'})
    
    @action(detail=True, methods=['post'])
    def review(self, request, pk=None):
        """Submit review feedback"""
        proposal = self.get_object()
        user_profile = request.user.shared_portal_profile
        
        if user_profile.role not in ['donor_reviewer', 'oversight_body']:
            return Response(
                {'error': 'Only reviewers can submit feedback'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if user_profile.organization not in proposal.partner_organizations.all():
            return Response(
                {'error': 'You are not assigned to review this proposal'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = ProposalFeedbackSerializer(data=request.data)
        if serializer.is_valid():
            feedback = serializer.save(
                proposal=proposal,
                reviewer=user_profile
            )
            
            new_status = request.data.get('status_change')
            if new_status:
                proposal.status = new_status
                proposal.save()
            
            self._notify_ngo(proposal, 'feedback_received', feedback)
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def resubmit(self, request, pk=None):
        """Resubmit a proposal after edits"""
        proposal = self.get_object()
        user_profile = request.user.shared_portal_profile
        
        if user_profile.ngo != proposal.ngo:
            return Response(
                {'error': 'You can only resubmit proposals from your NGO'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if proposal.status != 'returned_for_edits':
            return Response(
                {'error': 'Only proposals returned for edits can be resubmitted'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        proposal.status = 'under_review'
        proposal.submission_date = timezone.now()
        proposal.save()
        
        self._notify_partners(proposal, 'resubmitted')
        
        return Response({'status': 'Proposal resubmitted successfully'})
    
    def _notify_partners(self, proposal, action):
        """Notify partner organizations about proposal updates"""
        for partner in proposal.partner_organizations.all():
            partner_users = SharedPortalUser.objects.filter(
                organization=partner,
                is_verified=True
            )
            
            for user in partner_users:
                Notification.objects.create(
                    user=user,
                    notification_type='proposal_update',
                    title=f'New Proposal: {proposal.title}',
                    message=f'A new proposal has been submitted by {proposal.ngo.name}',
                    link=f'/shared-portal/proposals/{proposal.id}',
                    related_proposal=proposal
                )
    
    def _notify_ngo(self, proposal, action, feedback):
        """Notify NGO about feedback"""
        ngo_users = SharedPortalUser.objects.filter(
            ngo=proposal.ngo,
            is_verified=True
        )
        
        for user in ngo_users:
            Notification.objects.create(
                user=user,
                notification_type='feedback',
                title=f'Feedback on Proposal: {proposal.title}',
                message=f'New feedback received from {feedback.reviewer.user.get_full_name()}',
                link=f'/shared-portal/proposals/{proposal.id}',
                related_proposal=proposal
            )

    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def documents(self, request, pk=None):
        """Upload a document to a proposal"""
        proposal = self.get_object()
        user_profile = request.user.shared_portal_profile
        
        if user_profile.ngo != proposal.ngo:
            return Response(
                {'error': 'You can only upload documents to your own proposals'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        file = request.FILES.get('file')
        if not file:
            return Response(
                {'error': 'No file provided'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        document = ProposalDocument.objects.create(
            proposal=proposal,
            file=file,
            document_type=request.data.get('document_type', 'proposal'),
            file_name=file.name,
            file_size=file.size,
            uploaded_by=user_profile
        )
        
        from .serializers import ProposalDocumentSerializer
        serializer = ProposalDocumentSerializer(document)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class SharedReportViewSet(viewsets.ModelViewSet):
    """API endpoint for shared reports"""
    queryset = SharedReport.objects.all()
    serializer_class = SharedReportSerializer
    permission_classes = [permissions.IsAuthenticated, IsPortalUser]
    
    def get_queryset(self):
        user = self.request.user.shared_portal_profile
        queryset = super().get_queryset()
        
        if user.role == 'ngo_user':
            queryset = queryset.filter(ngo=user.ngo)
        elif user.role in ['donor_reviewer', 'oversight_body']:
            queryset = queryset.filter(partner_organizations__in=[user.organization])
        
        period_filter = self.request.query_params.get('period')
        if period_filter:
            queryset = queryset.filter(period__icontains=period_filter)
        
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset.distinct()
    
    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """Submit report for review"""
        report = self.get_object()
        user_profile = request.user.shared_portal_profile
        
        if user_profile.ngo != report.ngo:
            return Response(
                {'error': 'You can only submit reports from your NGO'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        report.status = 'submitted'
        report.submission_date = timezone.now()
        report.save()
        
        self._notify_partners(report)
        
        return Response({'status': 'Report submitted successfully'})
    
    def _notify_partners(self, report):
        for partner in report.partner_organizations.all():
            partner_users = SharedPortalUser.objects.filter(
                organization=partner,
                is_verified=True
            )
            
            for user in partner_users:
                Notification.objects.create(
                    user=user,
                    notification_type='report_update',
                    title=f'New Report: {report.title}',
                    message=f'A new report has been submitted by {report.ngo.name}',
                    link=f'/shared-portal/reports/{report.id}',
                    related_report=report
                )


class PortalMessageViewSet(viewsets.ModelViewSet):
    """API endpoint for portal messages"""
    queryset = PortalMessage.objects.all()
    serializer_class = PortalMessageSerializer
    permission_classes = [permissions.IsAuthenticated, IsPortalUser]
    
    def get_queryset(self):
        user = self.request.user.shared_portal_profile
        queryset = super().get_queryset()
        
        queryset = queryset.filter(
            Q(sender=user) | Q(recipient=user)
        )
        
        thread_id = self.request.query_params.get('thread_id')
        if thread_id:
            queryset = queryset.filter(thread_id=thread_id)
        
        related_proposal = self.request.query_params.get('related_proposal')
        if related_proposal:
            queryset = queryset.filter(related_proposal_id=related_proposal)
        
        related_report = self.request.query_params.get('related_report')
        if related_report:
            queryset = queryset.filter(related_report_id=related_report)
        
        return queryset
    
    def perform_create(self, serializer):
        sender = self.request.user.shared_portal_profile
        message = serializer.save(sender=sender)
        
        Notification.objects.create(
            user=message.recipient,
            notification_type='message',
            title=f'New Message: {message.subject}',
            message=message.content[:100] + '...',
            link=f'/shared-portal/messages/{message.id}',
            related_message=message
        )
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark message as read"""
        message = self.get_object()
        user = request.user.shared_portal_profile
        
        if message.recipient == user:
            message.is_read = True
            message.save()
            return Response({'status': 'Message marked as read'})
        
        return Response(
            {'error': 'You are not the recipient of this message'},
            status=status.HTTP_403_FORBIDDEN
        )


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for notifications"""
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated, IsPortalUser]
    
    queryset = Notification.objects.all()
    def get_queryset(self):
        user = self.request.user.shared_portal_profile
        return Notification.objects.filter(user=user)
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get count of unread notifications"""
        user = request.user.shared_portal_profile
        count = Notification.objects.filter(user=user, is_read=False).count()
        return Response({'count': count})
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all notifications as read"""
        user = request.user.shared_portal_profile
        Notification.objects.filter(user=user, is_read=False).update(is_read=True)
        return Response({'status': 'All notifications marked as read'})


class DashboardViewSet(viewsets.ViewSet):
    """API endpoint for dashboard data"""
    permission_classes = [permissions.IsAuthenticated, IsPortalUser]
    
    def list(self, request):
        """Get dashboard statistics"""
        user = request.user.shared_portal_profile
        
        if user.role == 'ngo_user':
            data = {
                'active_proposals': CollaborationProposal.objects.filter(
                    ngo=user.ngo,
                    status__in=['submitted', 'under_review']
                ).count(),
                'pending_reports': SharedReport.objects.filter(
                    ngo=user.ngo,
                    status__in=['submitted', 'under_review']
                ).count(),
                'unread_messages': PortalMessage.objects.filter(
                    recipient=user,
                    is_read=False
                ).count(),
                'upcoming_deadlines': CollaborationProposal.objects.filter(
                    ngo=user.ngo,
                    review_deadline__gte=timezone.now(),
                    review_deadline__lte=timezone.now() + timezone.timedelta(days=7)
                ).count(),
                'recent_proposals': CollaborationProposalSerializer(
                    CollaborationProposal.objects.filter(ngo=user.ngo).order_by('-created_at')[:5],
                    many=True,
                    context={'request': request}
                ).data,
                'recent_reports': SharedReportSerializer(
                    SharedReport.objects.filter(ngo=user.ngo).order_by('-created_at')[:5],
                    many=True,
                    context={'request': request}
                ).data
            }
        else:
            data = {
                'active_proposals': CollaborationProposal.objects.filter(
                    partner_organizations=user.organization,
                    status__in=['submitted', 'under_review']
                ).count(),
                'pending_reports': SharedReport.objects.filter(
                    partner_organizations=user.organization,
                    status__in=['submitted', 'under_review']
                ).count(),
                'unread_messages': PortalMessage.objects.filter(
                    recipient=user,
                    is_read=False
                ).count(),
                'overdue_reviews': CollaborationProposal.objects.filter(
                    partner_organizations=user.organization,
                    review_deadline__lt=timezone.now(),
                    status='under_review'
                ).count(),
                'recent_proposals': CollaborationProposalSerializer(
                    CollaborationProposal.objects.filter(
                        partner_organizations=user.organization
                    ).order_by('-created_at')[:5],
                    many=True,
                    context={'request': request}
                ).data,
                'recent_reports': SharedReportSerializer(
                    SharedReport.objects.filter(
                        partner_organizations=user.organization
                    ).order_by('-created_at')[:5],
                    many=True,
                    context={'request': request}
                ).data
            }
        
        return Response(data)
    


class CustomAuthToken(ObtainAuthToken):
    """Custom authentication that checks shared portal access"""
    
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data,
                                           context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        
        try:
            portal_user = SharedPortalUser.objects.get(user=user)
            portal_user.last_login_at = timezone.now()
            portal_user.save()
        except SharedPortalUser.DoesNotExist:
            return Response(
                {'error': 'User does not have access to shared portal'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        token, created = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user_id': user.pk,
            'email': user.email,
            'role': portal_user.role,
            'organization_id': portal_user.organization.id if portal_user.organization else None,
            'ngo_id': portal_user.ngo.id if portal_user.ngo else None,
        })


class RegisterView(APIView):
    """Register new shared portal users"""
    
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        organization_id = request.data.get('organization_id')
        ngo_id = request.data.get('ngo_id')
        role = request.data.get('role')
        
        if not all([email, password, role]):
            return Response(
                {'error': 'Email, password, and role are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if role in ['donor_reviewer', 'oversight_body'] and organization_id:
            try:
                organization = PartnerOrganization.objects.get(id=organization_id)
                email_domain = email.split('@')[1]
                if email_domain != organization.email_domain:
                    return Response(
                        {'error': 'Email domain does not match organization'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            except PartnerOrganization.DoesNotExist:
                return Response(
                    {'error': 'Invalid organization'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        if role == 'ngo_user' and ngo_id:
            try:
                ngo = Organization.objects.get(id=ngo_id)
            except Organization.DoesNotExist:
                return Response(
                    {'error': 'Invalid NGO'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        with transaction.atomic():
            user = User.objects.create_user(
                username=email,
                email=email,
                password=password,
                first_name=request.data.get('first_name', ''),
                last_name=request.data.get('last_name', '')
            )
            
            portal_user = SharedPortalUser.objects.create(
                user=user,
                role=role,
                is_verified=False
            )
            
            if role in ['donor_reviewer', 'oversight_body'] and organization_id:
                portal_user.organization_id = organization_id
            elif role == 'ngo_user' and ngo_id:
                portal_user.ngo_id = ngo_id
            
            portal_user.save()
        
        self._send_verification_email(portal_user)
        
        return Response(
            {'message': 'Registration successful. Please wait for verification.'},
            status=status.HTTP_201_CREATED
        )
    
    def _send_verification_email(self, portal_user):
        subject = 'Shared Portal Registration - Verification Required'
        message = f"""
        Hello {portal_user.user.get_full_name()},
        
        Your registration for the ClarityCompass Shared Portal has been received.
        Your account will be activated once verified by an administrator.
        
        Role: {portal_user.get_role_display()}
        Organization: {portal_user.organization.name if portal_user.organization else portal_user.ngo.name if portal_user.ngo else 'N/A'}
        
        You will receive another email once your account is activated.
        
        Regards,
        ClarityCompass Team
        """
        
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [portal_user.user.email],
            fail_silently=False,
        )

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_partner_organizations(request):
    """Get list of partner organizations"""
    partners = PartnerOrganization.objects.filter(is_active=True)
    serializer = PartnerOrganizationSerializer(partners, many=True)
    return Response(serializer.data)


class SharedPortalCurrentUserView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            portal_user = request.user.shared_portal_profile
            serializer = SharedPortalUserSerializer(portal_user)
            return Response(serializer.data)
        except:
            return Response(
                {'error': 'User does not have a shared portal profile'},
                status=404
            )
        



