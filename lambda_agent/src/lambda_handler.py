"""
AWS Lambda handler for the Bedrock Agent
Supports both legacy Bedrock-only mode and new multi-provider mode
"""

import asyncio
import json
import logging
from typing import Any, Dict

from agent import AgentContext, AgentRequest, default_agent, tool_agent
from multi_provider_agent import execute_multi_provider_agent

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Main Lambda handler function

    Supports two modes:
    1. Legacy mode: Uses Bedrock directly (for backward compatibility)
    2. Multi-provider mode: When "provider" field is present in request

    Args:
        event: Lambda event containing the request
        context: Lambda context object

    Returns:
        API Gateway response format
    """
    try:
        # Parse request body
        if isinstance(event.get("body"), str):
            body = json.loads(event["body"])
        else:
            body = event.get("body", event)

        # Check if this is a multi-provider request
        if "provider" in body:
            # Multi-provider mode
            logger.info(f"Processing multi-provider request with provider: {body['provider']}")
            response_data = asyncio.run(execute_multi_provider_agent(body))

            return {
                "statusCode": 200,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
                "body": json.dumps(response_data),
            }

        # Legacy Bedrock-only mode
        logger.info("Processing legacy Bedrock request")

        # Determine which agent to use
        use_tools = body.pop("use_tools", False)
        agent = tool_agent if use_tools else default_agent

        # Create request model
        agent_request = AgentRequest(**body)

        # Create context if provided
        agent_context = None
        if "context" in body:
            agent_context = AgentContext(**body["context"])

        # Process request asynchronously
        response = asyncio.run(agent.process_request(agent_request, agent_context))

        # Return successful response
        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            "body": json.dumps(response.model_dump(mode="json")),
        }

    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        return {
            "statusCode": 400,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps(
                {
                    "error": "Invalid request",
                    "message": str(e),
                }
            ),
        }
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return {
            "statusCode": 500,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps(
                {
                    "error": "Internal server error",
                    "message": str(e),
                }
            ),
        }


def health_check(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Health check endpoint
    """
    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(
            {
                "status": "healthy",
                "service": "bedrock-agent",
            }
        ),
    }
