from django.contrib import admin
from .models import (
    PartnerOrganization, SharedPortalUser, CollaborationProposal,
    ProposalDocument, ProposalFeedback, SharedReport, ReportDocument,
    ReportFeedback, PortalMessage, Notification, ActivityLog
)


class ProposalDocumentInline(admin.TabularInline):
    model = ProposalDocument
    extra = 0
    readonly_fields = ('file_name', 'file_size', 'uploaded_by', 'uploaded_at', 'version')


class ProposalFeedbackInline(admin.TabularInline):
    model = ProposalFeedback
    extra = 0
    readonly_fields = ('reviewer', 'feedback_text', 'created_at', 'status_change')


class ReportDocumentInline(admin.TabularInline):
    model = ReportDocument
    extra = 0
    readonly_fields = ('file_name', 'file_size', 'uploaded_by', 'uploaded_at')


class ReportFeedbackInline(admin.TabularInline):
    model = ReportFeedback
    extra = 0
    readonly_fields = ('reviewer', 'feedback_text', 'created_at', 'status_change')


@admin.register(PartnerOrganization)
class PartnerOrganizationAdmin(admin.ModelAdmin):
    list_display = ("name", "partner_type", "email_domain", "is_active", "created_at")
    search_fields = ("name", "email_domain")
    list_filter = ("partner_type", "is_active", "created_at")
    ordering = ("name",)


@admin.register(SharedPortalUser)
class SharedPortalUserAdmin(admin.ModelAdmin):
    list_display = ("user", "role", "organization", "ngo", "is_verified", "last_login_at")
    list_filter = ("role", "is_verified", "organization", "ngo")
    search_fields = ("user__email", "organization__name", "ngo__name")
    readonly_fields = ("created_at", "last_login_at")
    ordering = ("user__email",)


@admin.register(CollaborationProposal)
class CollaborationProposalAdmin(admin.ModelAdmin):
    list_display = ("title", "ngo", "project", "status", "budget_amount", "currency", "submission_date")
    list_filter = ("status", "currency", "partner_organizations")
    search_fields = ("title", "ngo__name", "project__name")
    readonly_fields = ("created_at", "updated_at", "submission_date")
    filter_horizontal = ("partner_organizations",)
    inlines = [ProposalDocumentInline, ProposalFeedbackInline]
    ordering = ("-submission_date", "-created_at")


@admin.register(ProposalDocument)
class ProposalDocumentAdmin(admin.ModelAdmin):
    list_display = ("file_name", "proposal", "document_type", "version", "is_current", "uploaded_at")
    list_filter = ("document_type", "is_current")
    search_fields = ("file_name", "proposal__title")
    readonly_fields = ("uploaded_at", "file_size", "version")


@admin.register(ProposalFeedback)
class ProposalFeedbackAdmin(admin.ModelAdmin):
    list_display = ("proposal", "reviewer", "status_change", "created_at")
    search_fields = ("proposal__title", "reviewer__user__email")
    list_filter = ("status_change", "created_at")
    readonly_fields = ("created_at",)


@admin.register(SharedReport)
class SharedReportAdmin(admin.ModelAdmin):
    list_display = ("title", "period", "ngo", "status", "submission_date")
    list_filter = ("status", "ngo", "partner_organizations")
    search_fields = ("title", "period", "ngo__name")
    readonly_fields = ("created_at", "updated_at", "submission_date")
    filter_horizontal = ("partner_organizations",)
    inlines = [ReportDocumentInline, ReportFeedbackInline]
    ordering = ("-submission_date", "-created_at")


@admin.register(ReportDocument)
class ReportDocumentAdmin(admin.ModelAdmin):
    list_display = ("file_name", "shared_report", "document_type", "uploaded_at")
    list_filter = ("document_type",)
    search_fields = ("file_name", "shared_report__title")
    readonly_fields = ("uploaded_at", "file_size")


@admin.register(ReportFeedback)
class ReportFeedbackAdmin(admin.ModelAdmin):
    list_display = ("shared_report", "reviewer", "status_change", "created_at")
    list_filter = ("status_change", "created_at")
    search_fields = ("shared_report__title", "reviewer__user__email")
    readonly_fields = ("created_at",)


@admin.register(PortalMessage)
class PortalMessageAdmin(admin.ModelAdmin):
    list_display = ("subject", "sender", "recipient", "related_proposal", "related_report", "created_at", "is_read")
    list_filter = ("is_read", "created_at")
    search_fields = ("subject", "sender__user__email", "recipient__user__email")
    readonly_fields = ("created_at",)


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("user", "notification_type", "title", "is_read", "created_at")
    list_filter = ("notification_type", "is_read", "created_at")
    search_fields = ("title", "user__user__email")
    readonly_fields = ("created_at",)


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ("user", "action_type", "resource_type", "resource_id", "created_at", "ip_address")
    list_filter = ("action_type", "resource_type", "created_at")
    search_fields = ("user__user__email", "resource_type", "resource_id", "description")
    readonly_fields = ("created_at",)
    ordering = ("-created_at",)
