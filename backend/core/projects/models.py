from django.db import models
from programs.models import Program, ProgramIndicator
from organizations.models import User
from strategic.models import CorporateIndicator, Disaggregator

class Donor(models.Model):
    DONOR_TYPES = [
        ('INDIVIDUAL', 'Individual'),
        ('FOUNDATION', 'Foundation'),
        ('CORPORATE', 'Corporate'),
        ('GOVERNMENT', 'Government'),
        ('NGO', 'NGO'),
    ]
    
    name = models.CharField(max_length=255)
    donor_type = models.CharField(max_length=20, choices=DONOR_TYPES, default='INDIVIDUAL')
    contact_info = models.TextField(blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True)
    website = models.URLField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name

class Project(models.Model):
    LIFECYCLE_STATUS_CHOICES = [
        ('PLANNED', 'Planned'),
        ('ACTIVE', 'Active'),
        ('ON_HOLD', 'On Hold'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    ]
    HEALTH_STATUS_CHOICES = [
        ('ON_TRACK', 'On-track'),
        ('AT_RISK', 'At risk'),
        ('OFF_TRACK', 'Off-track'),
    ]

    program = models.ForeignKey(Program, on_delete=models.CASCADE, related_name='projects')
    code = models.CharField(max_length=50, unique=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    manager = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='managed_projects')
    start_date = models.DateField()
    end_date = models.DateField()
    budget = models.IntegerField(blank=True, null=True)
    CURRENCY_CHOICES = [
        ('USD', 'US Dollar'),
        ('KES', 'Kenyan Shilling'),
        ('EUR', 'Euro'),
        ('GBP', 'British Pound'),
        ('ETB', 'Ethiopian Birr'),
        ('SSP', 'South Sudanese Pound'),
        ('UGX', 'Ugandan Shilling'),
        ('TZS', 'Tanzanian Shilling'),
    ]
    currency = models.CharField(
        max_length=10,
        blank=True,
        choices=CURRENCY_CHOICES,
        help_text="All task budgets and costs for this project will use this currency."
    )
    status = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    lifecycle_status = models.CharField(
        max_length=20, choices=LIFECYCLE_STATUS_CHOICES, default='PLANNED'
    )
    health_status = models.CharField(
        max_length=20, choices=HEALTH_STATUS_CHOICES, default='ON_TRACK'
    )
    donors = models.ManyToManyField(Donor, blank=True, related_name="projects")
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return f"{self.code} - {self.title}"

    def clean(self):
        from django.core.exceptions import ValidationError
        # Warn if tasks exist and someone tries to blank out the currency
        if not self.currency and self.pk:
            has_tasks = self.__class__.objects.filter(pk=self.pk).exists() and                         __import__('tasks.models', fromlist=['Task']).Task.objects.filter(project_id=self.pk).exists()
            if has_tasks:
                raise ValidationError({
                    'currency': (
                        'Cannot remove the currency from a project that already has tasks. '
                        'All task budgets are recorded in this currency.'
                    )
                })

class ProjectTeamMember(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="team_memberships")
    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    member_name = models.CharField(max_length=255, blank=True, null=True)
    role = models.CharField(max_length=100, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)

    def __str__(self):
        return self.user.username if self.user else self.member_name or "Unnamed Member"


class ProjectIndicator(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='indicators')
    program_indicator = models.ForeignKey(ProgramIndicator, null=True, blank=True, on_delete=models.SET_NULL)
    corporate_indicator = models.ForeignKey(CorporateIndicator, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="project_indicators"
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    is_donor_indicator = models.BooleanField(default=False)

    
    def __str__(self): 
        return self.name

class ProjectIndicatorTarget(models.Model):
    project_indicator = models.ForeignKey(ProjectIndicator, on_delete=models.CASCADE, related_name='targets')
    financial_year = models.IntegerField()
    quarter = models.CharField(max_length=2)
    value = models.DecimalField(max_digits=18, decimal_places=2)
    
    class Meta: 
        unique_together = ('project_indicator','financial_year','quarter')

    def __str__(self):
        return f"{self.project_indicator.name} - FY{self.financial_year} Q{self.quarter}"


class Location(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="locations")
    name = models.CharField(max_length=255)
    lat = models.FloatField(blank=True, null=True)
    lon = models.FloatField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class ProjectObjective(models.Model):
    project = models.ForeignKey('Project', on_delete=models.CASCADE, related_name='objectives')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name


class ProjectOutcome(models.Model):
    project_objective = models.ForeignKey(ProjectObjective, on_delete=models.CASCADE, related_name='outcomes')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name


class ProjectOutput(models.Model):
    project_outcome = models.ForeignKey(ProjectOutcome, on_delete=models.CASCADE, related_name='outputs')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name


class ProjectOutcomeIndicator(models.Model):
    outcome = models.ForeignKey(ProjectOutcome, on_delete=models.CASCADE, related_name='indicators')
    project_indicator = models.ForeignKey('ProjectIndicator', on_delete=models.CASCADE, null=True, blank=True, related_name='+')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    target = models.DecimalField(max_digits=18, decimal_places=2, blank=True, null=True)
    actual = models.DecimalField(max_digits=18, decimal_places=2, blank=True, null=True)
    disaggregators = models.ManyToManyField(Disaggregator, blank=True, related_name="outcome_indicators")

    class Meta:
        unique_together = ('outcome', 'name')

    def __str__(self):
        return self.name


class ProjectOutputIndicator(models.Model):
    output = models.ForeignKey('ProjectOutput', on_delete=models.CASCADE, related_name='indicators')
    project_indicator = models.ForeignKey('ProjectIndicator', on_delete=models.CASCADE, null=True, blank=True, related_name='+', verbose_name='Linked Project Indicator')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    target = models.DecimalField(max_digits=18, decimal_places=2, blank=True, null=True)
    actual = models.DecimalField(max_digits=18, decimal_places=2, blank=True, null=True)
    disaggregators = models.ManyToManyField(Disaggregator, blank=True, related_name="output_indicators")

    class Meta:
        unique_together = ('output', 'name')

    def __str__(self):
        return self.name



class IndicatorDisaggregatedValue(models.Model):
    outcome_indicator = models.ForeignKey(ProjectOutcomeIndicator, on_delete=models.CASCADE, null=True, blank=True, 
        related_name='disaggregated_values'
    )
    output_indicator = models.ForeignKey(ProjectOutputIndicator, on_delete=models.CASCADE, null=True, blank=True,
        related_name='disaggregated_values'
    )
    disaggregator = models.ForeignKey(Disaggregator, on_delete=models.CASCADE)
    target = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True)
    actual = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True)

    class Meta:
        unique_together = (
            'outcome_indicator',
            'output_indicator',
            'disaggregator',
        )



