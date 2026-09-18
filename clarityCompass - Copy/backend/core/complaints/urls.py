from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers
from .views import (
    ComplaintViewSet, ComplaintAttachmentViewSet, 
    ComplaintFollowUpViewSet, ComplaintCommentViewSet
)

router = DefaultRouter()
router.register(r'complaints', ComplaintViewSet, basename='complaints')

complaints_router = routers.NestedDefaultRouter(router, r'complaints', lookup='complaint')
complaints_router.register(r'followups', ComplaintFollowUpViewSet, basename='complaint-followups')
complaints_router.register(r'attachments', ComplaintAttachmentViewSet, basename='complaint-attachments')
complaints_router.register(r'comments', ComplaintCommentViewSet, basename='complaint-comments')

urlpatterns = [
    path('', include(router.urls)),
    path('', include(complaints_router.urls)),
]