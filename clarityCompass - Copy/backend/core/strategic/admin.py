from django.contrib import admin
from .models import StrategicPlan, StrategicObjective, Disaggregator, CorporateIndicator, IndicatorDisaggregation, StrategicPlanYear, StrategicObjectiveStatement, CorporateIndicatorPerformance
from django.contrib.admin import SimpleListFilter

@admin.register(StrategicPlan)
class StrategicPlanAdmin(admin.ModelAdmin):
    list_display = ('title', 'org', 'version', 'start_date', 'end_date', 'is_active')
    list_filter = ('org', 'is_active', 'start_date', 'end_date')
    search_fields = ('title', 'org__name', 'version')
    date_hierarchy = 'start_date'



@admin.register(Disaggregator)
class DisaggregatorAdmin(admin.ModelAdmin):
    list_display = ('name', 'org')
    list_filter = ('org',)
    search_fields = ('name',)

class PlanFilter(SimpleListFilter):
    """Filter by Strategic Plan for ManyToMany relationship"""
    title = 'Strategic Plan'
    parameter_name = 'plan'

    def lookups(self, request, model_admin):
        from django.db.models import Q
        from strategic.models import StrategicPlan
        
        plans = StrategicPlan.objects.filter(
            objectives__statements__corporate_indicators__isnull=False
        ).distinct()
        
        return [(plan.id, plan.title) for plan in plans]

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(statements__objective__plan__id=self.value()).distinct()
        return queryset

class ObjectiveFilter(SimpleListFilter):
    """Filter by Strategic Objective for ManyToMany relationship"""
    title = 'Strategic Objective'
    parameter_name = 'objective'

    def lookups(self, request, model_admin):
        from django.db.models import Q
        from strategic.models import StrategicObjective
        
        objectives = StrategicObjective.objects.filter(
            statements__corporate_indicators__isnull=False
        ).distinct()
        
        return [(obj.id, f"{obj.number} - {obj.name}") for obj in objectives]

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(statements__objective__id=self.value()).distinct()
        return queryset



@admin.register(CorporateIndicator)
class CorporateIndicatorAdmin(admin.ModelAdmin):
    list_display = ('name', 'get_objectives', 'get_plans')
    list_filter = (PlanFilter, ObjectiveFilter)
    search_fields = ('name', 'statements__objective__name', 'statements__text')
    
    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related(
            'statements__objective__plan'
        )

    def get_objectives(self, obj):
        objectives = set()
        for statement in obj.statements.all():
            if statement.objective:
                objectives.add(f"{statement.objective.number} - {statement.objective.name}")
        return ", ".join(sorted(objectives)) if objectives else "No objectives"
    get_objectives.short_description = "Strategic Objectives"

    def get_plans(self, obj):
        plans = set()
        for statement in obj.statements.all():
            if statement.objective and statement.objective.plan:
                plans.add(statement.objective.plan.title)
        return ", ".join(sorted(plans)) if plans else "No plans"
    get_plans.short_description = "Strategic Plans"


@admin.register(IndicatorDisaggregation)
class IndicatorDisaggregationAdmin(admin.ModelAdmin):
    list_display = ('project_indicator', 'disaggregator', 'baseline_value', 'target_value')
    list_filter = ('project_indicator',)
    search_fields = ('project_indicator__name', 'disaggregator__name')

@admin.register(StrategicPlanYear)
class StrategicPlanYearAdmin(admin.ModelAdmin):
    list_display = (
        "plan",
        "year",
    )
    list_filter = (
        "plan",
        "year",
    )
    search_fields = (
        "plan__title",
    )
    ordering = (
        "plan",
        "year",
    )


@admin.register(CorporateIndicatorPerformance)
class CorporateIndicatorPerformanceAdmin(admin.ModelAdmin):
    list_display = ("indicator", "get_objective", "get_plan", "year", "target", "actual")
    list_filter = ("year", ObjectiveFilter, PlanFilter)
    search_fields = ("indicator__name", "indicator__statement__objective__name", "indicator__statement__objective__plan__title")
    autocomplete_fields = ("indicator", "year")
    ordering = ("indicator", "year")

    def get_objective(self, obj):
        statements = obj.indicator.statements.all()

        if not statements.exists():
            return "-"

        return ", ".join(
            s.objective.name
            for s in statements
            if getattr(s, "objective", None)
        )

    get_objective.short_description = "Strategic Objective"

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related(
            "indicator", "year"
        ).prefetch_related(
            "indicator__statements__objective"
        )


    def get_plan(self, obj):
        statements = obj.indicator.statements.all()

        if not statements.exists():
            return "-"

        plans = {
            s.objective.plan.title
            for s in statements
            if getattr(s, "objective", None)
            and getattr(s.objective, "plan", None)
        }

        return ", ".join(plans) if plans else "-"

    get_plan.short_description = "Strategic Plan"

@admin.register(StrategicObjectiveStatement)
class StrategicObjectiveStatementAdmin(admin.ModelAdmin):
    list_display = (
        "objective",
        "get_plan",
        "short_text",
    )

    list_filter = (
        "objective__plan",
    )

    search_fields = (
        "text",
        "objective__statement__objective__name",
        "objective__statement__objective__plan__title",
    )

    autocomplete_fields = (
        "objective",
    )

    ordering = (
        "objective",
    )

    def get_plan(self, obj):
        return obj.objective.plan

    get_plan.short_description = "Strategic Plan"
    get_plan.admin_order_field = "objective__plan"

    def short_text(self, obj):
        return obj.text[:80]

    short_text.short_description = "Statement"


@admin.register(StrategicObjective)
class StrategicObjectiveAdmin(admin.ModelAdmin):
    list_display = ('number', 'name', 'plan')
    list_filter = ('plan',)
    search_fields = ('name', 'plan__title', 'number')




