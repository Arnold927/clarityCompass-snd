from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    StrategicPlanViewSet,StrategicObjectiveViewSet,CorporateIndicatorViewSet,DisaggregatorViewSet,CorporateIndicatorViewSet,
    StrategicPlanYearViewSet, CorporateIndicatorPerformanceViewSet, StrategicObjectiveStatementViewSet

)

router = DefaultRouter()
router.register(r'strategic-plan', StrategicPlanViewSet, basename='strategic-plan')
router.register(r'strategic-objectives', StrategicObjectiveViewSet, basename='strategic-objectives')
router.register(r'indicators', CorporateIndicatorViewSet, basename='indicators')
router.register(r'disaggregators', DisaggregatorViewSet, basename='disaggregators')
router.register(r'corporate-indicator-performances', CorporateIndicatorPerformanceViewSet, basename='corporate-indicator-performance')
router.register(r'plan-years', StrategicPlanYearViewSet, basename='plan-years')
router.register(r'statements', StrategicObjectiveStatementViewSet, basename='statements')
urlpatterns = [
    path('', include(router.urls)),
]
