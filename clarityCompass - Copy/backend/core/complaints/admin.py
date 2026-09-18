from django.contrib import admin
from django.utils.html import format_html
from .models import Complaint, ComplaintFollowUp, ComplaintAttachment, ComplaintComment

class ComplaintFollowUpInline(admin.TabularInline):
    model = ComplaintFollowUp
    extra = 0
    readonly_fields = ['created_at']

class ComplaintAttachmentInline(admin.TabularInline):
    model = ComplaintAttachment
    extra = 0
    readonly_fields = ['uploaded_at']

class ComplaintCommentInline(admin.TabularInline):
    model = ComplaintComment
    extra = 0
    readonly_fields = ['created_at']

@admin.register(Complaint)
class ComplaintAdmin(admin.ModelAdmin):
    list_display = [
        'case_id', 'full_name', 'feedback_type', 'sensitivity_level',
        'status', 'priority', 'assigned_to', 'created_at', 'case_status'
    ]
    list_filter = [
        'status', 'priority', 'sensitivity_level', 'category',
        'feedback_type', 'created_at', 'assigned_to'
    ]
    search_fields = ['case_id', 'full_name', 'description', 'phone_number']
    readonly_fields = ['case_id', 'case_status', 'created_at', 'updated_at']
    inlines = [ComplaintFollowUpInline, ComplaintAttachmentInline, ComplaintCommentInline]
    
    fieldsets = (
        ('Case Information', {
            'fields': ('case_id', 'case_status', 'status', 'priority')
        }),
        ('Feedback Receipt', { 
            'fields': ('date_feedback_received', 'feedback_channel')
        }),
        ('Complainant Information', {
            'fields': ('full_name', 'gender', 'phone_number', 'id_number', 'nationality')
        }),
        ('Classification', {
            'fields': ('feedback_type', 'sensitivity_level', 'category', 'sub_category', 'other_subject')
        }),
        ('Location', {
            'fields': ('geographic_area', 'specific_location')
        }),
        ('Content', {
            'fields': ('description', 'has_thanking_note')
        }),
        ('Allegations', {
            'fields': ('alleged_perpetrator',),
            'classes': ('collapse',)
        }),
        ('Follow-up', {
            'fields': ('responsible_person', 'actions_taken', 'evidence_of_followup',
                      'date_response_provided', 'date_case_closed', 'additional_comments'),
            'classes': ('collapse',)
        }),
        ('Assignment', {
            'fields': ('assigned_to', 'deadline', 'project')
        }),
        ('System', {
            'fields': ('created_by', 'updated_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        obj.updated_by = request.user
        super().save_model(request, obj, form, change)

@admin.register(ComplaintFollowUp)
class ComplaintFollowUpAdmin(admin.ModelAdmin):
    list_display = ['complaint', 'follow_up_date', 'followed_by', 'action_taken_short']
    list_filter = ['follow_up_date', 'followed_by']
    search_fields = ['complaint__case_id', 'action_taken']
    
    def action_taken_short(self, obj):
        return obj.action_taken[:50] + '...' if len(obj.action_taken) > 50 else obj.action_taken
    action_taken_short.short_description = 'Action Taken'

@admin.register(ComplaintAttachment)
class ComplaintAttachmentAdmin(admin.ModelAdmin):
    list_display = ['complaint', 'description', 'uploaded_by', 'uploaded_at', 'file_link']
    list_filter = ['uploaded_at', 'uploaded_by']
    
    def file_link(self, obj):
        if obj.file:
            return format_html('<a href="{}" target="_blank">Download</a>', obj.file.url)
        return '-'
    file_link.short_description = 'File'

@admin.register(ComplaintComment)
class ComplaintCommentAdmin(admin.ModelAdmin):
    list_display = ['complaint', 'user', 'created_at', 'content_short']
    list_filter = ['created_at', 'user']
    
    def content_short(self, obj):
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_short.short_description = 'Comment'