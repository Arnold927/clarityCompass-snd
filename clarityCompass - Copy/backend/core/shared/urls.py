from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DecisionViewSet, DecisionUpdateViewSet, NotificationViewSet, TagViewSet, UserViewSet

router = DefaultRouter()
router.register(r'decisions', DecisionViewSet, basename='decisions')
router.register(r'decision-updates', DecisionUpdateViewSet)
router.register(r'tags', TagViewSet)
router.register(r'users', UserViewSet, basename='users')
router.register(r'notifications', NotificationViewSet, basename='notifications')

decision_list = DecisionViewSet.as_view({
    'get': 'list',
    'post': 'create'
})

decision_detail = DecisionViewSet.as_view({
    'get': 'retrieve',
    'put': 'update',
    'patch': 'partial_update',
    'delete': 'destroy'
})

urlpatterns = [
    path('', include(router.urls)),
    path('decisions/<int:pk>/history/', DecisionViewSet.as_view({'get': 'history'}), name='decision-history'),
]