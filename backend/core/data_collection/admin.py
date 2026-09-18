import nested_admin
from django.contrib import admin
from .models import DataCollectionForm, FormField, Submission

class SubFieldInline(nested_admin.NestedTabularInline):
    model = FormField
    fk_name = 'parent'
    extra = 0
    fields = ('label', 'field_type', 'options', 'required', 'order', 'condition')
    show_change_link = True

class FormFieldInline(nested_admin.NestedTabularInline):
    model = FormField
    fk_name = 'form'
    extra = 1
    fields = ('label', 'field_type', 'options', 'required', 'order', 'condition')
    inlines = [SubFieldInline]
    show_change_link = True

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.filter(parent__isnull=True)

@admin.register(DataCollectionForm)
class DataCollectionFormAdmin(nested_admin.NestedModelAdmin):
    list_display = ('title', 'display_projects', 'created_by', 'created_at')
    list_filter = ('projects', 'created_by')
    search_fields = ('title', 'projects__title', 'created_by__username')
    inlines = [FormFieldInline]

    def display_projects(self, obj):
        return ", ".join([p.title for p in obj.projects.all()])
    display_projects.short_description = "Projects"

@admin.register(FormField)
class FormFieldAdmin(admin.ModelAdmin):
    list_display = ('form', 'parent', 'label', 'field_type', 'required', 'order')
    list_filter = ('field_type', 'required')
    search_fields = ('form__title', 'label')

def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)

@admin.register(Submission)
class SubmissionAdmin(admin.ModelAdmin):
    list_display = ('form', 'submitted_by', 'submitted_at')
    list_filter = ('form', 'submitted_by')
    date_hierarchy = 'submitted_at'
