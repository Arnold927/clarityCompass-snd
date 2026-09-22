from django.urls import path, include
from rest_framework import routers
from .views import (
    CountryViewSet, ThematicFocusViewSet, ThematicFocusIndicatorViewSet,
    LeadPartnerViewSet, LeadPartnerIndicatorViewSet, LeadPartnerDocumentViewSet,
    DonorViewSet, DonorIndicatorViewSet, DonorDocumentViewSet,
    ProjectViewSet, ProjectActivityViewSet, ProjectIndicatorViewSet, ProjectDocumentViewSet,
    ProjectLocationViewSet, ActivityLocationViewSet,
    DashboardView, SearchView, MapPointsView,
)

router = routers.DefaultRouter()
router.register(r'countries', CountryViewSet, basename='meal-country')
router.register(r'thematic-focus', ThematicFocusViewSet, basename='meal-thematic-focus')
router.register(r'thematic-focus-indicators', ThematicFocusIndicatorViewSet, basename='meal-thematic-focus-indicator')
router.register(r'lead-partners', LeadPartnerViewSet, basename='meal-lead-partner')
router.register(r'lead-partner-indicators', LeadPartnerIndicatorViewSet, basename='meal-lead-partner-indicator')
router.register(r'lead-partner-documents', LeadPartnerDocumentViewSet, basename='meal-lead-partner-document')
router.register(r'donors', DonorViewSet, basename='meal-donor')
router.register(r'donor-indicators', DonorIndicatorViewSet, basename='meal-donor-indicator')
router.register(r'donor-documents', DonorDocumentViewSet, basename='meal-donor-document')
router.register(r'projects', ProjectViewSet, basename='meal-project')
router.register(r'project-activities', ProjectActivityViewSet, basename='meal-project-activity')
router.register(r'project-indicators', ProjectIndicatorViewSet, basename='meal-project-indicator')
router.register(r'project-documents', ProjectDocumentViewSet, basename='meal-project-document')
router.register(r'project-locations', ProjectLocationViewSet, basename='meal-project-location')
router.register(r'activity-locations', ActivityLocationViewSet, basename='meal-activity-location')

urlpatterns = [
    path('dashboard/', DashboardView.as_view(), name='meal-dashboard'),
    path('search/', SearchView.as_view(), name='meal-search'),
    path('map-points/', MapPointsView.as_view(), name='meal-map-points'),
    path('', include(router.urls)),
]