import base64
import json
import logging
import pickle
import time
from urllib.parse import urlencode

import boto3
import requests
from django.conf import settings
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import JSONParser, MultiPartParser
from rest_framework.response import Response

from tn_agent_launcher.utils.sites import get_site_url

from .filters import IntegrationFilters
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
    filter_backends = [DjangoFilterBackend]
    filterset_class = IntegrationFilters

    def get_queryset(self):
        """Users can only see their own integrations"""
        return Integration.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        """Auto-assign current user to integration"""
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["post"], url_path="google-oauth-redirect-url")
    def google_oauth_redirect_url(self, request, pk=None):
        """
        Generate Google OAuth redirect URL based on user preferences.
        Accepts credentials file for custom integrations or is_system flag.
        """
        data = request.data
        is_system_str = data.get("is_system", "false")
        is_system = is_system_str.lower() in ("true", "1", "yes")
        credentials_file = request.FILES.get("credentials")

        # Validate inputs
        if not is_system and not credentials_file:
            return Response(
                {"error": "Either is_system must be True or credentials file must be provided"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get redirect URL from settings or use get_site_url
        redirect_url = getattr(settings, "GOOGLE_OAUTH_REDIRECT_URL", None)
        if not redirect_url:
            redirect_url = f"{get_site_url()}/oauth/callback"

        try:
            # Get credentials based on request
            if is_system:
                # Use system credentials from environment
                google_credentials = getattr(settings, "GOOGLE_OAUTH_CREDENTIALS", "")
                if not google_credentials:
                    return Response(
                        {
                            "error": "System Google OAuth not configured. Missing GOOGLE_OAUTH_CREDENTIALS setting."
                        },
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )
                credentials_data = json.loads(google_credentials)
            else:
                # Parse user-provided credentials file
                try:
                    credentials_content = credentials_file.read().decode("utf-8")
                    credentials_data = json.loads(credentials_content)
                except (UnicodeDecodeError, json.JSONDecodeError) as e:
                    return Response(
                        {"error": f"Invalid credentials file format: {str(e)}"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            # Extract client_id (handle both 'web' and 'installed' app types)
            client_id = None
            if "web" in credentials_data:
                client_id = credentials_data["web"].get("client_id")
            elif "installed" in credentials_data:
                client_id = credentials_data["installed"].get("client_id")

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

        # Store credentials temporarily in session or cache
        # We'll use the user ID + timestamp as state and store credentials temporarily

        state_data = {
            "user_id": request.user.id,
            "timestamp": int(time.time()),
            "is_system": is_system,
            "credentials_data": credentials_data,
        }

        # Encode state for URL safety
        state_encoded = base64.urlsafe_b64encode(pickle.dumps(state_data)).decode()

        # OAuth parameters
        params = {
            "client_id": client_id,
            "redirect_uri": redirect_url,
            "scope": "https://www.googleapis.com/auth/drive",
            "response_type": "code",
            "state": state_encoded,
            "access_type": "offline",  # Get refresh token
            "prompt": "consent",  # Force consent to get refresh token
        }

        auth_url = f"https://accounts.google.com/o/oauth2/auth?{urlencode(params)}"

        return Response({"auth_url": auth_url})

    @action(detail=False, methods=["post"], url_path="google-oauth-callback")
    def google_oauth_callback(self, request):
        """
        Handle Google OAuth callback and save tokens to integration.
        """
        data = request.data

        # Extract authorization code and state
        code = data.get("code")
        state_encoded = data.get("state")

        if not code or not state_encoded:
            return Response(
                {"error": "Missing authorization code or state"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Decode state to get credentials and user info

            state_data = pickle.loads(base64.urlsafe_b64decode(state_encoded.encode()))

            # Verify user matches
            if state_data["user_id"] != request.user.id:
                return Response(
                    {"error": "Invalid state - user mismatch"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Check if state is not too old (1 hour max)

            if time.time() - state_data["timestamp"] > 3600:
                return Response(
                    {"error": "OAuth state expired, please try again"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            credentials_data = state_data["credentials_data"]
            is_system = state_data["is_system"]

            # Extract client credentials (handle both 'web' and 'installed')
            client_id = None
            client_secret = None

            if "web" in credentials_data:
                client_id = credentials_data["web"].get("client_id")
                client_secret = credentials_data["web"].get("client_secret")
            elif "installed" in credentials_data:
                client_id = credentials_data["installed"].get("client_id")
                client_secret = credentials_data["installed"].get("client_secret")

            if not client_id or not client_secret:
                return Response(
                    {"error": "Missing client credentials"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            # Get redirect URL
            redirect_url = getattr(settings, "GOOGLE_OAUTH_REDIRECT_URL", None)
            if not redirect_url:
                redirect_url = f"{get_site_url()}/oauth/callback"

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

            # Create the integration now that OAuth is successful
            integration = Integration.objects.create(
                user=request.user,
                name=f"{'System' if is_system else 'My'} Google Drive",
                integration_type=Integration.IntegrationTypes.GOOGLE_DRIVE,
                is_system_provided=is_system,
                app_credentials=credentials_data,
                oauth_credentials=token_response,
            )

            logger.info(f"Google integration created with OAuth: {integration.id}")

            return Response(
                {
                    "message": "Google OAuth completed successfully",
                    "integration_id": str(integration.id),
                }
            )

        except (pickle.PickleError, ValueError, KeyError) as e:
            return Response(
                {"error": f"Invalid OAuth state: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            logger.error(f"OAuth callback error: {str(e)}")
            return Response(
                {"error": "OAuth callback failed"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["delete"], url_path="google-oauth-revoke")
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

            return Response(
                {
                    "message": "Google OAuth token revoked successfully",
                    "integration_id": str(integration.id),
                }
            )

        except Exception as e:
            logger.error(f"Token revocation error: {str(e)}")
            # Still clear the token even if Google revocation failed
            integration.oauth_credentials = {}
            integration.save()

            return Response(
                {
                    "message": "Google OAuth token removed (revocation may have failed)",
                    "integration_id": str(integration.id),
                }
            )

    @action(detail=True, methods=["get"], url_path="directories")
    def get_directories(self, request, pk=None):
        """
        Get available directories for the integration.
        For system S3 integrations, only returns directories within user_id/ prefix.
        """
        integration = self.get_object()
        
        try:
            if integration.integration_type == Integration.IntegrationTypes.AWS_S3:
                return self._get_s3_directories(integration, request.user)
            elif integration.integration_type == Integration.IntegrationTypes.GOOGLE_DRIVE:
                return self._get_google_drive_directories(integration, request.user)
            else:
                return Response(
                    {"error": "Directory listing not supported for this integration type"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except Exception as e:
            logger.error(f"Error retrieving directories for integration {integration.id}: {str(e)}")
            return Response(
                {"error": "Failed to retrieve directories"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def _get_s3_directories(self, integration, user):
        """Get S3 directories with user-specific filtering for system integrations."""
        credentials = integration.app_credentials
        
        if not credentials:
            return Response(
                {"error": "No S3 credentials configured"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Create S3 client
            s3_client = boto3.client(
                's3',
                aws_access_key_id=credentials.get('aws_access_key_id'),
                aws_secret_access_key=credentials.get('aws_secret_access_key'),
                region_name=credentials.get('region', 'us-east-1')
            )
            
            bucket_name = credentials.get('bucket_name')
            if not bucket_name:
                return Response(
                    {"error": "No bucket name configured"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # For system integrations, only show directories under user_id/
            prefix = ""
            if integration.is_system_provided:
                prefix = f"{user.id}/"

            # List objects with delimiter to get "folders"
            response = s3_client.list_objects_v2(
                Bucket=bucket_name,
                Prefix=prefix,
                Delimiter='/'
            )

            directories = []
            
            # Add common prefixes (folders)
            for common_prefix in response.get('CommonPrefixes', []):
                folder_name = common_prefix['Prefix']
                # Remove the user prefix for display
                if integration.is_system_provided and folder_name.startswith(f"{user.id}/"):
                    display_name = folder_name[len(f"{user.id}/"):]
                else:
                    display_name = folder_name
                
                directories.append({
                    'name': display_name.rstrip('/'),
                    'path': folder_name,
                    'type': 'folder'
                })

            # Sort directories by name
            directories.sort(key=lambda x: x['name'])

            return Response({"directories": directories})

        except Exception as e:
            logger.error(f"S3 directory listing error: {str(e)}")
            return Response(
                {"error": "Failed to list S3 directories"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def _get_google_drive_directories(self, integration, user):
        """Get Google Drive directories (folders)."""
        oauth_creds = integration.oauth_credentials
        
        if not oauth_creds or not oauth_creds.get('access_token'):
            return Response(
                {"error": "Google Drive not connected. Please authorize access first."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Use Google Drive API to list folders
            headers = {
                'Authorization': f"Bearer {oauth_creds['access_token']}",
                'Content-Type': 'application/json'
            }
            
            # Query for folders only
            params = {
                'q': "mimeType='application/vnd.google-apps.folder' and trashed=false",
                'fields': 'files(id,name,parents)',
                'pageSize': 100
            }
            
            response = requests.get(
                'https://www.googleapis.com/drive/v3/files',
                headers=headers,
                params=params
            )
            
            if response.status_code == 401:
                # Token might be expired, try refreshing
                if self._refresh_google_token(integration):
                    # Retry with new token
                    headers['Authorization'] = f"Bearer {integration.oauth_credentials['access_token']}"
                    response = requests.get(
                        'https://www.googleapis.com/drive/v3/files',
                        headers=headers,
                        params=params
                    )
                else:
                    return Response(
                        {"error": "Google Drive access token expired and refresh failed"},
                        status=status.HTTP_401_UNAUTHORIZED,
                    )
            
            if response.status_code != 200:
                logger.error(f"Google Drive API error: {response.text}")
                return Response(
                    {"error": "Failed to retrieve Google Drive folders"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            data = response.json()
            directories = []
            
            for file in data.get('files', []):
                directories.append({
                    'name': file['name'],
                    'path': file['id'],  # Google Drive uses file ID as path
                    'type': 'folder',
                    'parents': file.get('parents', [])
                })

            # Sort directories by name
            directories.sort(key=lambda x: x['name'])

            return Response({"directories": directories})

        except Exception as e:
            logger.error(f"Google Drive directory listing error: {str(e)}")
            return Response(
                {"error": "Failed to list Google Drive directories"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def _refresh_google_token(self, integration):
        """Refresh Google OAuth token if refresh token is available."""
        oauth_creds = integration.oauth_credentials
        app_creds = integration.app_credentials
        
        refresh_token = oauth_creds.get('refresh_token')
        if not refresh_token:
            return False

        # Extract client credentials
        client_id = None
        client_secret = None
        
        if "web" in app_creds:
            client_id = app_creds["web"].get("client_id")
            client_secret = app_creds["web"].get("client_secret")
        elif "installed" in app_creds:
            client_id = app_creds["installed"].get("client_id")
            client_secret = app_creds["installed"].get("client_secret")

        if not client_id or not client_secret:
            return False

        try:
            # Refresh the token
            token_url = "https://oauth2.googleapis.com/token"
            token_data = {
                "client_id": client_id,
                "client_secret": client_secret,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            }

            response = requests.post(token_url, data=token_data)
            if response.status_code == 200:
                new_tokens = response.json()
                # Update stored credentials
                oauth_creds.update(new_tokens)
                integration.oauth_credentials = oauth_creds
                integration.save()
                return True

        except Exception as e:
            logger.error(f"Token refresh error: {str(e)}")
        
        return False
