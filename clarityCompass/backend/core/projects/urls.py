from django.urls import path, include
from rest_framework_nested import routers
from rest_framework.routers import DefaultRouter
from .views import (
    ProjectViewSet,
    ProjectIndicatorViewSet,
    ProjectIndicatorTargetViewSet,
    ProjectTeamMemberViewSet, ProjectObjectiveViewSet, ProjectOutcomeViewSet, ProjectOutputViewSet,
    ProjectOutcomeIndicatorViewSet, ProjectOutputIndicatorViewSet, ProjectReportSubmissionViewSet, ProjectReportingScheduleViewSet,
    IndicatorDisaggregatedValueViewSet
)
from . import views

router = DefaultRouter()
router.register(r'project-objectives', ProjectObjectiveViewSet, basename='project-objectives')
router.register(r'project-outcomes', ProjectOutcomeViewSet, basename='project-outcomes')
router.register(r'project-outputs', ProjectOutputViewSet, basename='project-outputs')
router.register(r'project-outcome-indicators', ProjectOutcomeIndicatorViewSet, basename='project-outcome-indicators')
router.register(r'project-output-indicators', ProjectOutputIndicatorViewSet, basename='project-output-indicators')
router.register(r'project-indicators', ProjectIndicatorViewSet, basename='project-indicators')
router.register(r'project-indicator-targets', ProjectIndicatorTargetViewSet, basename='project-indicator-targets')
router.register(r'indicator-disaggregated-values', IndicatorDisaggregatedValueViewSet, basename='indicator-disaggregated-value')
router.register(r'', ProjectViewSet, basename='projects')

projects_router = routers.NestedDefaultRouter(router, r'', lookup='project')
projects_router.register(r'team-members', ProjectTeamMemberViewSet, basename='project-team-members')
projects_router.register(r'schedules', ProjectReportingScheduleViewSet, basename='project-schedules')

schedules_router = routers.NestedDefaultRouter(projects_router, r'schedules', lookup='schedule')
schedules_router.register(r'submissions', ProjectReportSubmissionViewSet, basename='project-submissions')


urlpatterns = [
    path('', include(router.urls)),
    path('', include(projects_router.urls)),
    path('', include(schedules_router.urls)),
    path('reporting/schedules/<int:schedule_id>/submissions/', 
         views.get_schedule_submissions, 
         name='schedule_submissions'),
]
