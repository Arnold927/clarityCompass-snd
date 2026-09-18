from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import OutcomeViewSet, OutcomeIndicatorViewSet, OutputViewSet, OutputIndicatorViewSet

router = DefaultRouter()
router.register(r'outcomes', OutcomeViewSet, basename='outcome')
router.register(r'outcome-indicators', OutcomeIndicatorViewSet, basename='outcome-indicator')
router.register(r'outputs', OutputViewSet, basename='output')
router.register(r'output-indicators', OutputIndicatorViewSet, basename='output-indicator')

# urlpatterns = router.urls

urlpatterns = [
    path('', include(router.urls)),
]
