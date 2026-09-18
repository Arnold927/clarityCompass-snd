from django.db import models
from organizations.models import Organization, User
from projects.models import Project

class FundingOpportunity(models.Model):
    donor_org = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='funding_opportunities')
    number = models.CharField(max_length=50, unique=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    budget = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=50, blank=True)
    posted_date = models.DateField(null=True, blank=True)
    closing_date = models.DateField(null=True, blank=True)
    funding_type = models.CharField(max_length=50, blank=True, null=True)
    eligibility = models.TextField(blank=True, null=True)
    link_to_details = models.CharField(max_length=512, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('donor_org', 'number')
        verbose_name = "Funding Opportunity"
        verbose_name_plural = "Funding Opportunities"

class Proposal(models.Model):
    opportunity = models.ForeignKey(FundingOpportunity, on_delete=models.CASCADE)
    ngo_org = models.ForeignKey(Organization, on_delete=models.CASCADE)
    focal_person = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    proposed_budget = models.DecimalField(max_digits=15, decimal_places=2)
    status = models.CharField(max_length=50)
    submission_date = models.DateTimeField(auto_now_add=True)
    notes_to_donor = models.TextField(blank=True, null=True)

    class Meta:
        unique_together = ('opportunity', 'ngo_org')