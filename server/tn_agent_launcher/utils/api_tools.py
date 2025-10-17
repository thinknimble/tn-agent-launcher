import json
import logging
import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlparse

import requests
from requests.exceptions import RequestException, Timeout

from tn_agent_launcher.agent.models import AgentTaskExecution, ProjectEnvironmentSecret

logger = logging.getLogger(__name__)

# Security constants
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
MAX_RESPONSE_TIME = 30  # seconds
MAX_API_CALLS_PER_EXECUTION = 10

# Safe content types
SAFE_CONTENT_TYPES = [
    "application/json",
    "text/plain",
    "text/csv",
    "text/html",
    "text/xml",
    "application/xml",
    "application/pdf",
    "text/markdown",
    "application/yaml",
    "text/yaml",
]

# Malicious content patterns
MALICIOUS_PATTERNS = [
    r"<script[^>]*>.*?</script>",  # JavaScript
    r"eval\s*\(",  # Code execution
    r"exec\s*\(",  # Code execution
    r"import\s+os",  # Python system access
    r"subprocess\.",  # System commands
    r"__import__",  # Dynamic imports
    r"\.exe\b",  # Executable files
    r"\.bat\b",  # Batch files
    r"\.sh\b",  # Shell scripts
    r"\.ps1\b",  # PowerShell scripts
]

# Prompt injection patterns
INJECTION_PATTERNS = [
    r"ignore\s+previous\s+instructions",
    r"forget\s+everything",
    r"new\s+instructions?:",
    r"system\s*:",
    r"assistant\s*:",
    r"user\s*:",
    r"\[INST\].*?\[/INST\]",  # Instruction markers
    r"<\|.*?\|>",  # Special tokens
    r"disregard\s+.*?prompt",
    r"override\s+.*?system",
]


def detect_likely_auth_methods(url: str) -> List[str]:
    """
    Determine likely authentication methods based on URL patterns.

    Args:
        url: The API endpoint URL

    Returns:
        List of authentication methods to try in order
    """
    url_lower = url.lower()

    # API-specific patterns
    if "api.github.com" in url_lower:
        return ["Bearer", "Token"]
    elif "api.slack.com" in url_lower:
        return ["Bearer"]
    elif "api.stripe.com" in url_lower:
        return ["Bearer"]
    elif "api.openai.com" in url_lower:
        return ["Bearer"]
    elif "api.anthropic.com" in url_lower:
        return ["Bearer"]
    elif "googleapis.com" in url_lower:
        return ["Bearer"]
    elif "api.hubspot.com" in url_lower:
        return ["Bearer"]
    elif "api.sendgrid.com" in url_lower:
        return ["Bearer"]

    # Generic patterns
    if "/v1/" in url_lower or "/api/v" in url_lower:
        return ["Bearer", "X-API-Key", "Token"]
    elif "/graphql" in url_lower:
        return ["Bearer", "Authorization"]
    elif "/rest/" in url_lower:
        return ["Bearer", "X-API-Key"]

    # Default fallback order (most common first)
    return ["Bearer", "Token", "X-API-Key", "Authorization"]


def get_auth_headers(secret_value: str, auth_method: str) -> Dict[str, str]:
    """
    Generate authentication headers based on method.

    Args:
        secret_value: The secret/token value
        auth_method: Authentication method to use

    Returns:
        Dictionary of headers
    """
    if auth_method == "Bearer":
        return {"Authorization": f"Bearer {secret_value}"}
    elif auth_method == "Token":
        return {"Authorization": f"Token {secret_value}"}
    elif auth_method == "X-API-Key":
        return {"X-API-Key": secret_value}
    elif auth_method == "Authorization":
        return {"Authorization": secret_value}
    else:
        # Fallback to Bearer
        return {"Authorization": f"Bearer {secret_value}"}


