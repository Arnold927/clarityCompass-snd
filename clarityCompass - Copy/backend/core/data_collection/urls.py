from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DataCollectionFormViewSet, FormFieldViewSet, SubmissionViewSet


router = DefaultRouter()
router.register(r'forms', DataCollectionFormViewSet, basename='forms')
router.register(r'fields', FormFieldViewSet, basename='form-fields')
router.register(r'submissions', SubmissionViewSet, basename='submissions')

urlpatterns = [

    path('', include(router.urls)),
]