from django.contrib import admin
from .models import (
    Program, ProgramIndicator, ProgramOutcome, ProgramOutcomeIndicator, ProgramOutcomePerformance, ReportingQuarter, 
    ProgramOutcomeIndicatorPerformance
)


class ProgramIndicatorInline(admin.TabularInline):
    model = ProgramIndicator
    extra = 1


@admin.register(Program)
class ProgramAdmin(admin.ModelAdmin):
    list_display = ('name', 'org')
    list_filter = ('org',)
    search_fields = ('name', 'org__name')
    inlines = [ProgramIndicatorInline]


@admin.register(ProgramIndicator)
class ProgramIndicatorAdmin(admin.ModelAdmin):
    list_display = ('program', 'corporate_indicator', 'name_override')
    list_filter = ('program',)
    search_fields = ('name_override', 'program__name', 'corporate_indicator__name')

@admin.register(ProgramOutcome)
class ProgramOutcomeAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "program",
        "linked_objective",
    )
    search_fields = (
        "name",
        "program__name",
        "linked_objective__name",
    )
    list_filter = (
        "program",
        "linked_objective",
    )
    autocomplete_fields = (
        "program",
        "linked_objective",
    )

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related(
            "program",
            "linked_objective"
        )

@admin.register(ProgramOutcomeIndicator)
class ProgramOutcomeIndicatorAdmin(admin.ModelAdmin):
    list_display = (
        "get_indicator_name",
        "outcome",
        "get_program",
    )
    search_fields = (
        "name_override",
        "corporate_indicator__name",
        "outcome__name",
        "outcome__program__name",
    )
    list_filter = (
        "outcome__program",
    )
    autocomplete_fields = (
        "outcome",
        "corporate_indicator",
    )

    def get_indicator_name(self, obj):
        return obj.name_override or obj.corporate_indicator
    get_indicator_name.short_description = "Indicator"

    def get_program(self, obj):
        return obj.outcome.program
    get_program.short_description = "Program"

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related(
            "outcome",
            "outcome__program",
            "corporate_indicator"
        )

@admin.register(ReportingQuarter)
class ReportingQuarterAdmin(admin.ModelAdmin):
    list_display = (
        "year",
        "quarter",
        "start_date",
        "end_date",
    )
    list_filter = (
        "year",
        "quarter",
    )
    ordering = (
        "-year",
        "quarter",
    )
    search_fields = (
        "year",
    )

@admin.register(ProgramOutcomeIndicatorPerformance)
class ProgramOutcomeIndicatorPerformanceAdmin(admin.ModelAdmin):
    list_display = (
        "indicator",
        "get_outcome",
        "get_program",
        "quarter",
        "target",
        "actual",
    )
    list_filter = (
        "quarter",
        "indicator__outcome__program",
    )
    search_fields = (
        "indicator__name_override",
        "indicator__corporate_indicator__name",
        "indicator__outcome__name",
    )
    autocomplete_fields = (
        "indicator",
        "quarter",
    )

    def get_outcome(self, obj):
        return obj.indicator.outcome
    get_outcome.short_description = "Outcome"

    def get_program(self, obj):
        return obj.indicator.outcome.program
    get_program.short_description = "Program"

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related(
            "indicator",
            "indicator__outcome",
            "indicator__outcome__program",
            "quarter"
        )


@admin.register(ProgramOutcomePerformance)
class ProgramOutcomePerformanceAdmin(admin.ModelAdmin):
    list_display = ("outcome", "quarter", "target", "actual", "comments")
    list_filter = ("quarter", "outcome__program")
    search_fields = ("outcome__name", "comments")
    ordering = ("-quarter__year", "-quarter__quarter", "outcome")
    readonly_fields = ()

    def save_model(self, request, obj, form, change):
        try:
            super().save_model(request, obj, form, change)
        except Exception as e:
            self.message_user(request, f"Error saving performance: {e}", level="error")