def scan_for_malicious_content(content: str) -> List[str]:
    """
    Scan content for potentially malicious patterns.

    Args:
        content: Content to scan

    Returns:
        List of detected issues
    """
    issues = []

    for pattern in MALICIOUS_PATTERNS:
        if re.search(pattern, content, re.IGNORECASE | re.DOTALL):
            issues.append(f"Potentially malicious pattern detected: {pattern}")

    return issues


def detect_prompt_injection(content: str) -> List[str]:
    """
    Detect potential prompt injection attempts.

    Args:
        content: Content to scan

    Returns:
        List of detected injection attempts
    """
    attempts = []

    for pattern in INJECTION_PATTERNS:
        if re.search(pattern, content, re.IGNORECASE | re.DOTALL):
            attempts.append(f"Prompt injection pattern detected: {pattern}")

    return attempts


def validate_response_security(response: requests.Response) -> Dict[str, Any]:
    """
    Comprehensive security validation of API responses.

    Args:
        response: The HTTP response to validate

    Returns:
        Dictionary with validation results
    """
    security_summary = {
        "safe": True,
        "issues": [],
        "content_size": len(response.content),
        "content_type": response.headers.get("content-type", "unknown"),
        "status_code": response.status_code,
    }

    # File size check
    if len(response.content) > MAX_FILE_SIZE:
        security_summary["safe"] = False
        security_summary["issues"].append(f"File too large: {len(response.content)} bytes")
        return security_summary

    # Content type validation
    content_type = security_summary["content_type"].lower()
    if not any(safe_type in content_type for safe_type in SAFE_CONTENT_TYPES):
        security_summary["safe"] = False
        security_summary["issues"].append(f"Unsafe content type: {content_type}")
        return security_summary

    # Only scan text content for malicious patterns
    if any(
        text_type in content_type for text_type in ["text/", "application/json", "application/xml"]
    ):
        try:
            content_text = response.text

            # Malicious content scan
            malicious_patterns = scan_for_malicious_content(content_text)
            if malicious_patterns:
                security_summary["safe"] = False
                security_summary["issues"].extend(malicious_patterns)
                return security_summary

            # Prompt injection detection (warning, not blocking)
            injection_attempts = detect_prompt_injection(content_text)
            if injection_attempts:
                security_summary["prompt_injection_detected"] = True
                security_summary["issues"].extend(injection_attempts)
                # Note: Don't mark as unsafe, content will be sanitized

        except UnicodeDecodeError:
            security_summary["issues"].append("Could not decode content as text")

    return security_summary


def sanitize_api_response(response_data: Any) -> str:
    """
    Sanitize API responses to prevent prompt injection.

    Args:
        response_data: The response data to sanitize

    Returns:
        Sanitized string representation
    """
    # Convert to string safely
    if isinstance(response_data, dict):
        content = json.dumps(response_data, indent=2)
    elif isinstance(response_data, list):
        content = json.dumps(response_data, indent=2)
    else:
        content = str(response_data)

    # Remove potential injection patterns
    sanitized = content
    for pattern in INJECTION_PATTERNS:
        sanitized = re.sub(pattern, "[FILTERED_CONTENT]", sanitized, flags=re.IGNORECASE)

    # Limit response size to prevent token flooding
    MAX_RESPONSE_LENGTH = 10000  # characters
    if len(sanitized) > MAX_RESPONSE_LENGTH:
        sanitized = sanitized[:MAX_RESPONSE_LENGTH] + "\n[RESPONSE_TRUNCATED_FOR_SECURITY]"

    return sanitized


async def get_user_secret(secret_name: str, user_id: str, project_id: str) -> str:
    """
    Retrieve a user's secret value.

    Args:
        secret_name: Name of the secret
        user_id: User ID for access control
        project_id: Project ID for scoping

    Returns:
        The secret value

    Raises:
        ValueError: If secret not found or access denied
    """
    try:
        secret = await ProjectEnvironmentSecret.objects.aget(
            key=secret_name, user_id=user_id, project_id=project_id
        )
        return secret.value
    except ProjectEnvironmentSecret.DoesNotExist:
        raise ValueError(f"Secret '{secret_name}' not found for user in project")


