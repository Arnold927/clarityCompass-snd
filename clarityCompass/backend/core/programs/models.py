from django.db import models
from organizations.models import Organization
from strategic.models import CorporateIndicator, StrategicObjective

class Program(models.Model):
    org = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='programs')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    linked_objectives = models.ManyToManyField(
        StrategicObjective,
        related_name="programs",
        blank=True
    )

    class Meta: 
        unique_together = ('org','name')
    
    def __str__(self): 
        return self.name 

class ProgramIndicator(models.Model):
    program = models.ForeignKey(Program, on_delete=models.CASCADE, related_name='indicators')
    corporate_indicator = models.ForeignKey(CorporateIndicator, on_delete=models.SET_NULL, null=True, blank=True)
    name_override = models.CharField(max_length=255, blank=True, null=True)
    description_override = models.TextField(blank=True, null=True)

    def __str__(self): 
        return self.name_override or str(self.corporate_indicator) or 'ProgramIndicator'


class ProgramOutcome(models.Model):
    program = models.ForeignKey(Program, on_delete=models.CASCADE, related_name='outcomes')
    linked_objective = models.ForeignKey(StrategicObjective, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="program_outcomes"
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)

    class Meta:
        unique_together = ("program", "name")

    def __str__(self):
        return f"{self.program.name} - {self.name}"

class ProgramOutcomeIndicator(models.Model):
    outcome = models.ForeignKey(ProgramOutcome, on_delete=models.CASCADE, related_name="indicators")
    corporate_indicator = models.ForeignKey(
        CorporateIndicator, on_delete=models.SET_NULL, null=True, blank=True
    )
    name_override = models.CharField(max_length=255, blank=True, null=True)
    description_override = models.TextField(blank=True, null=True)

    def __str__(self):
        return (
            self.name_override
            or str(self.corporate_indicator)
            or "ProgramOutcomeIndicator"
        )
    
class ReportingQuarter(models.Model):
    year = models.PositiveIntegerField()
    quarter = models.PositiveSmallIntegerField(
        choices=[
            (1, "Q1"),
            (2, "Q2"),
            (3, "Q3"),
            (4, "Q4"),
        ]
    )
    start_date = models.DateField()
    end_date = models.DateField()

    class Meta:
        unique_together = ("year", "quarter")

    def __str__(self):
        return f"{self.year} Q{self.quarter}"


class ProgramOutcomeIndicatorPerformance(models.Model):
    indicator = models.ForeignKey(ProgramOutcomeIndicator, on_delete=models.CASCADE, related_name="performances")
    quarter = models.ForeignKey(ReportingQuarter, on_delete=models.CASCADE,
        related_name="outcome_indicator_performances"
    )
    target = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    actual = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    comments = models.TextField(blank=True, null=True)

    class Meta:
        unique_together = ("indicator", "quarter")

    def __str__(self):
        return f"{self.indicator} - {self.quarter}"

class ProgramOutcomePerformance(models.Model):
    outcome = models.ForeignKey(ProgramOutcome, on_delete=models.CASCADE, related_name="performances")
    quarter = models.ForeignKey(ReportingQuarter, on_delete=models.CASCADE,
        related_name="outcome_performances"
    )
    target = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    actual = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    comments = models.TextField(blank=True, null=True)

    class Meta:
        unique_together = ("outcome", "quarter")
        verbose_name = "Outcome Performance"
        verbose_name_plural = "Outcome Performances"

    def __str__(self):
        return f"{self.outcome} - {self.quarter}"

