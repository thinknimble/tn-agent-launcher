import json
import logging
import requests
from urllib.parse import urlencode

from django.conf import settings
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, JSONParser

from .models import Integration
from .serializers import IntegrationSerializer

logger = logging.getLogger(__name__)


class IntegrationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing user integrations with support for OAuth flows.
    """
    serializer_class = IntegrationSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser]  # Support file uploads
    
    def get_queryset(self):
        """Users can only see their own integrations"""
        return Integration.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        """Auto-assign current user to integration"""
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['get'], url_path='google-oauth-url')
    def google_oauth_redirect_url(self, request, pk=None):
        """
        Generate Google OAuth redirect URL for a specific integration.
        Uses integration's app credentials (system or user-provided).
        """
        integration = self.get_object()
        
        if integration.integration_type != Integration.IntegrationTypes.GOOGLE_DRIVE:
            return Response(
                {"error": "Not a Google Drive integration"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get redirect URL from settings or use get_site_url
        redirect_url = getattr(settings, "GOOGLE_OAUTH_REDIRECT_URL", None)
        if not redirect_url:
            from tn_agent_launcher.utils.sites import get_site_url
            redirect_url = f"{get_site_url()}/api/integrations/google-oauth-callback/"
        
        try:
            # Get credentials from integration (system or user-provided)
            if integration.is_system_provided:
                # Use system credentials from environment
                google_credentials = getattr(settings, "GOOGLE_OAUTH_CREDENTIALS", "")
                if not google_credentials:
                    return Response(
                        {"error": "System Google OAuth not configured. Missing GOOGLE_OAUTH_CREDENTIALS setting."},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )
                credentials_data = json.loads(google_credentials)
                # For system integrations, copy system credentials to integration
                integration.app_credentials = credentials_data
                integration.save()
            else:
                # Use user-provided credentials stored in integration
                if not integration.app_credentials:
                    return Response(
                        {"error": "No Google app credentials configured for this integration"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                credentials_data = integration.app_credentials
            
            # Extract client_id (handle both 'web' and 'installed' app types)
            client_id = None
            if 'web' in credentials_data:
                client_id = credentials_data['web'].get('client_id')
            elif 'installed' in credentials_data:
                client_id = credentials_data['installed'].get('client_id')
            
            if not client_id:
                return Response(
                    {"error": "No client_id found in Google app credentials"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
        
        except (json.JSONDecodeError, KeyError) as e:
            logger.error(f"Invalid Google credentials format: {e}")
            return Response(
                {"error": "Invalid Google app credentials format"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        
        # OAuth parameters
        params = {
            "client_id": client_id,
            "redirect_uri": redirect_url,
            "scope": "https://www.googleapis.com/auth/drive",
            "response_type": "code",
            "state": str(integration.id),  # Use integration ID as state
            "access_type": "offline",  # Get refresh token
            "prompt": "consent",  # Force consent to get refresh token
        }
        
        auth_url = f"https://accounts.google.com/o/oauth2/auth?{urlencode(params)}"
        
        return Response({"auth_url": auth_url})
    
    @action(detail=False, methods=['post'], url_path='google-oauth-callback')
    def google_oauth_callback(self, request):
        """
        Handle Google OAuth callback and save tokens to integration.
        """
        data = request.data
        
        # Extract authorization code and state (integration ID)
        code = data.get('code')
        state = data.get('state')  # Integration ID
        
        if not code or not state:
            return Response(
                {"error": "Missing authorization code or state"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        try:
            # Get the integration
            integration = Integration.objects.get(id=state, user=request.user)
            
            if integration.integration_type != Integration.IntegrationTypes.GOOGLE_DRIVE:
                return Response(
                    {"error": "Not a Google Drive integration"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            
            # Get credentials for token exchange
            if integration.is_system_provided:
                google_credentials = json.loads(getattr(settings, "GOOGLE_OAUTH_CREDENTIALS", "{}"))
            else:
                google_credentials = integration.app_credentials
            
            # Extract client credentials (handle both 'web' and 'installed')
            client_id = None
            client_secret = None
            
            if 'web' in google_credentials:
                client_id = google_credentials['web'].get('client_id')
                client_secret = google_credentials['web'].get('client_secret')
            elif 'installed' in google_credentials:
                client_id = google_credentials['installed'].get('client_id')
                client_secret = google_credentials['installed'].get('client_secret')
            
            if not client_id or not client_secret:
                return Response(
                    {"error": "Missing client credentials"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
            
            # Get redirect URL
            redirect_url = getattr(settings, "GOOGLE_OAUTH_REDIRECT_URL", None)
            if not redirect_url:
                from tn_agent_launcher.utils.sites import get_site_url
                redirect_url = f"{get_site_url()}/api/integrations/google-oauth-callback/"
            
            # Exchange authorization code for tokens
            token_url = "https://oauth2.googleapis.com/token"
            token_data = {
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": redirect_url,
            }
            
            response = requests.post(token_url, data=token_data)
            if response.status_code != 200:
                logger.error(f"Token exchange failed: {response.text}")
                return Response(
                    {"error": "Failed to exchange authorization code"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            
            token_response = response.json()
            
            # Save tokens to integration
            integration.oauth_credentials = token_response
            integration.save()
            
            logger.info(f"Google OAuth token saved for integration {integration.id}")
            
            return Response({
                "message": "Google OAuth completed successfully",
                "integration_id": str(integration.id)
            })
            
        except Integration.DoesNotExist:
            return Response(
                {"error": "Integration not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            logger.error(f"OAuth callback error: {str(e)}")
            return Response(
                {"error": "OAuth callback failed"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
    
    @action(detail=True, methods=['delete'], url_path='google-oauth-revoke')
    def google_oauth_revoke_token(self, request, pk=None):
        """
        Revoke Google OAuth token for a specific integration.
        """
        integration = self.get_object()
        
        if integration.integration_type != Integration.IntegrationTypes.GOOGLE_DRIVE:
            return Response(
                {"error": "Not a Google Drive integration"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        if not integration.oauth_credentials:
            return Response(
                {"error": "No Google token found for this integration"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        try:
            # Get the access token to revoke
            access_token = integration.oauth_credentials.get("access_token")
            
            if access_token:
                # Revoke the token with Google
                revoke_url = f"https://oauth2.googleapis.com/revoke?token={access_token}"
                response = requests.post(revoke_url)
                
                if response.status_code != 200:
                    logger.warning(f"Failed to revoke Google token: {response.text}")
            
            # Remove tokens from integration
            integration.oauth_credentials = {}
            integration.save()
            
            logger.info(f"Google OAuth token revoked for integration {integration.id}")
            
            return Response({
                "message": "Google OAuth token revoked successfully",
                "integration_id": str(integration.id)
            })
            
        except Exception as e:
            logger.error(f"Token revocation error: {str(e)}")
            # Still clear the token even if Google revocation failed
            integration.oauth_credentials = {}
            integration.save()
            
            return Response({
                "message": "Google OAuth token removed (revocation may have failed)",
                "integration_id": str(integration.id)
            })
    
    @action(detail=False, methods=['get'], url_path='available-types')
    def available_integration_types(self, request):
        """
        Return available integration types for the UI dropdown.
        """
        types = []
        
        # S3 options
        types.append({
            "type": Integration.IntegrationTypes.AWS_S3,
            "label": "System S3",
            "is_system": True,
            "description": "Use system-provided S3 credentials"
        })
        types.append({
            "type": Integration.IntegrationTypes.AWS_S3,
            "label": "My S3 Account", 
            "is_system": False,
            "description": "Use your own AWS S3 credentials"
        })
        
        # Google Drive options
        types.append({
            "type": Integration.IntegrationTypes.GOOGLE_DRIVE,
            "label": "System Google Drive",
            "is_system": True,
            "description": "Use system-provided Google app"
        })
        types.append({
            "type": Integration.IntegrationTypes.GOOGLE_DRIVE,
            "label": "My Google Drive App",
            "is_system": False,
            "description": "Use your own Google app credentials"
        })
        
        # Webhook (always user-provided)
        types.append({
            "type": Integration.IntegrationTypes.WEBHOOK,
            "label": "Webhook",
            "is_system": False,
            "description": "Configure webhook endpoint"
        })
        
        return Response(types)
