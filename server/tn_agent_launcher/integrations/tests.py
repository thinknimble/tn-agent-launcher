from django.test import TestCase
from django.contrib.auth import get_user_model
from .models import Integration

User = get_user_model()


class IntegrationRolesTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )

    def test_google_drive_integration_roles(self):
        """Test that Google Drive integrations get both SINK and FUNNEL roles."""
        integration = Integration.objects.create(
            name='Test Google Drive',
            integration_type=Integration.IntegrationTypes.GOOGLE_DRIVE,
            user=self.user
        )
        self.assertIn(Integration.IntegrationRoles.SINK, integration.integration_roles)
        self.assertIn(Integration.IntegrationRoles.FUNNEL, integration.integration_roles)
        self.assertTrue(integration.can_be_sink)
        self.assertTrue(integration.can_be_funnel)

    def test_s3_integration_roles(self):
        """Test that S3 integrations get both SINK and FUNNEL roles."""
        integration = Integration.objects.create(
            name='Test S3',
            integration_type=Integration.IntegrationTypes.AWS_S3,
            user=self.user
        )
        self.assertIn(Integration.IntegrationRoles.SINK, integration.integration_roles)
        self.assertIn(Integration.IntegrationRoles.FUNNEL, integration.integration_roles)
        self.assertTrue(integration.can_be_sink)
        self.assertTrue(integration.can_be_funnel)

    def test_webhook_integration_roles(self):
        """Test that Webhook integrations get only SINK role."""
        integration = Integration.objects.create(
            name='Test Webhook',
            integration_type=Integration.IntegrationTypes.WEBHOOK,
            webhook_url='https://example.com/webhook',
            user=self.user
        )
        self.assertIn(Integration.IntegrationRoles.SINK, integration.integration_roles)
        self.assertNotIn(Integration.IntegrationRoles.FUNNEL, integration.integration_roles)
        self.assertTrue(integration.can_be_sink)
        self.assertFalse(integration.can_be_funnel)
