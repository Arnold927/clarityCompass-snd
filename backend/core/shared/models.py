from django.db import models
from django.contrib.auth.models import User
from django.forms import ValidationError
from projects.models import Project

from django.conf import settings
from django.utils import timezone
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.core.validators import MinValueValidator, MaxValueValidator

class Decision(models.Model):
    DECISION_STATUS = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('overdue', 'Overdue'),
        ('cancelled', 'Cancelled'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    
    DECISION_TYPES = [
        ('action_item', 'Action Item'),
        ('strategic_decision', 'Strategic Decision'),
        ('review_required', 'Review Required'),
        ('follow_up', 'Follow-up'),
        ('corrective_action', 'Corrective Action'),
    ]
    
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    decision_type = models.CharField(max_length=50, choices=DECISION_TYPES, default='action_item')
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='owned_decisions',
        help_text="Person responsible for this decision"
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_decisions',
        help_text="Person responsible for implementation"
    )
    stakeholders = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='stakeholder_decisions',
        blank=True,
        help_text="People who need to be informed"
    )    
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='decisions'
    )
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, null=True, blank=True)
    object_id = models.PositiveIntegerField(null=True, blank=True)
    related_object = GenericForeignKey('content_type', 'object_id')
    related_object_description = models.CharField(max_length=255, blank=True, help_text="Description of what this is linked to")    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deadline = models.DateField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)    
    status = models.CharField(max_length=20, choices=DECISION_STATUS, default='pending')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')    
    progress_percentage = models.IntegerField(default=0, validators=[MinValueValidator(0), MaxValueValidator(100)])    
    rationale = models.TextField(blank=True, help_text="Why this decision was made")
    expected_outcome = models.TextField(blank=True, help_text="What outcome is expected")
    actual_outcome = models.TextField(blank=True, help_text="What actually happened")    
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_decisions'
    )    
    days_to_complete = models.IntegerField(null=True, blank=True)
    is_recurring = models.BooleanField(default=False)
    recurrence_pattern = models.CharField(max_length=100, blank=True)    
    risk_level = models.CharField(max_length=20, choices=[
        ('low', 'Low'),
        ('medium', 'Medium'), 
        ('high', 'High')
    ], default='medium')
    
    impact_level = models.CharField(max_length=20, choices=[
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical')
    ], default='medium')    
    tags = models.ManyToManyField('Tag', blank=True)
    
    class Meta:
        ordering = ['-priority', 'deadline']
        indexes = [
            models.Index(fields=['status', 'deadline']),
            models.Index(fields=['owner', 'status']),
            models.Index(fields=['project', 'status']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.get_status_display()}"
    
    def save(self, *args, **kwargs):
        if self.deadline and self.status not in ['completed', 'cancelled']:
            if timezone.now().date() > self.deadline:
                self.status = 'overdue'
        
        if self.status == 'completed' and self.completed_at and not self.days_to_complete:
            created_date = self.created_at.date() if self.created_at else timezone.now().date()
            completed_date = self.completed_at.date()
            self.days_to_complete = (completed_date - created_date).days
        
        super().save(*args, **kwargs)
    
    def get_related_object_info(self):
        """Get info about the related object"""
        if self.content_type and self.object_id:
            try:
                obj = self.content_type.get_object_for_this_type(pk=self.object_id)
                return {
                    'type': self.content_type.model,
                    'id': self.object_id,
                    'name': str(obj),
                    'url': f"/{self.content_type.app_label}/{self.object_id}/"
                }
            except:
                return None
        return None
    
    def clean(self):
        if self.status == 'completed' and not self.actual_outcome:
            raise ValidationError("Actual outcome is required when marking complete")
        if self.deadline and self.deadline < timezone.now().date():
            if self.status not in ['completed', 'cancelled']:
                self.status = 'overdue'


class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ('decision_assigned', 'Decision Assigned'),
        ('decision_updated', 'Decision Updated'),
        ('deadline_approaching', 'Deadline Approaching'),
        ('decision_overdue', 'Decision Overdue'),
        ('new_comment', 'New Comment'),
        ('status_changed', 'Status Changed'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    notification_type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES)
    decision = models.ForeignKey(Decision, on_delete=models.CASCADE, null=True, blank=True)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.get_notification_type_display()} - {self.user.username}"


class DecisionUpdate(models.Model):
    """Track updates and comments on decisions"""
    decision = models.ForeignKey(Decision, on_delete=models.CASCADE, related_name='updates')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    update_text = models.TextField()
    attachment = models.FileField(upload_to='decision_updates/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']


class Tag(models.Model):
    """Tags for categorizing decisions"""
    name = models.CharField(max_length=50, unique=True)
    color = models.CharField(max_length=7, default='#3B82F6')
    description = models.TextField(blank=True)
    
    def __str__(self):
        return self.name

class ReportingSchedule(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, null=True, blank=True)
    name = models.CharField(max_length=255)
    recipient = models.CharField(max_length=100, blank=True, null=True)
    frequency = models.CharField(max_length=50, blank=True, null=True)

    def __str__(self):
        return self.name