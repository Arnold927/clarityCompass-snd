from django.db import models
from organizations.models import User
from django.utils import timezone
from projects.models import Project, ProjectReportSubmission
from organizations.models import Organization

class PartnerOrganization(models.Model):
    """External partner organizations (donors, oversight bodies)"""
    name = models.CharField(max_length=255)
    email_domain = models.CharField(max_length=255, help_text="Email domain for user authentication")
    partner_type = models.CharField(max_length=50, choices=[
        ('donor', 'Donor'),
        ('oversight', 'Oversight Body'),
        ('government', 'Government Agency'),
        ('other', 'Other')
    ])
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name


class SharedPortalUser(models.Model):
    """Users who can access the shared portal"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='shared_portal_profile')
    organization = models.ForeignKey(PartnerOrganization, on_delete=models.CASCADE, null=True, blank=True)
    ngo = models.ForeignKey(Organization, on_delete=models.CASCADE, null=True, blank=True)
    role = models.CharField(max_length=50, choices=[
        ('ngo_user', 'NGO User'),
        ('donor_reviewer', 'Donor Reviewer'),
        ('oversight_body', 'Oversight Body'),
        ('admin', 'Administrator')
    ])
    is_verified = models.BooleanField(default=False)
    last_login_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.user.email} ({self.role})"


class CollaborationProposal(models.Model):
    """Proposals shared with external partners"""
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('under_review', 'Under Review'),
        ('returned_for_edits', 'Returned for Edits'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected')
    ]
    
    ngo = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='shared_proposals')
    project = models.ForeignKey(Project, on_delete=models.SET_NULL, null=True, blank=True)
    title = models.CharField(max_length=500)
    description = models.TextField()
    partner_organizations = models.ManyToManyField(PartnerOrganization, related_name='proposals')
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='draft')
    submission_date = models.DateTimeField(null=True, blank=True)
    review_deadline = models.DateTimeField(null=True, blank=True)
    budget_amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    duration_months = models.IntegerField()
    current_version = models.IntegerField(default=1)
    created_by = models.ForeignKey(SharedPortalUser, on_delete=models.SET_NULL, null=True, related_name='created_proposals')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-submission_date', '-created_at']

    def save(self, *args, **kwargs):
        if self.pk:
            old_status = CollaborationProposal.objects.get(pk=self.pk).status
            if old_status == 'returned_for_edits' and self.status == 'under_review':
                self.current_version += 1
        
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.title} ({self.get_status_display()})"


class ProposalDocument(models.Model):
    """Documents attached to proposals"""
    DOCUMENT_TYPES = [
        ('proposal', 'Proposal Document'),
        ('budget', 'Budget'),
        ('annex', 'Annex'),
        ('other', 'Other')
    ]
    
    proposal = models.ForeignKey(CollaborationProposal, on_delete=models.CASCADE, related_name='documents')
    document_type = models.CharField(max_length=50, choices=DOCUMENT_TYPES)
    file = models.FileField(upload_to='shared_portal/proposals/%Y/%m/%d/')
    file_name = models.CharField(max_length=255)
    file_size = models.IntegerField()
    uploaded_by = models.ForeignKey(SharedPortalUser, on_delete=models.SET_NULL, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    version = models.IntegerField(default=1)
    is_current = models.BooleanField(default=True)
    
    def __str__(self):
        return f"{self.file_name} (v{self.version})"


class ProposalFeedback(models.Model):
    """Feedback from partners on proposals"""
    proposal = models.ForeignKey(CollaborationProposal, on_delete=models.CASCADE, related_name='feedback')
    reviewer = models.ForeignKey(SharedPortalUser, on_delete=models.SET_NULL, null=True)
    feedback_text = models.TextField()
    action_required = models.JSONField(default=list, help_text="List of required actions")
    status_change = models.CharField(max_length=50, choices=CollaborationProposal.STATUS_CHOICES, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Feedback by {self.reviewer} on {self.proposal.title}"


class SharedReport(models.Model):
    """Reports shared with external partners"""
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('under_review', 'Under Review'),
        ('returned_for_edits', 'Returned for Edits'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected')
    ]
    
    ngo = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='shared_reports')
    report = models.ForeignKey(ProjectReportSubmission, on_delete=models.SET_NULL, null=True, blank=True, related_name='shared_versions')
    title = models.CharField(max_length=500)
    period = models.CharField(max_length=100, help_text="e.g., Q1 2024, Annual 2023")
    partner_organizations = models.ManyToManyField(PartnerOrganization, related_name='reports')
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='draft')
    submission_date = models.DateTimeField(null=True, blank=True)
    review_deadline = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(SharedPortalUser, on_delete=models.SET_NULL, null=True, related_name='created_reports')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-submission_date', '-created_at']
    
    def __str__(self):
        return f"{self.title} ({self.get_status_display()})"


class ReportDocument(models.Model):
    """Documents attached to reports"""
    DOCUMENT_TYPES = [
        ('report', 'Main Report'),
        ('financial', 'Financial Statement'),
        ('evidence', 'Supporting Evidence'),
        ('other', 'Other')
    ]
    
    shared_report = models.ForeignKey(SharedReport, on_delete=models.CASCADE, related_name='documents')
    document_type = models.CharField(max_length=50, choices=DOCUMENT_TYPES)
    file = models.FileField(upload_to='shared_portal/reports/%Y/%m/%d/')
    file_name = models.CharField(max_length=255)
    file_size = models.IntegerField()
    uploaded_by = models.ForeignKey(SharedPortalUser, on_delete=models.SET_NULL, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.file_name


class ReportFeedback(models.Model):
    """Feedback from partners on reports"""
    shared_report = models.ForeignKey(SharedReport, on_delete=models.CASCADE, related_name='feedback')
    reviewer = models.ForeignKey(SharedPortalUser, on_delete=models.SET_NULL, null=True)
    feedback_text = models.TextField()
    recommendations = models.JSONField(default=list, help_text="List of recommendations")
    status_change = models.CharField(max_length=50, choices=SharedReport.STATUS_CHOICES, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Feedback by {self.reviewer} on {self.shared_report.title}"


class PortalMessage(models.Model):
    """Messages between NGOs and partners"""
    sender = models.ForeignKey(SharedPortalUser, on_delete=models.CASCADE, related_name='sent_messages')
    recipient = models.ForeignKey(SharedPortalUser, on_delete=models.CASCADE, related_name='received_messages')
    subject = models.CharField(max_length=500)
    content = models.TextField()
    related_proposal = models.ForeignKey(CollaborationProposal, on_delete=models.SET_NULL, null=True, blank=True)
    related_report = models.ForeignKey(SharedReport, on_delete=models.SET_NULL, null=True, blank=True)
    thread_id = models.UUIDField(blank=True, null=True, help_text="For grouping messages in threads")
    parent_message = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='replies')
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.subject} - {self.sender} to {self.recipient}"


class Notification(models.Model):
    """User notifications"""
    NOTIFICATION_TYPES = [
        ('proposal_update', 'Proposal Update'),
        ('report_update', 'Report Update'),
        ('message', 'New Message'),
        ('deadline', 'Deadline Reminder'),
        ('feedback', 'New Feedback'),
        ('system', 'System Notification')
    ]
    
    user = models.ForeignKey(SharedPortalUser, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=255)
    message = models.TextField()
    link = models.CharField(max_length=500, blank=True, null=True)
    related_proposal = models.ForeignKey(CollaborationProposal, on_delete=models.SET_NULL, null=True, blank=True)
    related_report = models.ForeignKey(SharedReport, on_delete=models.SET_NULL, null=True, blank=True)
    related_message = models.ForeignKey(PortalMessage, on_delete=models.SET_NULL, null=True, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at', 'is_read']
    
    def __str__(self):
        return f"{self.notification_type}: {self.title}"


class ActivityLog(models.Model):
    """Audit log for all portal activities"""
    ACTION_TYPES = [
        ('create', 'Create'),
        ('update', 'Update'),
        ('delete', 'Delete'),
        ('submit', 'Submit'),
        ('review', 'Review'),
        ('download', 'Download'),
        ('login', 'Login'),
        ('logout', 'Logout')
    ]
    
    user = models.ForeignKey(SharedPortalUser, on_delete=models.SET_NULL, null=True)
    action_type = models.CharField(max_length=50, choices=ACTION_TYPES)
    resource_type = models.CharField(max_length=50)
    resource_id = models.CharField(max_length=100)
    description = models.TextField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user} {self.action_type} {self.resource_type}"