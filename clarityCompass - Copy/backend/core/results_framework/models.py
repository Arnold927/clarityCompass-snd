from django.db import models
from strategic.models import StrategicObjective
from projects.models import ProjectIndicator

class Outcome(models.Model):
    strategic_objective = models.ForeignKey(
        StrategicObjective,
        on_delete=models.CASCADE,
        related_name="outcomes",
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    def __str__(self):
        return self.name


class Output(models.Model):
    outcome = models.ForeignKey(Outcome, on_delete=models.CASCADE, related_name='outputs')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name


class OutputIndicator(models.Model):
    output = models.ForeignKey(Output, on_delete=models.CASCADE, related_name='indicators')
    project_indicator = models.ForeignKey(ProjectIndicator, on_delete=models.CASCADE, null=True, blank=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name
    class Meta:
        unique_together = ('output', 'name')
        verbose_name = "Output Indicator"
        verbose_name_plural = "Output Indicators"

class OutcomeIndicator(models.Model):
    outcome = models.ForeignKey(Outcome, on_delete=models.CASCADE, related_name='indicators')
    project_indicator = models.ForeignKey(ProjectIndicator, on_delete=models.CASCADE, null=True, blank=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name
    class Meta:
        unique_together = ('outcome', 'name')
        verbose_name = "Outcome Indicator"
        verbose_name_plural = "Outcome Indicators"
