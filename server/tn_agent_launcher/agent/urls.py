from django.conf import settings
from django.urls import include, path
from rest_framework_nested import routers

from .views import AgentInstanceViewSet, AgentProjectViewSet

router = routers.SimpleRouter()
if settings.DEBUG:
    router = routers.DefaultRouter()

router.register("instances", AgentInstanceViewSet)
router.register("projects", AgentProjectViewSet)

urlpatterns = [
    path("api/agents/", include(router.urls)),
]
