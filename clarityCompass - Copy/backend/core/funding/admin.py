from django.contrib import admin
from .models import FundingOpportunity, Proposal


class ProposalInline(admin.TabularInline):
    model = Proposal
    extra = 0


@admin.register(FundingOpportunity)
class FundingOpportunityAdmin(admin.ModelAdmin):
    list_display = ('number', 'title', 'donor_org', 'status', 'budget', 'closing_date')
    list_filter = ('donor_org', 'status', 'closing_date')
    search_fields = ('number', 'title', 'donor_org__name')
    date_hierarchy = 'closing_date'
    inlines = [ProposalInline]


@admin.register(Proposal)
class ProposalAdmin(admin.ModelAdmin):
    list_display = ('opportunity', 'ngo_org', 'focal_person', 'proposed_budget', 'status', 'submission_date')
    list_filter = ('status', 'ngo_org', 'opportunity')
    search_fields = ('opportunity__title', 'ngo_org__name', 'focal_person__username')
    date_hierarchy = 'submission_date'
