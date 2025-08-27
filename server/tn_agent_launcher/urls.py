from django.contrib import admin
from django.urls import include, path

admin.site.site_header = "tn-agent-launcher Admin"
admin.site.site_title = "tn-agent-launcher"

urlpatterns = [
    path(r"staff/", admin.site.urls),
    path(r"", include("tn_agent_launcher.agent.urls")),
    path(r"api/chat/", include("tn_agent_launcher.chat.urls")),
    # order matters
    path(r"", include("tn_agent_launcher.core.urls")),
    path(r"", include("tn_agent_launcher.common.favicon_urls")),
    path(r"", include("tn_agent_launcher.common.urls")),
]
