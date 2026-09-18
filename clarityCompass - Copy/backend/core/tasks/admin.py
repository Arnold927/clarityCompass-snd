from django.contrib import admin
from .models import (
    KeyActivity, Task, TaskUpdate, TaskIndicatorData, TaskReport, TaskIndicatorDisaggregatedValue,
    TaskIndicatorProgress, TaskTOR, TaskCompletionReport, TaskNotification
)
from django.utils.html import format_html


class TaskInline(admin.TabularInline):
    model = Task
    extra = 0


@admin.register(KeyActivity)
class KeyActivityAdmin(admin.ModelAdmin):
    list_display = ('name', 'project', 'linked_project_indicator')
    list_filter = ('project',)
    search_fields = ('name', 'project__title')
    inlines = [TaskInline]


class TaskUpdateInline(admin.TabularInline):
    model = TaskUpdate
    extra = 0


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('title', 'project', 'focal_person', 'start_date', 'end_date', 'budget')
    list_filter = ('activity', 'project', 'focal_person')
    search_fields = ('title', 'activity__name', 'project__title', 'focal_person__username')
    inlines = [TaskUpdateInline]


@admin.register(TaskUpdate)
class TaskUpdateAdmin(admin.ModelAdmin):
    list_display = ('task', 'status_date', 'status', 'is_complete', 'amount_spent')
    list_filter = ('status', 'is_complete')
    date_hierarchy = 'status_date'


@admin.register(TaskIndicatorData)
class TaskIndicatorDataAdmin(admin.ModelAdmin):
    list_display = ('task_update', 'indicator_disaggregation', 'value')
    list_filter = ('indicator_disaggregation',)
    search_fields = ('indicator_disaggregation__name',)

@admin.register(TaskIndicatorDisaggregatedValue)
class TaskIndicatorDisaggregatedValueAdmin(admin.ModelAdmin):
    list_display = (
        'task_indicator_progress',
        'disaggregator',
        'target',
        'actual',
    )

    list_filter = (
        'task_indicator_progress',
        'disaggregator',
    )

    search_fields = (
        'task_indicator_progress__id',
        'disaggregator__name',
    )

    autocomplete_fields = (
        'task_indicator_progress',
        'disaggregator',
    )

    ordering = (
        'task_indicator_progress',
        'disaggregator',
    )

    list_editable = (
        'target',
        'actual',
    )


class TaskIndicatorDisaggregatedValueInline(admin.TabularInline):
    model = TaskIndicatorDisaggregatedValue
    extra = 0
    autocomplete_fields = ('disaggregator',)


@admin.register(TaskIndicatorProgress)
class TaskIndicatorProgressAdmin(admin.ModelAdmin):
    inlines = [TaskIndicatorDisaggregatedValueInline]

    list_display = (
        'task',
        'output_indicator',
        'target_contribution',
        'actual_contribution',
    )

    search_fields = (
        'task__title',
        'output_indicator__name',
    )

    list_filter = (
        'task',
        'output_indicator',
    )

    autocomplete_fields = (
        'task',
        'output_indicator',
    )


@admin.register(TaskReport)
class TaskReportAdmin(admin.ModelAdmin):
    list_display = ('task', 'indicator', 'submitted_by', 'submitted_at')
    list_filter = ('task', 'indicator', 'submitted_by', 'submitted_at')
    search_fields = ('task__title', 'indicator__indicatorName', 'submitted_by__username')
    readonly_fields = ('submitted_at',)


@admin.register(TaskTOR)
class TaskTORAdmin(admin.ModelAdmin):
    list_display = ['task', 'filename_link', 'uploaded_by', 'uploaded_at', 'has_description']
    list_filter = ['uploaded_at']
    search_fields = ['task__title', 'description', 'uploaded_by__username']
    readonly_fields = ['uploaded_by', 'uploaded_at']
    
    def filename_link(self, obj):
        if obj.file:
            return format_html('<a href="{}" target="_blank">{}</a>', obj.file.url, obj.filename)
        return "-"
    filename_link.short_description = "File"
    
    def has_description(self, obj):
        return "✓" if obj.description else "✗"
    has_description.short_description = "Description"
    
    fieldsets = (
        ('Task Information', {
            'fields': ('task',)
        }),
        ('Document', {
            'fields': ('file', 'description')
        }),
        ('Upload Information', {
            'fields': ('uploaded_by', 'uploaded_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(TaskCompletionReport)
class TaskCompletionReportAdmin(admin.ModelAdmin):
    list_display = ['task', 'activity_report_link', 'participants_link', 'submitted_by', 'submitted_at']
    list_filter = ['submitted_at']
    search_fields = ['task__title', 'notes', 'submitted_by__username']
    readonly_fields = ['submitted_by', 'submitted_at']
    
    def activity_report_link(self, obj):
        if obj.activity_report:
            return format_html('<a href="{}" target="_blank">{}</a>', obj.activity_report.url, obj.activity_report_filename)
        return "-"
    activity_report_link.short_description = "Activity Report"
    
    def participants_link(self, obj):
        if obj.participants_list:
            return format_html('<a href="{}" target="_blank">{}</a>', obj.participants_list.url, obj.participants_filename)
        return "-"
    participants_link.short_description = "Participants List"
    
    fieldsets = (
        ('Task Information', {
            'fields': ('task',)
        }),
        ('Documents', {
            'fields': ('activity_report', 'participants_list', 'notes')
        }),
        ('Submission Information', {
            'fields': ('submitted_by', 'submitted_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(TaskNotification)
class TaskNotificationAdmin(admin.ModelAdmin):
    list_display = ['task', 'notification_type', 'sent_to', 'is_read_badge', 'sent_at']
    list_filter = ['notification_type', 'is_read', 'sent_at']
    search_fields = ['task__title', 'message', 'sent_to__username']
    readonly_fields = ['sent_at', 'read_at']
    
    def is_read_badge(self, obj):
        if obj.is_read:
            return format_html('<span style="color: green;">✓ Read</span>')
        return format_html('<span style="color: red;">● Unread</span>')
    is_read_badge.short_description = "Status"
    
    fieldsets = (
        ('Notification Information', {
            'fields': ('task', 'notification_type', 'message')
        }),
        ('Recipient', {
            'fields': ('sent_to',)
        }),
        ('Status', {
            'fields': ('is_read', 'read_at'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('sent_at',),
            'classes': ('collapse',)
        }),
    )


