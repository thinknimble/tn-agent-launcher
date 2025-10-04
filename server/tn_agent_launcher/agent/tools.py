"""
Agent tools for making secure API calls with stored secrets.
"""

import json
import logging
from dataclasses import dataclass
from typing import Any, Dict, Optional

from pydantic_ai import RunContext, Tool

logger = logging.getLogger(__name__)


@dataclass
class AgentDependencies:
    """Dependencies injected into agent tools via RunContext."""

    user_id: str
    execution_id: Optional[str] = None


async def secure_api_call(
    ctx: RunContext[AgentDependencies],
    url: str,
    method: str = "GET",
    secret_name: str = "",
    project_id: str = "",
    body: Optional[Dict[str, Any]] = None,
    headers: Optional[Dict[str, str]] = None,
    params: Optional[Dict[str, Any]] = None,
    timeout: int = 30,
    description: str = "",
) -> str:
    """
    Make an API call, optionally using stored secrets for authentication.

    Args:
        url: The API endpoint URL (must be HTTPS for external calls)
        method: HTTP method (GET, POST, PUT, DELETE, etc.) - defaults to GET
        secret_name: Optional name of the stored secret to use for authentication
        project_id: Optional project ID where the secret is stored (required if secret_name is provided)
        body: Optional JSON body for POST/PUT requests
        headers: Optional additional headers to include in the request
        params: Optional query parameters to include in the URL
        timeout: Request timeout in seconds (default: 30)
        description: Optional description of what this API call does

    Returns:
        JSON string containing the API response data
    """
    try:
        # Validate inputs
        if not url:
            return json.dumps({"error": "URL is required"})

        # If secret_name is provided, project_id is required
        if secret_name and not project_id:
            return json.dumps({"error": "Project ID is required when using a secret"})

        # Ensure external URLs use HTTPS
        if not url.startswith(("http://localhost", "http://127.0.0.1", "https://")):
            return json.dumps({"error": "External URLs must use HTTPS for security"})

        # Validate HTTP method
        valid_methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]
        if method.upper() not in valid_methods:
            return json.dumps({"error": f"Invalid HTTP method. Must be one of: {valid_methods}"})

        # Handle authenticated vs unauthenticated calls
        if secret_name:
            # Import the secure_api_call function with a different name to avoid conflict
            from tn_agent_launcher.utils.api_tools import secure_api_call as make_secure_call

            # Make the secure API call with authentication using injected user_id
            response_data, _ = await make_secure_call(
                url=url,
                method=method,
                secret_name=secret_name,
                user_id=ctx.deps.user_id,
                project_id=project_id,
                body=body,
                execution_id=ctx.deps.execution_id,
            )
        else:
            # Make unauthenticated API call
            import requests
            from requests.exceptions import RequestException

            try:
                # Prepare headers
                request_headers = {}
                if body:
                    request_headers["Content-Type"] = "application/json"
                if headers:
                    request_headers.update(headers)

                # Prepare request arguments
                request_kwargs = {
                    "method": method.upper(),
                    "url": url,
                    "headers": request_headers,
                    "timeout": timeout,
                }

                # Add query parameters if provided
                if params:
                    request_kwargs["params"] = params

                # Add body for methods that support it
                if method.upper() in ["POST", "PUT", "PATCH"] and body:
                    request_kwargs["json"] = body

                # Make the request
                response = requests.request(**request_kwargs)

                response.raise_for_status()

                # Try to parse as JSON, fall back to text
                try:
                    response_data = response.json()
                except ValueError:
                    response_data = {
                        "content": response.text,
                        "status_code": response.status_code,
                    }

            except RequestException as e:
                return json.dumps({"error": f"Request failed: {str(e)}"})
            except Exception as e:
                return json.dumps({"error": f"Unexpected error: {str(e)}"})

        # Return the response data as JSON
        return json.dumps(response_data)

    except Exception as e:
        logger.error(f"API call failed: {e}")
        return json.dumps({"error": str(e)})


