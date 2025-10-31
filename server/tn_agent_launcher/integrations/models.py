import json
import secrets

from django.conf import settings
from django.contrib.postgres.fields import ArrayField
from django.db import models
from encrypted_model_fields.fields import EncryptedTextField

from tn_agent_launcher.common.models import AbstractBaseModel


class Integration(AbstractBaseModel):
    class IntegrationTypes(models.TextChoices):
        GOOGLE_DRIVE = "google_drive", "Google Drive"
        AWS_S3 = "aws_s3", "AWS S3"
        WEBHOOK = "webhook", "Webhook"

    class IntegrationRoles(models.TextChoices):
        SINK = "SINK", "Sink"
        FUNNEL = "FUNNEL", "Funnel"

    name = models.CharField(max_length=255)
    integration_type = models.CharField(max_length=100, choices=IntegrationTypes.choices)
    integration_roles = ArrayField(
        models.CharField(max_length=10, choices=IntegrationRoles.choices),
        size=2,
        default=list,
        help_text="Defines whether this integration can be used as SINK, FUNNEL, or both"
    )
    is_system_provided = models.BooleanField(
        default=False, help_text="Uses Server-wide credentials, not available for webhooks"
    )
    user = models.ForeignKey("core.User", on_delete=models.CASCADE)
    # we want these as json strings
    _app_credentials = EncryptedTextField(
        blank=True,
        default="",
        help_text="Credentials required for app-based integrations, google console app or s3 keys",
    )
    _oauth_credentials = EncryptedTextField(
        blank=True,
        default="",
        help_text="Credentials required for OAuth-based integrations, including access and refresh tokens",
    )
    webhook_url = models.URLField(
        blank=True, null=True, help_text="URL for webhook-based integrations"
    )
    webhook_secret = EncryptedTextField(
        max_length=255, blank=True, default="", help_text="Secret for validating webhook payloads"
    )

    # decide if this is needed
    agent_tasks = models.ManyToManyField(
        "agent.AgentTask",
        blank=True,
        related_name="integrations",
        help_text="Agent tasks that can use this integration",
    )

    def __str__(self):
        return self.name

    class Meta:
        unique_together = ("user", "integration_type")

    @property
    def app_credentials(self):
        if self.is_system_provided:
            # Return system credentials from environment variables
            if self.integration_type == self.IntegrationTypes.AWS_S3:
                return {
                    "aws_access_key_id": getattr(settings, "AWS_ACCESS_KEY_ID", ""),
                    "aws_secret_access_key": getattr(settings, "AWS_SECRET_ACCESS_KEY", ""),
                    "bucket_name": getattr(settings, "AWS_STORAGE_BUCKET_NAME", ""),
                    "region": getattr(settings, "AWS_S3_REGION_NAME", "us-east-1"),
                    "location": getattr(settings, "AWS_LOCATION", ""),
                }
            elif self.integration_type == self.IntegrationTypes.GOOGLE_DRIVE:
                google_credentials = getattr(settings, "GOOGLE_OAUTH_CREDENTIALS", "")
                if google_credentials:
                    try:
                        return json.loads(google_credentials)
                    except json.JSONDecodeError:
                        return {}
                return {}

        # Return user-provided credentials
        if not self._app_credentials:
            return {}
        return json.loads(self._app_credentials)

    @app_credentials.setter
    def app_credentials(self, value):
        self._app_credentials = json.dumps(value) if value else ""

    @property
    def oauth_credentials(self):
        if not self._oauth_credentials:
            return {}
        return json.loads(self._oauth_credentials)

    @oauth_credentials.setter
    def oauth_credentials(self, value):
        self._oauth_credentials = json.dumps(value) if value else ""

    def save(self, *args, **kwargs):
        # Set default integration roles based on integration type
        if not self.integration_roles:
            if self.integration_type == self.IntegrationTypes.GOOGLE_DRIVE:
                self.integration_roles = [self.IntegrationRoles.SINK, self.IntegrationRoles.FUNNEL]
            elif self.integration_type == self.IntegrationTypes.AWS_S3:
                self.integration_roles = [self.IntegrationRoles.SINK, self.IntegrationRoles.FUNNEL]
            elif self.integration_type == self.IntegrationTypes.WEBHOOK:
                self.integration_roles = [self.IntegrationRoles.SINK]

        # Generate webhook secret for webhook integrations
        if (
            self.integration_type == self.IntegrationTypes.WEBHOOK
            and self.webhook_url
            and not self.webhook_secret
        ):
            self.webhook_secret = secrets.token_urlsafe(32)

        super().save(*args, **kwargs)

    @property
    def can_be_sink(self):
        """Check if this integration can be used as a sink (output)."""
        return self.IntegrationRoles.SINK in self.integration_roles

    @property
    def can_be_funnel(self):
        """Check if this integration can be used as a funnel (input)."""
        return self.IntegrationRoles.FUNNEL in self.integration_roles
