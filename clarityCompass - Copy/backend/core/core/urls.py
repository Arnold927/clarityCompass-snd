from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView, TokenVerifyView
from rest_framework import routers
from projects.views import DonorViewSet, LocationViewSet
from programs.views import ProgramViewSet
from django.conf.urls.static import static
from django.conf import settings
from organizations.views import CurrentUserView, ForgotPasswordView, ResetPasswordView, TeamMemberListView, UserRegistrationView
from . import views
from .views import (
    me_dashboard_stats,
    strategic_performance,
    program_quarterly_performance,
    indicator_disaggregation_summary,
    complaints_analytics,
    tasks_me_summary,
    reporting_compliance,
)

router = routers.DefaultRouter()
router.register(r'donors', DonorViewSet, basename="donor")
router.register(r'locations', LocationViewSet, basename='location')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/user/', CurrentUserView.as_view(), name='current_user'),
    path('api/auth/me/', CurrentUserView.as_view(), name='current_user_me'),
    path('api/register/', UserRegistrationView.as_view(), name='user-register'),
    path("api/forgot-password/", ForgotPasswordView.as_view(), name="forgot-password"),
    path("api/password/reset/", ResetPasswordView.as_view(), name="reset-password"),
    path('api/users/', TeamMemberListView.as_view(), name='team-members'),
    path('api/strategic/', include('strategic.urls')),
    path('api/results-framework/', include('results_framework.urls')),
    path('api/programs/', include('programs.urls')),
    path('api/projects/', include('projects.urls')),
    path('api/tasks/', include('tasks.urls')),
    path('api/data-collection/', include('data_collection.urls')),
    path("api/generate-report/", views.generate_report, name="generate_report"),
    path("api/evaluate-project/", views.evaluate_project, name="evaluate_project"),
    path("api/generate-docx/", views.generate_docx, name="generate_docx"),
    path('api/shared-portal/', include('shared_portal.urls')),
    path('api/shared/', include('shared.urls')),
    path('api/dashboard/stats/', views.dashboard_stats, name='dashboard_stats'),
    path('api/generate-scheduled-report/<int:schedule_id>/',views.generate_scheduled_report,
        name='generate-scheduled-report'),
    path('api/complaints/', include('complaints.urls'))
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)


# ── M&E Analytics endpoints ─────────────────────────────────
urlpatterns += [
    path('api/dashboard/me-stats/', me_dashboard_stats, name='me_dashboard_stats'),
    path('api/strategic/performance/', strategic_performance, name='strategic_performance'),
    path('api/programs/<int:program_id>/quarterly-performance/', program_quarterly_performance, name='program_quarterly_performance'),
    path('api/strategic/indicators/<int:indicator_id>/disaggregation-summary/', indicator_disaggregation_summary, name='indicator_disaggregation_summary'),
    path('api/complaints/analytics/', complaints_analytics, name='complaints_analytics'),
    path('api/tasks/me-summary/', tasks_me_summary, name='tasks_me_summary'),
    path('api/reporting/compliance/', reporting_compliance, name='reporting_compliance'),
]
