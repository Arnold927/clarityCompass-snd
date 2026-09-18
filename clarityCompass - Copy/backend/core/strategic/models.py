from django.db import models
from organizations.models import Organization
from django.core.exceptions import ValidationError

class StrategicPlan(models.Model):
    org = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='strategic_plans')
    title = models.CharField(max_length=255)
    version = models.CharField(max_length=50, blank=True, null=True)
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=False)
    overall_objective = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self): 
        return self.title

class StrategicObjective(models.Model):
    plan = models.ForeignKey(StrategicPlan, on_delete=models.CASCADE, related_name='objectives')
    number = models.CharField(max_length=20)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    
    class Meta: 
        unique_together = ('plan','number')
    def __str__(self):
        return f"{self.name} - {self.number}"

class Disaggregator(models.Model):
    org = models.ForeignKey(Organization, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    
    class Meta: 
        unique_together = ('org','name')
    
    def __str__(self): 
        return self.name
    
class IndicatorDisaggregation(models.Model):
    project_indicator = models.ForeignKey('projects.ProjectIndicator', on_delete=models.CASCADE, related_name='disaggregations')
    disaggregator = models.ForeignKey('strategic.Disaggregator', on_delete=models.CASCADE)
    baseline_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    target_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    reported_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        unique_together = ('project_indicator', 'disaggregator')
    
    def __str__(self):
        return f"{self.project_indicator.name} → {self.disaggregator.name} (Target: {self.target_value or 'N/A'})"


class StrategicPlanYear(models.Model):
    plan = models.ForeignKey(
        StrategicPlan,
        on_delete=models.CASCADE,
        related_name="years"
    )
    year = models.PositiveIntegerField()

    class Meta:
        unique_together = ("plan", "year")
        ordering = ["year"]

    def __str__(self):
        return f"{self.plan.title} - {self.year}"

class StrategicObjectiveStatement(models.Model):
    objective = models.ForeignKey(
        StrategicObjective,
        on_delete=models.CASCADE,
        related_name="statements"
    )
    text = models.TextField()

    def __str__(self):
        return f"{self.objective.name} - {self.text[:50]}"

class CorporateIndicator(models.Model):
    statements = models.ManyToManyField(
        StrategicObjectiveStatement, 
        related_name='corporate_indicators',
        blank=True
    )   
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    disaggregators = models.ManyToManyField('Disaggregator', blank=True)

    def __str__(self): 
        return self.name
    
class CorporateIndicatorPerformance(models.Model):
    indicator = models.ForeignKey(
        CorporateIndicator,
        on_delete=models.CASCADE,
        related_name="performances"
    )
    year = models.ForeignKey(
        StrategicPlanYear,
        on_delete=models.CASCADE,
        related_name="indicator_performances"
    )
    target = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    actual = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    comments = models.TextField(blank=True, null=True)

    class Meta:
        unique_together = ("indicator", "year")

    def __str__(self):
        return f"{self.indicator.name} - {self.year.year}"


