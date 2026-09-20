from django.urls import path, include
from rest_framework import routers
from .views import (
    CountryViewSet, ThematicFocusViewSet, ThematicFocusIndicatorViewSet,
    LeadPartnerViewSet, LeadPartnerIndicatorViewSet, LeadPartnerDocumentViewSet,
    DonorViewSet, DonorIndicatorViewSet, DonorDocumentViewSet,
    ProjectViewSet, ProjectActivityViewSet, ProjectIndicatorViewSet, ProjectDocumentViewSet,
    DashboardView, SearchView,
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

urlpatterns = [
    path('dashboard/', DashboardView.as_view(), name='meal-dashboard'),
    path('search/', SearchView.as_view(), name='meal-search'),
    path('', include(router.urls)),
]