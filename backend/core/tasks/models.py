from django.db import models
from strategic.models import IndicatorDisaggregation, Disaggregator
from projects.models import Project, ProjectIndicator, Location, ProjectOutputIndicator, ProjectTeamMember, ProjectOutput
from organizations.models import User
from django.db.models import Sum

class KeyActivity(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='activities')
    linked_project_indicator = models.ForeignKey(ProjectIndicator, null=True, blank=True, on_delete=models.SET_NULL)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    is_completed = models.BooleanField(default=False)
    
    def __str__(self):
      return self.name
    
    class Meta:
        verbose_name="Key Activity"
        verbose_name_plural="Key Activities"


class Task(models.Model):
    TASK_STATUS_CHOICES = [
        ('PLANNED', 'Planned'),
        ('ONGOING', 'Ongoing'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    ]
    activity = models.ForeignKey(KeyActivity, blank=True, null=True, on_delete=models.CASCADE, related_name='tasks')
    project = models.ForeignKey(Project, blank=True, null=True, on_delete=models.CASCADE, related_name='tasks')
    output = models.ForeignKey(ProjectOutput, blank=True, null=True, on_delete=models.SET_NULL, related_name='tasks')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    focal_person = models.ForeignKey(ProjectTeamMember, null=True, blank=True, on_delete=models.SET_NULL, related_name='tasks')
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    budget = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True, verbose_name='Budget')
    currency = models.CharField(
        max_length=10,
        blank=True,
        help_text="Inherited from the project. Cannot differ from project currency."
    )
    cumulative_spent = models.DecimalField(max_digits=15, decimal_places=2, default=0, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    location = models.ManyToManyField(Location)
    qaAdjustments = models.JSONField(default=dict, blank=True)
    status = models.CharField(
        max_length=20, 
        choices=TASK_STATUS_CHOICES, 
        default='PLANNED',
        blank=True,
        null=True
    )

    def __str__(self):
        activity_name = self.activity.name if self.activity else "No Activity"
        return f"{self.title} ({self.output})"
    
    def update_cumulative_spent(self):
        """Update the cached cumulative spent value"""
        from django.db.models import Sum
        from django.db.models.functions import Coalesce
        from decimal import Decimal
        
        total = self.updates.aggregate(
            total=Coalesce(Sum('amount_spent'), Decimal('0.00'))
        )['total']
        
        self.cumulative_spent = total
        Task.objects.filter(pk=self.pk).update(cumulative_spent=total)        
        self.refresh_from_db(fields=['cumulative_spent'])
        
        return total
    
    def get_cumulative_spent_display(self):
        """Helper method to get formatted cumulative spent"""
        return f"{self.cumulative_spent:,.2f}"
    
    def save(self, *args, **kwargs):
        # Always inherit currency from the parent project
        if self.project_id:
            project_currency = (
                self.project.currency
                if hasattr(self, '_project_cache') or self.project_id
                else None
            )
            try:
                from projects.models import Project as _Project
                project_currency = _Project.objects.values_list('currency', flat=True).get(pk=self.project_id)
            except Exception:
                project_currency = None
            if project_currency:
                self.currency = project_currency
        super().save(*args, **kwargs)


class TaskTOR(models.Model):
    """Model for Terms of Reference documents for tasks"""
    task = models.OneToOneField(
        Task, 
        on_delete=models.CASCADE, 
        related_name='tor'
    )
    file = models.FileField(upload_to='task_tors/%Y/%m/%d/')
    uploaded_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='uploaded_task_tors'
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    description = models.TextField(blank=True, null=True)
    
    def __str__(self):
        return f"TOR for {self.task.title}"
    
    @property
    def filename(self):
        return self.file.name.split('/')[-1] if self.file else None


class TaskCompletionReport(models.Model):
    """Model for post-visit task completion reports (after field visit)"""
    task = models.OneToOneField(
        Task, 
        on_delete=models.CASCADE, 
        related_name='completion_report'
    )
    activity_report = models.FileField(
        upload_to='task_activity_reports/%Y/%m/%d/',
        help_text="Upload activity report"
    )
    participants_list = models.FileField(
        upload_to='task_participants/%Y/%m/%d/',
        help_text="Upload participants list (Excel/PDF)"
    )
    submitted_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='submitted_completion_reports'
    )
    submitted_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True, null=True)
    
    def __str__(self):
        return f"Completion Report for {self.task.title}"
    
    @property
    def activity_report_filename(self):
        return self.activity_report.name.split('/')[-1] if self.activity_report else None
    
    @property
    def participants_filename(self):
        return self.participants_list.name.split('/')[-1] if self.participants_list else None


