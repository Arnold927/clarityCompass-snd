from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)
from organizations.views import CurrentUserView
from .views import SharedPortalCurrentUserView

router = DefaultRouter()
router.register(r'proposals', views.CollaborationProposalViewSet)
router.register(r'reports', views.SharedReportViewSet)
router.register(r'messages', views.PortalMessageViewSet)
router.register(r'notifications', views.NotificationViewSet)
router.register(r'dashboard', views.DashboardViewSet, basename='dashboard')

urlpatterns = [
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    # path('shared-portal/', include(router.urls)),

    path('auth/user/', CurrentUserView.as_view(), name='current_user'),
    path('api/token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    path('partners/', views.get_partner_organizations, name='partner-organizations'),
    path('auth/me/', SharedPortalCurrentUserView.as_view(), name='shared_portal_current_user'),
    path('', include(router.urls)),
]