def attempt_api_call(
    url: str,
    method: str,
    secret_value: str,
    body: Optional[Dict] = None,
    auth_method: str = "Bearer",
) -> requests.Response:
    """
    Attempt an API call with specific authentication method.

    Args:
        url: API endpoint URL
        method: HTTP method
        secret_value: Secret/token value
        body: Request body for POST/PUT
        auth_method: Authentication method to use

    Returns:
        HTTP response

    Raises:
        RequestException: On request failure
        ValueError: On authentication failure
    """
    headers = get_auth_headers(secret_value, auth_method)
    headers.update(
        {
            "User-Agent": "TN-Agent-Launcher/1.0",
            "Accept": "application/json",
        }
    )

    # Add content type for requests with body
    if body and method.upper() in ["POST", "PUT", "PATCH"]:
        headers["Content-Type"] = "application/json"

    try:
        response = requests.request(
            method=method.upper(),
            url=url,
            headers=headers,
            json=body if body else None,
            timeout=MAX_RESPONSE_TIME,
            allow_redirects=True,
            verify=True,  # Always verify SSL
        )

        # Check for authentication errors
        if response.status_code in [401, 403]:
            raise ValueError(f"Authentication failed: {response.status_code}")

        # Check for other HTTP errors
        response.raise_for_status()

        return response

    except Timeout:
        raise RequestException("Request timed out")
    except RequestException as e:
        raise RequestException(f"Request failed: {str(e)}")


