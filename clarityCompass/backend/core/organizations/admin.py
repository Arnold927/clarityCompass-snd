from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import Organization, User


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ('name', 'org_type', 'created_at', 'updated_at')
    search_fields = ('name', 'org_type')
    date_hierarchy = 'created_at'


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Organisation & Access', {'fields': ('organization', 'app_role')}),
    )
    list_display = ('username', 'email', 'app_role', 'organization', 'is_staff', 'is_active')
    list_filter = ('app_role', 'organization', 'is_staff', 'is_active')
    search_fields = ('username', 'email', 'organization__name')
