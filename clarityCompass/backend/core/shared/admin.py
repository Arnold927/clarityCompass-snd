from django.contrib import admin
from .models import Decision, DecisionUpdate, Tag, ReportingSchedule, Notification

@admin.register(Decision)
class DecisionAdmin(admin.ModelAdmin):
    list_display = ('title', 'owner', 'assigned_to', 'deadline', 'status', 'priority', 'project')
    list_filter = ('status', 'priority', 'decision_type', 'risk_level', 'impact_level')
    search_fields = ('title', 'description', 'rationale', 'owner__username', 'assigned_to__username')
    filter_horizontal = ('stakeholders', 'tags')
    readonly_fields = ('created_at', 'updated_at', 'days_to_complete')
    date_hierarchy = 'deadline'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'description', 'decision_type', 'project')
        }),
        ('Ownership', {
            'fields': ('owner', 'assigned_to', 'stakeholders', 'created_by')
        }),
        ('Timeline', {
            'fields': ('deadline', 'completed_at', 'created_at', 'updated_at')
        }),
        ('Status & Progress', {
            'fields': ('status', 'priority', 'progress_percentage', 'days_to_complete')
        }),
        ('Content', {
            'fields': ('rationale', 'expected_outcome', 'actual_outcome')
        }),
        ('Risk & Impact', {
            'fields': ('risk_level', 'impact_level')
        }),
        ('Additional Information', {
            'fields': ('is_recurring', 'recurrence_pattern', 'tags')
        }),
        ('Generic Relations', {
            'fields': ('content_type', 'object_id', 'related_object_description'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('owner', 'assigned_to', 'project', 'created_by')
    
    def save_model(self, request, obj, form, change):
        if not obj.pk:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(DecisionUpdate)
class DecisionUpdateAdmin(admin.ModelAdmin):
    list_display = ('decision', 'user', 'created_at', 'truncated_update')
    list_filter = ('created_at',)
    search_fields = ('update_text', 'decision__title', 'user__username')
    readonly_fields = ('created_at',)
    
    def truncated_update(self, obj):
        return obj.update_text[:50] + '...' if len(obj.update_text) > 50 else obj.update_text
    truncated_update.short_description = 'Update Text'


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ('name', 'color_preview', 'description_short')
    search_fields = ('name', 'description')
    
    def color_preview(self, obj):
        return f'<div style="background-color: {obj.color}; width: 20px; height: 20px; border-radius: 3px;"></div>'
    color_preview.short_description = 'Color'
    color_preview.allow_tags = True
    
    def description_short(self, obj):
        return obj.description[:50] + '...' if len(obj.description) > 50 else obj.description
    description_short.short_description = 'Description'


@admin.register(ReportingSchedule)
class ReportingScheduleAdmin(admin.ModelAdmin):
    list_display = ('name', 'project', 'recipient', 'frequency')
    list_filter = ('frequency', 'recipient')
    search_fields = ('name', 'recipient', 'project__title')
    list_select_related = ('project',)
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('project')

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'decision', 'notification_type', 'is_read', 'created_at')
    list_filter = ('notification_type', 'is_read', 'created_at')
    search_fields = ('user__username', 'decision__title')
    readonly_fields = ('created_at',)
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'decision')