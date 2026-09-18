from django.contrib import admin
from .models import Attachment


@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display = ('file_name', 'content_type', 'object_id', 'uploaded_by', 'created_at')
    list_filter = ('content_type', 'uploaded_by')
    search_fields = ('file_name', 'uploaded_by__username')
    date_hierarchy = 'created_at'
