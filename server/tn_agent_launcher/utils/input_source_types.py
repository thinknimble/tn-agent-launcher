import logging
import re
from enum import Enum
from typing import Dict, Optional
from urllib.parse import urlparse

logger = logging.getLogger(__name__)


class SourceType(str, Enum):
    PUBLIC_URL = "public_url"
    OUR_S3 = "our_s3"
    USER_S3 = "user_s3"
    GOOGLE_DRIVE_PUBLIC = "google_drive_public"
    GOOGLE_DRIVE_PRIVATE = "google_drive_private"
    DROPBOX_PUBLIC = "dropbox_public"
    UNKNOWN = "unknown"


def parse_s3_url(url: str) -> Optional[Dict[str, str]]:
    """
    Parse S3 URL and extract bucket, key, and region information.

    Supports formats:
    - s3://bucket-name/path/to/file
    - https://bucket-name.s3.amazonaws.com/path/to/file
    - https://bucket-name.s3.region.amazonaws.com/path/to/file
    - https://s3.amazonaws.com/bucket-name/path/to/file
    - https://s3.region.amazonaws.com/bucket-name/path/to/file
    """
    try:
        parsed = urlparse(url)

        if parsed.scheme == "s3":
            # s3://bucket/key format
            bucket = parsed.netloc
            key = parsed.path.lstrip("/")
            return {
                "bucket": bucket,
                "key": key,
                "region": "us-east-1",  # Default region
                "url": url,
            }

        elif parsed.scheme in ("http", "https"):
            hostname = parsed.hostname or ""
            path = parsed.path.lstrip("/")

            # bucket-name.s3.amazonaws.com or bucket-name.s3.region.amazonaws.com
            s3_bucket_pattern = (
                r"^([a-z0-9][a-z0-9\-]*[a-z0-9])\.s3\.([a-z0-9\-]*\.)?amazonaws\.com$"
            )
            bucket_match = re.match(s3_bucket_pattern, hostname)

            if bucket_match:
                bucket = bucket_match.group(1)
                region_part = bucket_match.group(2)
                region = region_part.rstrip(".") if region_part else "us-east-1"

                return {"bucket": bucket, "key": path, "region": region, "url": url}

            # s3.amazonaws.com/bucket or s3.region.amazonaws.com/bucket
            s3_path_pattern = r"^s3\.([a-z0-9\-]*\.)?amazonaws\.com$"
            if re.match(s3_path_pattern, hostname):
                parts = path.split("/", 1)
                if len(parts) >= 1:
                    bucket = parts[0]
                    key = parts[1] if len(parts) > 1 else ""
                    region_part = re.match(s3_path_pattern, hostname).group(1)
                    region = region_part.rstrip(".") if region_part else "us-east-1"

                    return {"bucket": bucket, "key": key, "region": region, "url": url}

        return None

    except Exception as e:
        logger.error(f"Failed to parse S3 URL {url}: {e}")
        return None


def detect_google_drive_url(url: str) -> Optional[str]:
    """
    Detect Google Drive URLs and determine if they're public or private.

    Returns 'public' or 'private' if it's a Google Drive URL, None otherwise.
    """
    try:
        parsed = urlparse(url)

        if "drive.google.com" in parsed.netloc:
            # Common Google Drive patterns
            if "/file/d/" in parsed.path:
                # File sharing URL: https://drive.google.com/file/d/FILE_ID/view
                if "view" in parsed.path or parsed.query:
                    return "public"
                else:
                    return "private"  # Might require authentication

            elif "/open?id=" in parsed.path or "id=" in parsed.query:
                # Legacy format: https://drive.google.com/open?id=FILE_ID
                return "public"  # Usually public

            elif "/folders/" in parsed.path:
                # Folder URL: https://drive.google.com/folders/FOLDER_ID
                return "public" if "view" in parsed.query else "private"

            else:
                # Other Google Drive URLs, assume private by default
                return "private"

        return None

    except Exception as e:
        logger.error(f"Failed to detect Google Drive URL {url}: {e}")
        return None


def detect_dropbox_url(url: str) -> bool:
    """Check if URL is a Dropbox share URL."""
    try:
        parsed = urlparse(url)
        return "dropbox.com" in parsed.netloc and ("/s/" in parsed.path or "/sh/" in parsed.path)
    except Exception:
        return False


def detect_source_type(url: str, user=None) -> SourceType:
    """
    Detect the source type of a given URL.

    Args:
        url: The URL to analyze
        user: Optional user object for checking S3 integrations

    Returns:
        SourceType enum value
    """
    try:
        # Check for S3 URLs
        s3_info = parse_s3_url(url)
        if s3_info:
            # TODO: In the future, check if bucket matches user's S3 integrations
            # For now, determine based on bucket patterns or config
            bucket = s3_info["bucket"]

            # Check if it's our bucket (you'll need to configure this)
            OUR_S3_BUCKETS = ["tn-agent-launcher-storage"]  # Configure this

            if bucket in OUR_S3_BUCKETS:
                return SourceType.OUR_S3
            else:
                # In future: check user.s3_integrations.filter(bucket=bucket)
                return SourceType.USER_S3

        # Check for Google Drive URLs
        drive_type = detect_google_drive_url(url)
        if drive_type == "public":
            return SourceType.GOOGLE_DRIVE_PUBLIC
        elif drive_type == "private":
            return SourceType.GOOGLE_DRIVE_PRIVATE

        # Check for Dropbox URLs
        if detect_dropbox_url(url):
            return SourceType.DROPBOX_PUBLIC

        # Default to public URL if it passes basic validation
        parsed = urlparse(url)
        if parsed.scheme in ("http", "https") and parsed.netloc:
            return SourceType.PUBLIC_URL

        return SourceType.UNKNOWN

    except Exception as e:
        logger.error(f"Failed to detect source type for URL {url}: {e}")
        return SourceType.UNKNOWN


def create_input_source_object(
    url: str,
    filename: Optional[str] = None,
    size: Optional[int] = None,
    content_type: Optional[str] = None,
    user=None,
) -> Dict:
    """
    Create a standardized input source object.

    Args:
        url: The source URL
        filename: Optional filename
        size: Optional file size in bytes
        content_type: Optional MIME type
        user: Optional user for S3 integration detection

    Returns:
        Dictionary representing the input source
    """
    source_type = detect_source_type(url, user)

    # Extract filename from URL if not provided
    if not filename:
        parsed = urlparse(url)
        path_parts = parsed.path.strip("/").split("/")
        if path_parts and path_parts[-1]:
            filename = path_parts[-1]
        else:
            filename = "unknown_file"

    input_source = {
        "url": url,
        "source_type": source_type.value,
    }

    # Add optional fields if provided
    if filename:
        input_source["filename"] = filename
    if size is not None:
        input_source["size"] = size
    if content_type:
        input_source["content_type"] = content_type

    return input_source
