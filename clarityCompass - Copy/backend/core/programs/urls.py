from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProgramOutcomePerformanceViewSet, ProgramViewSet, ProgramIndicatorViewSet, ProgramOutcomeViewSet, ProgramOutcomeIndicatorViewSet, ReportingQuarterViewSet,
    ProgramOutcomeIndicatorPerformanceViewSet
)
from results_framework.views import OutputIndicatorViewSet, OutcomeIndicatorViewSet

router = DefaultRouter()
router.register(r'program-indicators', ProgramIndicatorViewSet, basename='program-indicators')
router.register(r'program-outcomes', ProgramOutcomeViewSet, basename='program-outcomes')
router.register(r'program-outcome-indicators', ProgramOutcomeIndicatorViewSet, basename='program-outcome-indicators')
router.register(r'program-outcome-indicator-performance', ProgramOutcomeIndicatorPerformanceViewSet, basename='program-outcome-indicator-performance')
router.register(r'program-outcome-performance', ProgramOutcomePerformanceViewSet, basename='program-outcome-performance')
router.register(r'reporting-quarters', ReportingQuarterViewSet, basename='reporting-quarters')
router.register(r'', ProgramViewSet, basename='programs')

urlpatterns = [

    path('', include(router.urls)),
]