async def list_user_projects(ctx: RunContext[AgentDependencies]) -> str:
    """
    List all projects available to the current user.

    Returns:
        JSON string with list of projects and their secrets
    """
    try:
        from tn_agent_launcher.agent.models import AgentProject, ProjectEnvironmentSecret

        # Get all projects for this user using injected user_id
        projects = []
        async for project in AgentProject.objects.filter(user_id=ctx.deps.user_id):
            # Get secrets for this project
            secrets = []
            async for secret in ProjectEnvironmentSecret.objects.filter(
                user_id=ctx.deps.user_id, project_id=str(project.id)
            ):
                secrets.append({"name": secret.key, "masked_value": secret.masked_value})

            projects.append(
                {
                    "id": str(project.id),
                    "title": project.title,
                    "description": project.description,
                    "secrets": secrets,
                }
            )

        return json.dumps(
            {
                "projects": projects,
                "help": "Use the project ID when calling secure_api_call with a secret_name",
            }
        )

    except Exception as e:
        logger.error(f"Failed to list projects: {e}")
        return json.dumps({"error": str(e)})


def format_output(
    data: str,
    format_type: str = "table",
    title: str = "",
    fields: Optional[list] = None,
    sort_by: str = "",
    filter_by: str = "",
) -> str:
    """
    Format data output in various readable formats (table, list, JSON, CSV, etc.).

    Args:
        data: JSON string or raw data to format
        format_type: Output format - "table", "list", "json", "csv", "markdown", "summary"
        title: Optional title for the formatted output
        fields: Optional list of fields to include (for filtering columns)
        sort_by: Optional field name to sort by
        filter_by: Optional filter criteria (e.g., "status=active")

    Returns:
        Formatted string output

    Examples:
        # Format API response as table
        format_output_tool(
            data='[{"name": "John", "age": 30}, {"name": "Jane", "age": 25}]',
            format_type="table",
            title="User List"
        )

        # Format as filtered list
        format_output_tool(
            data='[{"name": "John", "status": "active"}, {"name": "Jane", "status": "inactive"}]',
            format_type="list",
            filter_by="status=active"
        )

        # Format as CSV with specific fields
        format_output_tool(
            data='[{"name": "John", "age": 30, "email": "john@example.com"}]',
            format_type="csv",
            fields=["name", "email"]
        )
    """
    try:
        import pandas as pd

        # Parse the input data
        if isinstance(data, str):
            try:
                parsed_data = json.loads(data)
            except json.JSONDecodeError:
                return "Error: Invalid JSON data provided"
        else:
            parsed_data = data

        # Handle different data types
        if isinstance(parsed_data, dict):
            # Single object - convert to list for consistent processing
            parsed_data = [parsed_data]
        elif not isinstance(parsed_data, list):
            return "Error: Data must be a JSON object or array"

        if not parsed_data:
            return "No data to format"

        # Convert to DataFrame for easier manipulation
        df = pd.DataFrame(parsed_data)

        # Apply field filtering
        if fields:
            available_fields = [field for field in fields if field in df.columns]
            if available_fields:
                df = df[available_fields]

        # Apply filtering
        if filter_by:
            try:
                # Simple filter format: "field=value" or "field>value" etc.
                if "=" in filter_by:
                    field, value = filter_by.split("=", 1)
                    df = df[df[field.strip()] == value.strip()]
                elif ">" in filter_by:
                    field, value = filter_by.split(">", 1)
                    df = df[df[field.strip()] > float(value.strip())]
                elif "<" in filter_by:
                    field, value = filter_by.split("<", 1)
                    df = df[df[field.strip()] < float(value.strip())]
            except Exception:
                pass  # Ignore filter errors, continue with unfiltered data

        # Apply sorting
        if sort_by and sort_by in df.columns:
            df = df.sort_values(by=sort_by)

        # Format output based on type
        result = ""

        if title:
            result += f"\n# {title}\n\n"

        if format_type.lower() == "table":
            result += df.to_string(index=False)
        elif format_type.lower() == "csv":
            result += df.to_csv(index=False)
        elif format_type.lower() == "json":
            result += json.dumps(df.to_dict("records"), indent=2)
        elif format_type.lower() == "markdown":
            result += df.to_markdown(index=False)
        elif format_type.lower() == "list":
            for _, row in df.iterrows():
                result += "• " + " | ".join(f"{col}: {val}" for col, val in row.items()) + "\n"
        elif format_type.lower() == "summary":
            result += f"Total records: {len(df)}\n"
            result += f"Columns: {', '.join(df.columns)}\n\n"
            result += df.describe(include="all").to_string()
        else:
            # Default to table format
            result += df.to_string(index=False)

        return result

    except ImportError:
        # Fallback implementation without pandas
        try:
            if isinstance(data, str):
                parsed_data = json.loads(data)
            else:
                parsed_data = data

            if isinstance(parsed_data, dict):
                parsed_data = [parsed_data]

            result = ""
            if title:
                result += f"\n# {title}\n\n"

            if format_type.lower() == "json":
                result += json.dumps(parsed_data, indent=2)
            elif format_type.lower() == "list":
                for item in parsed_data:
                    if isinstance(item, dict):
                        result += "• " + " | ".join(f"{k}: {v}" for k, v in item.items()) + "\n"
                    else:
                        result += f"• {item}\n"
            else:
                # Simple table format without pandas
                if parsed_data and isinstance(parsed_data[0], dict):
                    headers = list(parsed_data[0].keys())
                    if fields:
                        headers = [h for h in headers if h in fields]

                    # Header row
                    result += " | ".join(headers) + "\n"
                    result += " | ".join(["-" * len(h) for h in headers]) + "\n"

                    # Data rows
                    for item in parsed_data:
                        row = []
                        for header in headers:
                            row.append(str(item.get(header, "")))
                        result += " | ".join(row) + "\n"

            return result

        except Exception as e:
            return f"Error formatting data: {str(e)}"

    except Exception as e:
        return f"Error: {str(e)}"