class TaskNotification(models.Model):
    """Model for tracking notifications sent to M&E"""
    NOTIFICATION_TYPES = [
        ('TOR_UPLOADED', 'TOR Uploaded'),
        ('REPORT_SUBMITTED', 'Report Submitted'),
        ('TASK_COMPLETED', 'Task Completed'),
    ]
    
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES)
    message = models.TextField()
    sent_to = models.ForeignKey(User, on_delete=models.CASCADE, related_name='task_notifications')
    sent_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"{self.notification_type} - {self.task.title}"
    
    class Meta:
        ordering = ['-sent_at']


class TaskIndicatorProgress(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='indicator_progress')
    output_indicator = models.ForeignKey(ProjectOutputIndicator, on_delete=models.CASCADE)
    target_contribution = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True)
    actual_contribution = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    notes = models.TextField(blank=True, null=True)
    
    class Meta:
        unique_together = ('task', 'output_indicator')
        
    def __str__(self):
        return f"{self.task.title} - {self.output_indicator.name}"


class TaskUpdate(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='updates')
    status_date = models.DateField()
    status = models.CharField(max_length=20)
    status_justification = models.TextField(blank=True, null=True)
    is_complete = models.BooleanField(default=False)
    amount_spent = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.task.title} - {self.status} on {self.status_date}"
    
    def clean(self):
        """Validate financial data"""
        from django.core.exceptions import ValidationError

        if self.amount_spent and self.amount_spent < 0:
            raise ValidationError({'amount_spent': 'Amount spent cannot be negative'})

        # amount_spent is always in the task's currency (which equals the project currency).
        # No separate currency field is needed on TaskUpdate — it is implied.
        
    def save(self, *args, **kwargs):
        self.full_clean()
        
        try:
            super().save(*args, **kwargs)
            self.task.update_cumulative_spent()
        except Exception as e:
            print(f"Warning: Failed to update cumulative_spent: {e}")
            super().save(*args, **kwargs)
    
    def delete(self, *args, **kwargs):
        task = self.task
        super().delete(*args, **kwargs)
        try:
            task.update_cumulative_spent()
        except Exception as e:
            print(f"Warning: Failed to update cumulative_spent on delete: {e}")

class TaskIndicatorDisaggregatedValue(models.Model):
    task_indicator_progress = models.ForeignKey(
        TaskIndicatorProgress, 
        on_delete=models.CASCADE, 
        related_name='disaggregated_values'
    )
    disaggregator = models.ForeignKey(Disaggregator, on_delete=models.CASCADE)
    target = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True)
    actual = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    
    class Meta:
        unique_together = ('task_indicator_progress', 'disaggregator')


class TaskIndicatorData(models.Model):
    task_update = models.ForeignKey(TaskUpdate, on_delete=models.CASCADE, related_name='indicator_data')
    indicator_disaggregation = models.ForeignKey(IndicatorDisaggregation, on_delete=models.CASCADE)
    value = models.DecimalField(max_digits=18, decimal_places=2)

    class Meta:
        unique_together = ('task_update','indicator_disaggregation')

    def __str__(self):
        return f"{self.task_update.task.title} - {self.indicator_disaggregation.project_indicator.name}"

class TaskReport(models.Model):
    task = models.ForeignKey('Task', on_delete=models.CASCADE, related_name='reports')
    indicator = models.ForeignKey('projects.ProjectIndicator', on_delete=models.CASCADE, null=True, blank=True)
    
    baseline_value = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text="Baseline value for this context"
    )
    target_value = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text="Target value for this context"
    )
    
    main_indicator_value = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text="Main/overall indicator value"
    )
    
    reported_data = models.JSONField(
        default=dict,
        help_text="Disaggregator values in {disagg_id: value} format"
    )
    
    is_baseline_set = models.BooleanField(default=False)
    submitted_by = models.ForeignKey('organizations.User', null=True, on_delete=models.SET_NULL)
    submitted_at = models.DateTimeField(auto_now_add=True)

    # class Meta:
    #     unique_together = ('task', 'indicator')

    def __str__(self):
        return f"Report: {self.task.title} - {self.indicator.name}"
    
    @property
    def corporate_indicator(self):
        """Get the CorporateIndicator through the ProjectIndicator"""
        return self.indicator.corporate_indicator if self.indicator else None
    
    @property
    def corporate_indicator_id(self):
        """Get the CorporateIndicator ID"""
        return self.indicator.corporate_indicator_id if self.indicator else None