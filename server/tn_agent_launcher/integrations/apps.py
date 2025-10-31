from django.apps import AppConfig


class IntegrationsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "tn_agent_launcher.integrations"

    def ready(self):
        import tn_agent_launcher.integrations.signals  # noqa
