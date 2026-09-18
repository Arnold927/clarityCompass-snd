from rest_framework import serializers
from django.contrib.auth.models import User
from .models import *
from projects.serializers import ProjectSerializer
from organizations.serializers import OrganizationSerializer

class PartnerOrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = PartnerOrganization
        fields = ['id', 'name', 'email_domain', 'partner_type', 'is_active']


class SharedPortalUserSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_first_name = serializers.CharField(source='user.first_name', read_only=True)
    user_last_name = serializers.CharField(source='user.last_name', read_only=True)
    
    organization_name = serializers.SerializerMethodField()
    ngo_name = serializers.SerializerMethodField()
    
    def get_organization_name(self, obj):
        """Get organization name for partner users (donor_reviewer, oversight_body)"""
        if obj.role in ['donor_reviewer', 'oversight_body'] and obj.organization:
            return obj.organization.name
        return None
    
    def get_ngo_name(self, obj):
        """Get NGO name for ngo_user role"""
        if obj.role == 'ngo_user' and obj.ngo:
            return obj.ngo.name
        return None
    
    class Meta:
        model = SharedPortalUser
        fields = [
            'id', 'user', 'user_email', 'user_first_name', 'user_last_name',
            'organization', 'organization_name', 'ngo', 'ngo_name', 'role',
            'is_verified', 'last_login_at'
        ]
        read_only_fields = ['last_login_at']

class ProposalDocumentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.user.get_full_name', read_only=True)
    
    class Meta:
        model = ProposalDocument
        fields = [
            'id', 'document_type', 'file', 'file_name', 'file_size',
            'uploaded_by', 'uploaded_by_name', 'uploaded_at', 'version', 'is_current'
        ]
        read_only_fields = ['file_name', 'file_size', 'uploaded_at']


class ProposalFeedbackSerializer(serializers.ModelSerializer):
    reviewer_name = serializers.CharField(source='reviewer.user.get_full_name', read_only=True)
    reviewer_role = serializers.CharField(source='reviewer.role', read_only=True)
    reviewer_type = serializers.SerializerMethodField()
    reviewer_org = serializers.SerializerMethodField()
    reviewer_org_id = serializers.SerializerMethodField()
    
    class Meta:
        model = ProposalFeedback
        fields = [
            'id', 'reviewer', 'reviewer_name', 'reviewer_role', 'reviewer_type', 
            'reviewer_org', 'reviewer_org_id', 'feedback_text', 'action_required', 
            'status_change', 'created_at'
        ]
        read_only_fields = ['created_at']
    
    def get_reviewer_type(self, obj):
        """Get reviewer type from user profile"""
        if obj.reviewer and hasattr(obj.reviewer, 'user_type'):
            return obj.reviewer.user_type
        return None
    
    def get_reviewer_org(self, obj):
        """Get reviewer organization name"""
        if obj.reviewer and obj.reviewer.organization:
            return obj.reviewer.organization.name
        return None
    
    def get_reviewer_org_id(self, obj):
        """Get reviewer organization ID"""
        if obj.reviewer and obj.reviewer.organization:
            return obj.reviewer.organization.id
        return None

class CollaborationProposalSerializer(serializers.ModelSerializer):
    ngo_details = OrganizationSerializer(source='ngo', read_only=True)
    project_details = ProjectSerializer(source='project', read_only=True)
    partner_organizations_details = PartnerOrganizationSerializer(
        source='partner_organizations', many=True, read_only=True
    )
    documents = ProposalDocumentSerializer(many=True, read_only=True)
    feedback_history = ProposalFeedbackSerializer(many=True, read_only=True, source='feedback')
    created_by_name = serializers.CharField(source='created_by.user.get_full_name', read_only=True)
    days_until_deadline = serializers.SerializerMethodField()

    project_start_date = serializers.SerializerMethodField()
    project_end_date = serializers.SerializerMethodField()

    
    class Meta:
        model = CollaborationProposal
        fields = [
            'id', 'ngo', 'ngo_details', 'project', 'project_details',
            'project_start_date', 'project_end_date', 'title',
            'description', 'partner_organizations', 'partner_organizations_details',
            'status', 'submission_date', 'review_deadline', 'budget_amount',
            'currency', 'duration_months', 'current_version', 'documents',
            'feedback_history', 'created_by', 'created_by_name',
            'created_at', 'updated_at', 'days_until_deadline'
        ]
        read_only_fields = ['created_at', 'updated_at', 'current_version', 'ngo']
    
    def get_days_until_deadline(self, obj):
        if obj.review_deadline:
            from django.utils import timezone
            delta = obj.review_deadline - timezone.now()
            return delta.days
        return None
    
    def get_project_start_date(self, obj):
        """Get project start date if project exists"""
        if obj.project and hasattr(obj.project, 'start_date'):
            return obj.project.start_date
        return None
    
    def get_project_end_date(self, obj):
        """Get project end date if project exists"""
        if obj.project and hasattr(obj.project, 'end_date'):
            return obj.project.end_date
        return None
    
    def create(self, validated_data):
        partner_orgs = validated_data.pop('partner_organizations', [])
        proposal = CollaborationProposal.objects.create(**validated_data)
        proposal.partner_organizations.set(partner_orgs)
        return proposal


class ReportDocumentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.user.get_full_name', read_only=True)
    
    class Meta:
        model = ReportDocument
        fields = [
            'id', 'document_type', 'file', 'file_name', 'file_size',
            'uploaded_by', 'uploaded_by_name', 'uploaded_at'
        ]
        read_only_fields = ['file_name', 'file_size', 'uploaded_at']


class ReportFeedbackSerializer(serializers.ModelSerializer):
    reviewer_name = serializers.CharField(source='reviewer.user.get_full_name', read_only=True)
    reviewer_role = serializers.CharField(source='reviewer.role', read_only=True)
    
    class Meta:
        model = ReportFeedback
        fields = [
            'id', 'reviewer', 'reviewer_name', 'reviewer_role',
            'feedback_text', 'recommendations', 'status_change', 'created_at'
        ]
        read_only_fields = ['created_at']


class SharedReportSerializer(serializers.ModelSerializer):
    ngo_details = OrganizationSerializer(source='ngo', read_only=True)
    partner_organizations_details = PartnerOrganizationSerializer(
        source='partner_organizations', many=True, read_only=True
    )
    documents = ReportDocumentSerializer(many=True, read_only=True)
    feedback_history = ReportFeedbackSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source='created_by.user.get_full_name', read_only=True)
    days_until_deadline = serializers.SerializerMethodField()
    
    class Meta:
        model = SharedReport
        fields = [
            'id', 'ngo', 'ngo_details', 'report', 'title', 'period',
            'partner_organizations', 'partner_organizations_details',
            'status', 'submission_date', 'review_deadline', 'documents',
            'feedback_history', 'created_by', 'created_by_name',
            'created_at', 'updated_at', 'days_until_deadline'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_days_until_deadline(self, obj):
        if obj.review_deadline:
            from django.utils import timezone
            delta = obj.review_deadline - timezone.now()
            return delta.days
        return None


class PortalMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.user.get_full_name', read_only=True)
    sender_role = serializers.CharField(source='sender.role', read_only=True)
    recipient_name = serializers.CharField(source='recipient.user.get_full_name', read_only=True)
    recipient_role = serializers.CharField(source='recipient.role', read_only=True)
    
    class Meta:
        model = PortalMessage
        fields = [
            'id', 'sender', 'sender_name', 'sender_role',
            'recipient', 'recipient_name', 'recipient_role',
            'subject', 'content', 'related_proposal', 'related_report',
            'thread_id', 'parent_message', 'is_read', 'created_at'
        ]
        read_only_fields = ['created_at']


class NotificationSerializer(serializers.ModelSerializer):
    time_since = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = [
            'id', 'notification_type', 'title', 'message', 'link',
            'related_proposal', 'related_report', 'related_message',
            'is_read', 'created_at', 'time_since'
        ]
        read_only_fields = ['created_at']
    
    def get_time_since(self, obj):
        from django.utils import timezone
        from django.utils.timesince import timesince
        return timesince(obj.created_at, timezone.now())


class ActivityLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.user.get_full_name', read_only=True)
    time_since = serializers.SerializerMethodField()
    
    class Meta:
        model = ActivityLog
        fields = [
            'id', 'user', 'user_name', 'action_type', 'resource_type',
            'resource_id', 'description', 'ip_address', 'user_agent',
            'created_at', 'time_since'
        ]
        read_only_fields = ['created_at']
    
    def get_time_since(self, obj):
        from django.utils import timezone
        from django.utils.timesince import timesince
        return timesince(obj.created_at, timezone.now())