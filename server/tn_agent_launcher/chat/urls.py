from django.conf import settings
from django.urls import include, path
from rest_framework_nested import routers

from . import views as chat_views

router = routers.SimpleRouter()
if settings.DEBUG:
    router = routers.DefaultRouter()

router.register(r'prompt-templates', chat_views.PromptTemplateViewSet)

urlpatterns = [
    path("", include(router.urls)),
    path("system-prompt/", chat_views.get_current_system_prompt, name="system-prompt"),
]
