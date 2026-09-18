from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/decisions/$', consumers.DecisionConsumer.as_asgi()),
    re_path(r'ws/notifications/$', consumers.NotificationConsumer.as_asgi()),
]