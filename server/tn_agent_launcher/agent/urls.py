from django.conf import settings
from django.urls import include, path
from rest_framework_nested import routers

from .views import (
    AgentInstanceViewSet,
    AgentProjectViewSet,
    AgentTaskExecutionViewSet,
    AgentTaskFunnelViewSet,
    AgentTaskSinkViewSet,
    AgentTaskViewSet,
    ProjectEnvironmentSecretViewSet,
)

router = routers.SimpleRouter()
if settings.DEBUG:
    router = routers.DefaultRouter()

router.register("instances", AgentInstanceViewSet)
router.register("projects", AgentProjectViewSet)
router.register("tasks", AgentTaskViewSet)
router.register("executions", AgentTaskExecutionViewSet)
router.register("task-sinks", AgentTaskSinkViewSet)
router.register("task-funnels", AgentTaskFunnelViewSet)
router.register("environment-secrets", ProjectEnvironmentSecretViewSet)

urlpatterns = [
    path("api/agents/", include(router.urls)),
]