class ProjectReportingSchedule(models.Model):
    FREQUENCY_CHOICES = [
        ('DAILY', 'Daily'),
        ('WEEKLY', 'Weekly'),
        ('MONTHLY', 'Monthly'),
        ('QUARTERLY', 'Quarterly'),
        ('BI-ANNUALLY', 'Bi-Annually'),
        ('ANNUALLY', 'Annually'),
    ]

    project = models.ForeignKey(Project, related_name="reporting_schedules", on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    recipient = models.CharField(max_length=255)
    frequency = models.CharField(max_length=50, choices=FREQUENCY_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.project.title})"


class ProjectReportSubmission(models.Model):
    schedule = models.ForeignKey(ProjectReportingSchedule, related_name="submissions", on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to="reports/")
    notes = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=50, default="Pending Review")
    submitted_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return f"{self.title} ({self.schedule.name})"
    
class ProjectReportSubmissionHistory(models.Model):
    submission = models.ForeignKey(ProjectReportSubmission, related_name='history', on_delete=models.CASCADE)
    status = models.CharField(max_length=50)
    notes = models.TextField(blank=True, null=True)
    file = models.FileField(upload_to="reports/history/", null=True, blank=True)
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    reviewed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-reviewed_at']
        verbose_name = 'Project report submission history'
        verbose_name_plural = 'Project report submission histories'

    def __str__(self):
        reviewer = self.reviewed_by.username if self.reviewed_by else "Unknown"
        return f"{self.submission.title} | {self.status} by {reviewer} on {self.reviewed_at.strftime('%Y-%m-%d %H:%M')}"