def api_discovery(service_name: str) -> str:
    """
    Get information about common API endpoints and authentication for popular services.

    Args:
        service_name: Name of the service (e.g., "github", "slack", "stripe")

    Returns:
        JSON string with API information
    """
    api_info = {
        "github": {
            "base_url": "https://api.github.com",
            "auth_type": "Bearer token",
            "common_endpoints": [
                {"path": "/user", "method": "GET", "description": "Get authenticated user info"},
                {"path": "/user/repos", "method": "GET", "description": "List user repositories"},
                {
                    "path": "/repos/{owner}/{repo}/issues",
                    "method": "POST",
                    "description": "Create an issue",
                },
                {
                    "path": "/repos/{owner}/{repo}/pulls",
                    "method": "GET",
                    "description": "List pull requests",
                },
            ],
            "secret_format": "Bearer YOUR_GITHUB_TOKEN",
        },
        "slack": {
            "base_url": "https://slack.com/api",
            "auth_type": "Bearer token",
            "common_endpoints": [
                {"path": "/chat.postMessage", "method": "POST", "description": "Send a message"},
                {"path": "/users.list", "method": "GET", "description": "List workspace users"},
                {"path": "/channels.list", "method": "GET", "description": "List channels"},
            ],
            "secret_format": "Bearer xoxb-YOUR-SLACK-BOT-TOKEN",
        },
        "stripe": {
            "base_url": "https://api.stripe.com/v1",
            "auth_type": "Bearer token",
            "common_endpoints": [
                {"path": "/customers", "method": "GET", "description": "List customers"},
                {"path": "/charges", "method": "POST", "description": "Create a charge"},
                {"path": "/subscriptions", "method": "GET", "description": "List subscriptions"},
            ],
            "secret_format": "Bearer sk_test_YOUR_STRIPE_SECRET_KEY",
        },
        "openai": {
            "base_url": "https://api.openai.com/v1",
            "auth_type": "Bearer token",
            "common_endpoints": [
                {"path": "/models", "method": "GET", "description": "List available models"},
                {
                    "path": "/chat/completions",
                    "method": "POST",
                    "description": "Create chat completion",
                },
                {"path": "/images/generations", "method": "POST", "description": "Generate images"},
            ],
            "secret_format": "Bearer sk-YOUR_OPENAI_API_KEY",
        },
    }

    service = service_name.lower()
    if service in api_info:
        return json.dumps(
            {
                "service": service,
                "info": api_info[service],
                "recommendation": f"Store your {service} API key as a secret and use it with secure_api_call_tool",
            }
        )
    else:
        available = list(api_info.keys())
        return json.dumps(
            {
                "error": f"Service '{service_name}' not found",
                "available_services": available,
                "help": "Use one of the available services or provide the full API documentation URL",
            }
        )


def get_agent_tools(user_id: str, execution_id: Optional[str] = None):
    """
    Get configured tools for an agent instance using the RunContext pattern.

    Args:
        user_id: User ID for access control
        execution_id: Optional execution ID for tracking

    Returns:
        Tuple of (dependencies, list_of_tools)
    """
    deps = AgentDependencies(user_id=user_id, execution_id=execution_id)

    # Create Tool instances with proper names
    tools = [
        Tool(secure_api_call, name="secure_api_call"),
        Tool(list_user_projects, name="list_user_projects"),
        Tool(format_output, name="format_output"),
        Tool(api_discovery, name="api_discovery"),
    ]

    return deps, tools
