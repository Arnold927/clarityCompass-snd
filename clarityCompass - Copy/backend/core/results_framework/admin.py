from django.contrib import admin
from .models import Outcome, OutcomeIndicator, Output, OutputIndicator


class OutputInline(admin.TabularInline):
    model = Output
    extra = 1


@admin.register(Outcome)
class OutcomeAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)
    inlines = [OutputInline]


class OutputIndicatorInline(admin.TabularInline):
    model = OutputIndicator
    extra = 1


@admin.register(Output)
class OutputAdmin(admin.ModelAdmin):
    list_display = ('name', 'outcome')
    list_filter = ('outcome',)
    search_fields = ('name', 'outcome__name')
    inlines = [OutputIndicatorInline]


@admin.register(OutputIndicator)
class OutputIndicatorAdmin(admin.ModelAdmin):
    list_display = ('name', 'output', 'project_indicator')
    list_filter = ('output',)
    search_fields = ('name', 'output__name', 'project_indicator__name')

@admin.register(OutcomeIndicator)
class OutcomeIndicatorAdmin(admin.ModelAdmin):
    list_display = ('name', 'outcome', 'project_indicator')
    list_filter = ('outcome',)
    search_fields = ('name', 'outcome__name', 'project_indicator__name')
