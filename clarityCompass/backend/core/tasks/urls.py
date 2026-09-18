from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from rest_framework_nested import routers
from .views import (
    KeyActivityViewSet, TaskViewSet, TaskUpdateViewSet, TaskIndicatorDataViewSet, TaskReportViewSet,
    update_indicator_baseline_target, TaskIndicatorProgressViewSet
)

router = DefaultRouter()
router.register(r'key-activities', KeyActivityViewSet, basename='key-activities')
key_activities_router = routers.NestedSimpleRouter(router, r'key-activities', lookup='activity')
router.register(r'tasks', TaskViewSet, basename='tasks')
router.register(r'task-updates', TaskUpdateViewSet, basename='task-updates')
router.register(r'task-indicator-data', TaskIndicatorDataViewSet, basename='task-indicator-data')
router.register(r'task-reports', TaskReportViewSet, basename='task-reports')
router.register(r'task-indicator-progress', TaskIndicatorProgressViewSet, basename='task-indicator-progress')


urlpatterns = [
    path('', include(router.urls)),
    path('update-indicator-baseline-target/<int:indicator_id>/', 
    views.update_indicator_baseline_target, name='update-indicator-baseline-target'),
    path('save-baselines-targets/',
        views.save_baselines_and_targets, name='save-baselines-targets'),
    path('task-report-data/<int:task_id>/', views.get_task_report_data, name='get-task-report-data'),
    path('task-reports-history/', views.get_task_report_history, name='get-task-report-history'),
    path('', include(key_activities_router.urls)),
]
