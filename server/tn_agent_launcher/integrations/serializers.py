import json
from rest_framework import serializers
from django.conf import settings
from .models import Integration


class IntegrationSerializer(serializers.ModelSerializer):
    # Write-only credential fields for S3
    aws_access_key_id = serializers.CharField(write_only=True, required=False)
    aws_secret_access_key = serializers.CharField(write_only=True, required=False)
    bucket_name = serializers.CharField(write_only=True, required=False)
    region = serializers.CharField(write_only=True, required=False)
    location = serializers.CharField(write_only=True, required=False)
    
    # File upload for Google Drive credentials
    credentials_file = serializers.FileField(write_only=True, required=False)
    
    # Task management field - allow users to assign/remove tasks
    from tn_agent_launcher.agent.models import AgentTask
    agent_tasks = serializers.PrimaryKeyRelatedField(
        many=True,
        read_only=False,
        required=False,
        allow_empty=True,
        queryset=AgentTask.objects.none()  # Will be set in __init__ to filter by user
    )
    
    # Read-only fields to show credential status without exposing values
    has_app_credentials = serializers.SerializerMethodField()
    has_oauth_credentials = serializers.SerializerMethodField()
    oauth_status = serializers.SerializerMethodField()
    
    class Meta:
        model = Integration
        fields = [
            'id', 'name', 'integration_type', 'is_system_provided', 
            'webhook_url', 'agent_tasks', 'created', 'last_edited',
            # Write-only credential fields
            'aws_access_key_id', 'aws_secret_access_key', 'bucket_name', 
            'region', 'location', 'credentials_file',
            # Read-only status fields
            'has_app_credentials', 'has_oauth_credentials', 'oauth_status'
        ]
        read_only_fields = ['id', 'created', 'last_edited', 'user']
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Limit agent_tasks to current user's tasks
        from tn_agent_launcher.agent.models import AgentTask
        if 'request' in self.context and hasattr(self.context['request'], 'user'):
            user = self.context['request'].user
            self.fields['agent_tasks'].queryset = AgentTask.objects.filter(
                agent_instance__user=user
            )
        else:
            # Fallback queryset when no request context (e.g., in tests)
            self.fields['agent_tasks'].queryset = AgentTask.objects.none()
    
    def get_has_app_credentials(self, obj):
        """Check if integration has app credentials configured"""
        return bool(obj.app_credentials)
    
    def get_has_oauth_credentials(self, obj):
        """Check if integration has OAuth credentials"""
        return bool(obj.oauth_credentials)
    
    def get_oauth_status(self, obj):
        """Get OAuth status for Google Drive integrations"""
        if obj.integration_type != Integration.IntegrationTypes.GOOGLE_DRIVE:
            return None
        
        if not obj.oauth_credentials:
            return "not_configured"
        
        # Could add token expiry check here in the future
        return "configured"
    
    def validate(self, data):
        """Validate integration data based on type and system_provided setting"""
        integration_type = data.get('integration_type')
        is_system_provided = data.get('is_system_provided', False)
        
        # S3 validation
        if integration_type == Integration.IntegrationTypes.AWS_S3:
            if not is_system_provided:
                # User-provided S3 requires credentials
                required_s3_fields = ['aws_access_key_id', 'aws_secret_access_key', 'bucket_name']
                missing_fields = [field for field in required_s3_fields if not data.get(field)]
                if missing_fields:
                    raise serializers.ValidationError({
                        'non_field_errors': f"For user-provided S3, these fields are required: {', '.join(missing_fields)}"
                    })
        
        # Google Drive validation
        elif integration_type == Integration.IntegrationTypes.GOOGLE_DRIVE:
            if not is_system_provided and not data.get('credentials_file'):
                raise serializers.ValidationError({
                    'credentials_file': 'Google Drive app credentials file is required for user-provided integrations'
                })
        
        # Webhook validation
        elif integration_type == Integration.IntegrationTypes.WEBHOOK:
            if is_system_provided:
                raise serializers.ValidationError({
                    'is_system_provided': 'Webhooks cannot use system-provided credentials'
                })
            if not data.get('webhook_url'):
                raise serializers.ValidationError({
                    'webhook_url': 'Webhook URL is required for webhook integrations'
                })
        
        return data
    
    def create(self, validated_data):
        """Create integration with proper credential handling"""
        integration_type = validated_data['integration_type']
        is_system_provided = validated_data.get('is_system_provided', False)
        
        # Extract agent_tasks for assignment after creation
        agent_tasks = validated_data.pop('agent_tasks', [])
        
        # Handle S3 integration
        if integration_type == Integration.IntegrationTypes.AWS_S3:
            if not is_system_provided:
                # Store user-provided S3 credentials
                app_credentials = {
                    'aws_access_key_id': validated_data.pop('aws_access_key_id'),
                    'aws_secret_access_key': validated_data.pop('aws_secret_access_key'),
                    'bucket_name': validated_data.pop('bucket_name'),
                    'region': validated_data.pop('region', 'us-east-1'),
                    'location': validated_data.pop('location', '')
                }
                validated_data['_app_credentials'] = json.dumps(app_credentials)
        
        # Handle Google Drive integration
        elif integration_type == Integration.IntegrationTypes.GOOGLE_DRIVE:
            if not is_system_provided:
                # Store user-provided Google app credentials
                credentials_file = validated_data.pop('credentials_file')
                try:
                    # lets also allow for dict
                    google_credentials = json.loads(credentials_file.read().decode('utf-8'))
                    validated_data['_app_credentials'] = json.dumps(google_credentials)
                except (json.JSONDecodeError, UnicodeDecodeError):
                    raise serializers.ValidationError({
                        'credentials_file': 'Invalid JSON file format'
                    })
            else:
                # For system-provided, we'll copy credentials during OAuth flow
                pass
        
        # Clean up any remaining write-only fields
        for field in ['aws_access_key_id', 'aws_secret_access_key', 'bucket_name', 
                     'region', 'location', 'credentials_file']:
            validated_data.pop(field, None)
        
        # Create integration
        integration = super().create(validated_data)
        
        # Assign tasks if provided
        if agent_tasks:
            integration.agent_tasks.set(agent_tasks)
        
        return integration
    
    def update(self, instance, validated_data):
        """Update integration, including task assignments"""
        # Handle agent_tasks update
        agent_tasks = validated_data.pop('agent_tasks', None)
        
        # Remove write-only fields that shouldn't be updated
        for field in ['aws_access_key_id', 'aws_secret_access_key', 'bucket_name', 
                     'region', 'location', 'credentials_file']:
            validated_data.pop(field, None)
        
        # Update other fields
        instance = super().update(instance, validated_data)
        
        # Update task assignments if provided
        if agent_tasks is not None:
            instance.agent_tasks.set(agent_tasks)
        
        return instance