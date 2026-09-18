from django.contrib import admin
from .models import (
    Country, ThematicFocus, ThematicFocusIndicator,
    LeadPartner, LeadPartnerIndicator, LeadPartnerDocument,
    Donor, DonorIndicator, DonorDocument,
    Project, ProjectDocument, ProjectActivity, ProjectIndicator,
)


class ThematicFocusIndicatorInline(admin.TabularInline):
    model = ThematicFocusIndicator
    extra = 1


@admin.register(ThematicFocus)
class ThematicFocusAdmin(admin.ModelAdmin):
    list_display = ('name', 'status', 'reach_total', 'reach_male', 'reach_female', 'reach_pwd')
    inlines = [ThematicFocusIndicatorInline]


@admin.register(Country)
class CountryAdmin(admin.ModelAdmin):
    list_display = ('name', 'iso_code', 'region', 'status', 'first_implementation_year')
    search_fields = ('name',)


class LeadPartnerIndicatorInline(admin.TabularInline):
    model = LeadPartnerIndicator
    extra = 1


class LeadPartnerDocumentInline(admin.TabularInline):
    model = LeadPartnerDocument
    extra = 0


@admin.register(LeadPartner)
class LeadPartnerAdmin(admin.ModelAdmin):
    list_display = ('name', 'partner_type', 'status', 'head_office', 'partnership_since')
    search_fields = ('name',)
    inlines = [LeadPartnerIndicatorInline, LeadPartnerDocumentInline]


class DonorIndicatorInline(admin.TabularInline):
    model = DonorIndicator
    extra = 1


class DonorDocumentInline(admin.TabularInline):
    model = DonorDocument
    extra = 0


@admin.register(Donor)
class DonorAdmin(admin.ModelAdmin):
    list_display = ('name', 'donor_type', 'status', 'head_office', 'partnership_since')
    search_fields = ('name',)
    inlines = [DonorIndicatorInline, DonorDocumentInline]


class ProjectActivityInline(admin.TabularInline):
    model = ProjectActivity
    extra = 1


class ProjectIndicatorInline(admin.TabularInline):
    model = ProjectIndicator
    extra = 1


class ProjectDocumentInline(admin.TabularInline):
    model = ProjectDocument
    extra = 0


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'status', 'start_date', 'end_date', 'lead_partner', 'budget', 'currency')
    list_filter = ('status', 'countries', 'thematic_focus', 'donors', 'lead_partner')
    search_fields = ('name', 'project_code')
    filter_horizontal = ('countries', 'donors', 'thematic_focus')
    inlines = [ProjectActivityInline, ProjectIndicatorInline, ProjectDocumentInline]