async def secure_api_call(
    url: str,
    method: str,
    secret_name: str,
    user_id: str,
    project_id: str,
    body: Optional[Dict] = None,
    execution_id: Optional[str] = None,
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    Make a secure API call with authentication discovery and security validation.

    Args:
        url: API endpoint URL
        method: HTTP method
        secret_name: Name of the secret to use
        user_id: User ID for access control
        project_id: Project ID for scoping
        body: Optional request body
        execution_id: Optional execution ID for tracking

    Returns:
        Tuple of (response_data, call_metadata)

    Raises:
        ValueError: If secret not found or all auth methods fail
        RequestException: On request failure
    """
    start_time = datetime.now()

    # Initialize call metadata
    call_metadata = {
        "url": url,
        "method": method.upper(),
        "secret_used": secret_name,
        "auth_methods_attempted": [],
        "auth_method_successful": None,
        "started_at": start_time.isoformat(),
        "response_size_bytes": 0,
        "content_type": "unknown",
        "security_scan_passed": False,
        "execution_time_ms": 0,
        "rate_limit_remaining": None,
        "errors": [],
    }

    try:
        # Get secret value
        secret_value = await get_user_secret(secret_name, user_id, project_id)

        # Determine authentication methods to try
        auth_methods = detect_likely_auth_methods(url)

        last_error = None
        for auth_method in auth_methods:
            call_metadata["auth_methods_attempted"].append(auth_method)

            try:
                response = attempt_api_call(url, method, secret_value, body, auth_method)

                # Authentication successful!
                call_metadata["auth_method_successful"] = auth_method
                call_metadata["response_size_bytes"] = len(response.content)
                call_metadata["content_type"] = response.headers.get("content-type", "unknown")

                # Extract rate limit info if available
                if "x-ratelimit-remaining" in response.headers:
                    call_metadata["rate_limit_remaining"] = response.headers[
                        "x-ratelimit-remaining"
                    ]
                elif "x-rate-limit-remaining" in response.headers:
                    call_metadata["rate_limit_remaining"] = response.headers[
                        "x-rate-limit-remaining"
                    ]

                # Security validation
                security_result = validate_response_security(response)
                call_metadata["security_scan_passed"] = security_result["safe"]

                if not security_result["safe"]:
                    call_metadata["errors"].extend(security_result["issues"])
                    raise ValueError(f"Security validation failed: {security_result['issues']}")

                # Calculate execution time
                execution_time = (datetime.now() - start_time).total_seconds() * 1000
                call_metadata["execution_time_ms"] = round(execution_time, 2)

                # Parse response safely
                try:
                    if "application/json" in call_metadata["content_type"]:
                        response_data = response.json()
                    else:
                        response_data = response.text
                except json.JSONDecodeError:
                    response_data = response.text

                # Sanitize response data
                sanitized_data = sanitize_api_response(response_data)

                return sanitized_data, call_metadata

            except ValueError as e:
                # Authentication failed, try next method
                last_error = str(e)
                continue
            except RequestException as e:
                # Request failed, try next method
                last_error = str(e)
                continue

        # All authentication methods failed
        call_metadata["errors"].append(
            f"All authentication methods failed. Last error: {last_error}"
        )
        execution_time = (datetime.now() - start_time).total_seconds() * 1000
        call_metadata["execution_time_ms"] = round(execution_time, 2)

        raise ValueError(f"Could not authenticate with any known method. Tried: {auth_methods}")

    except Exception as e:
        call_metadata["errors"].append(str(e))
        execution_time = (datetime.now() - start_time).total_seconds() * 1000
        call_metadata["execution_time_ms"] = round(execution_time, 2)
        raise


async def update_execution_security_summary(
    execution_id: str,
    call_metadata: Dict[str, Any],
    additional_info: Optional[Dict[str, Any]] = None,
) -> None:
    """
    Update the security summary for an agent task execution.

    Args:
        execution_id: The AgentTaskExecution ID
        call_metadata: Metadata from the API call
        additional_info: Additional security information
    """
    try:
        execution = await AgentTaskExecution.objects.aget(id=execution_id)

        # Get existing summary or create new one
        summary = execution.api_security_summary or {
            "api_calls": [],
            "security_checks": {
                "total_downloads": "0B",
                "malicious_content_detected": False,
                "prompt_injection_attempts": 0,
                "unsafe_redirects": 0,
                "rate_limits_hit": False,
            },
            "recommendations": [],
            "errors": [],
        }

        # Add this API call
        summary["api_calls"].append(call_metadata)

        # Update security checks
        total_bytes = sum(call.get("response_size_bytes", 0) for call in summary["api_calls"])
        summary["security_checks"]["total_downloads"] = format_bytes(total_bytes)

        # Check for security issues
        if call_metadata.get("errors"):
            summary["errors"].extend(call_metadata["errors"])

        if not call_metadata.get("security_scan_passed", False):
            summary["security_checks"]["malicious_content_detected"] = True

        # Generate recommendations
        if call_metadata.get("auth_method_successful"):
            auth_method = call_metadata["auth_method_successful"]
            secret_name = call_metadata["secret_used"]
            url_domain = urlparse(call_metadata["url"]).netloc

            recommendation = (
                f"For {url_domain}: Use '{auth_method} authentication with {secret_name}'"
            )
            if recommendation not in summary["recommendations"]:
                summary["recommendations"].append(recommendation)

        # Add rate limit info
        if call_metadata.get("rate_limit_remaining"):
            remaining = call_metadata["rate_limit_remaining"]
            summary["recommendations"].append(f"Rate limit remaining: {remaining} calls")

        # Save updated summary
        execution.api_security_summary = summary
        await execution.asave(update_fields=["api_security_summary"])

    except AgentTaskExecution.DoesNotExist:
        logger.error(f"AgentTaskExecution {execution_id} not found")
    except Exception as e:
        logger.error(f"Failed to update security summary: {e}")


def format_bytes(bytes_count: int) -> str:
    """Format byte count as human readable string."""
    for unit in ["B", "KB", "MB", "GB"]:
        if bytes_count < 1024.0:
            return f"{bytes_count:.1f}{unit}"
        bytes_count /= 1024.0
    return f"{bytes_count:.1f}TB"
