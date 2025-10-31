import logging

import boto3
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Integration

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Integration)
def create_user_directories(sender, instance, created, **kwargs):
    """
    Create user-specific directories in S3 when a system S3 integration is created.
    Creates user_id/funnels/ and user_id/sinks/ directories.
    """
    if (
        created
        and instance.integration_type == Integration.IntegrationTypes.AWS_S3
        and instance.is_system_provided
    ):
        try:
            credentials = instance.app_credentials
            if not credentials:
                logger.warning(f"No S3 credentials available for integration {instance.id}")
                return

            # Create S3 client
            s3_client = boto3.client(
                's3',
                aws_access_key_id=credentials.get('aws_access_key_id'),
                aws_secret_access_key=credentials.get('aws_secret_access_key'),
                region_name=credentials.get('region', 'us-east-1')
            )

            bucket_name = credentials.get('bucket_name')
            if not bucket_name:
                logger.warning(f"No bucket name configured for integration {instance.id}")
                return

            user_id = instance.user.id
            
            # Create directory structure by uploading empty objects with trailing slash
            directories = [
                f"{user_id}/funnels/",
                f"{user_id}/sinks/"
            ]

            for directory in directories:
                try:
                    # Create the directory by uploading an empty object with the directory path
                    s3_client.put_object(
                        Bucket=bucket_name,
                        Key=directory,
                        Body=b'',
                        ContentType='application/x-directory'
                    )
                    logger.info(f"Created S3 directory: {directory} in bucket {bucket_name}")
                except Exception as e:
                    logger.error(f"Failed to create S3 directory {directory}: {str(e)}")

        except Exception as e:
            logger.error(f"Error creating user directories for integration {instance.id}: {str(e)}")