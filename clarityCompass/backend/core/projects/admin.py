from django.contrib import admin
from django.forms import ValidationError
from .models import (
    Project, ProjectObjective, ProjectOutcome, ProjectOutput,
    ProjectOutcomeIndicator, ProjectOutputIndicator,
    ProjectIndicator, ProjectIndicatorTarget,
    Donor, Location, ProjectTeamMember, ProjectReportingSchedule, ProjectReportSubmission,
    ProjectReportSubmissionHistory, IndicatorDisaggregatedValue
)


class ObjectiveInline(admin.TabularInline):
    model = ProjectObjective
    extra = 0
    show_change_link = True


class OutcomeInline(admin.TabularInline):
    model = ProjectOutcome
    extra = 0
    show_change_link = True


class OutputInline(admin.TabularInline):
    model = ProjectOutput
    extra = 0
    show_change_link = True


class OutcomeIndicatorInline(admin.TabularInline):
    model = ProjectOutcomeIndicator
    extra = 0
    show_change_link = True


class OutputIndicatorInline(admin.TabularInline):
    model = ProjectOutputIndicator
    extra = 0
    show_change_link = True


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('code', 'title', 'program', 'manager', 'start_date', 'end_date', 'health_status')
    list_filter = ('program', 'health_status')
    search_fields = ('code', 'title', 'manager__username')
    ordering = ('-start_date',)

    inlines = [ObjectiveInline]


@admin.register(ProjectObjective)
class ProjectObjectiveAdmin(admin.ModelAdmin):
    list_display = ('name', 'project')
    list_filter = ('project',)
    search_fields = ('name', 'project__title')
    ordering = ('project', 'name')

    inlines = [OutcomeInline]


@admin.register(ProjectOutcome)
class ProjectOutcomeAdmin(admin.ModelAdmin):
    list_display = ('name', 'project_objective', 'project_name')
    list_filter = ('project_objective__project',)
    search_fields = ('name', 'project_objective__name')
    ordering = ('project_objective', 'name')

    inlines = [OutputInline, OutcomeIndicatorInline]

    def project_name(self, obj):
        return obj.project_objective.project.title
    project_name.short_description = "Project"


@admin.register(ProjectOutput)
class ProjectOutputAdmin(admin.ModelAdmin):
    list_display = ('name', 'project_outcome', 'objective_name', 'project_name')
    list_filter = ('project_outcome__project_objective__project',)
    search_fields = ('name', 'project_outcome__name')
    ordering = ('project_outcome', 'name')

    inlines = [OutputIndicatorInline]

    def objective_name(self, obj):
        return obj.project_outcome.project_objective.name

    def project_name(self, obj):
        return obj.project_outcome.project_objective.project.title


@admin.register(ProjectOutcomeIndicator)
class ProjectOutcomeIndicatorAdmin(admin.ModelAdmin):
    list_display = ('name', 'outcome', 'project_name')
    list_filter = ('outcome__project_objective__project',)
    search_fields = ('name', 'outcome__name')
    ordering = ('outcome', 'name')

    def project_name(self, obj):
        return obj.outcome.project_objective.project.title
    project_name.short_description = "Project"


@admin.register(ProjectOutputIndicator)
class ProjectOutputIndicatorAdmin(admin.ModelAdmin):
    list_display = ('name', 'output', 'project_name')
    list_filter = ('output__project_outcome__project_objective__project',)
    search_fields = ('name', 'output__name')
    ordering = ('output', 'name')

    def project_name(self, obj):
        return obj.output.project_outcome.project_objective.project.title
    project_name.short_description = "Project"


@admin.register(ProjectIndicator)
class ProjectIndicatorAdmin(admin.ModelAdmin):
    list_display = ('name', 'project', 'program_indicator')
    search_fields = ('name',)


@admin.register(ProjectIndicatorTarget)
class ProjectIndicatorTargetAdmin(admin.ModelAdmin):
    list_display = ('project_indicator', 'financial_year', 'quarter', 'value')
    list_filter = ('financial_year', 'quarter')


@admin.register(Donor)
class DonorAdmin(admin.ModelAdmin):
    list_display = ('name', 'country')


@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ('name', 'project')


@admin.register(ProjectTeamMember)
class ProjectTeamMemberAdmin(admin.ModelAdmin):
    list_display = ('project', 'user', 'member_name')


@admin.register(ProjectReportingSchedule)
class ProjectReportingScheduleAdmin(admin.ModelAdmin):
    list_display = ("name", "project", "recipient", "frequency", "created_at")
    list_filter = ("frequency", "created_at", "project")
    search_fields = ("name", "recipient", "project__title")
    ordering = ("-created_at",)

@admin.register(ProjectReportSubmission)
class ProjectReportSubmissionAdmin(admin.ModelAdmin):
    list_display = ("title", "schedule", "status", "submitted_at")
    list_filter = ("status", "submitted_at", "schedule__project")
    search_fields = ("title", "notes", "schedule__name", "schedule__project__title")
    ordering = ("-submitted_at",)


@admin.register(ProjectReportSubmissionHistory)
class ProjectReportSubmissionHistoryAdmin(admin.ModelAdmin):
    list_display = ('submission', 'status', 'reviewed_by', 'reviewed_at')
    list_filter = ('status', 'reviewed_at')
    search_fields = ('submission__title', 'notes', 'reviewed_by__username')
    ordering = ('-reviewed_at',)

@admin.register(IndicatorDisaggregatedValue)
class IndicatorDisaggregatedValueAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'indicator_type',
        'indicator_name',
        'disaggregator',
        'target',
        'actual',
    )

    list_filter = (
        'disaggregator',
    )

    search_fields = (
        'disaggregator__name',
        'outcome_indicator__name',
        'output_indicator__name',
    )

    fieldsets = (
        ('Indicator Link (choose one only)', {
            'fields': (
                'outcome_indicator',
                'output_indicator',
            ),
            'description': 'Link this record to either an Outcome Indicator OR an Output Indicator (not both).',
        }),
        ('Disaggregation Details', {
            'fields': (
                'disaggregator',
            )
        }),
        ('Values', {
            'fields': (
                'target',
                'actual',
            )
        }),
    )

    def indicator_type(self, obj):
        return 'Outcome' if obj.outcome_indicator else 'Output'
    indicator_type.short_description = 'Indicator Type'

    def indicator_name(self, obj):
        indicator = obj.outcome_indicator or obj.output_indicator
        return indicator.name if indicator else '-'
    indicator_name.short_description = 'Indicator'

    def clean(self):
        super().clean()
        if bool(self.outcome_indicator) == bool(self.output_indicator):
            raise ValidationError(
                'You must set either an Outcome Indicator or an Output Indicator (not both).'
            )

