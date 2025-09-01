"""
Service for invoking AWS Lambda agent functions from Django
"""

import json
import logging
from typing import Any, Dict, Optional

import boto3
from django.conf import settings

logger = logging.getLogger(__name__)


class LambdaAgentService:
    """Service for invoking AWS Lambda agent functions"""

    def __init__(self):
        """Initialize Lambda client"""
        # Get configuration from Django settings
        self.region = settings.AWS_LAMBDA_REGION
        self.function_name = settings.LAMBDA_AGENT_FUNCTION_NAME

        # Initialize boto3 client
        # In production (Heroku), this will use IAM credentials from settings
        # In development, boto3 will use default credential chain (env vars, profile, etc.)
        session_kwargs = {"region_name": self.region}

        # Check if we have explicit AWS credentials (for production/Heroku)
        if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
            session_kwargs["aws_access_key_id"] = settings.AWS_ACCESS_KEY_ID
            session_kwargs["aws_secret_access_key"] = settings.AWS_SECRET_ACCESS_KEY
        # Otherwise, boto3 will use its default credential chain:
        # 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
        # 2. Shared credential file (~/.aws/credentials)
        # 3. AWS config file (~/.aws/config)
        # 4. Instance metadata service (for EC2)

        self.session = boto3.Session(**session_kwargs)
        self.lambda_client = self.session.client("lambda")

    def invoke_agent(
        self,
        provider: str,
        model_name: str,
        api_key: Optional[str],
        prompt: str,
        system_prompt: Optional[str] = None,
        agent_type: str = "one-shot",
        agent_name: str = "Django Agent",
        target_url: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        max_tokens: int = 2000,
        temperature: float = 0.7,
    ) -> Dict[str, Any]:
        """
        Invoke the Lambda agent function with multi-provider support

        Args:
            provider: AI provider (GEMINI, OPENAI, OLLAMA, ANTHROPIC, BEDROCK)
            model_name: Model identifier for the provider
            api_key: API key for the provider (not needed for BEDROCK)
            prompt: The instruction/prompt for the agent
            system_prompt: Optional system prompt
            agent_type: Type of agent (chat or one-shot)
            agent_name: Friendly name for the agent
            target_url: Optional URL for self-hosted models (Ollama)
            context: Additional context dictionary
            max_tokens: Maximum tokens for response
            temperature: Temperature for generation

        Returns:
            Dictionary containing the Lambda response
        """

        # Build the request payload
        payload = {
            "provider": provider,
            "model_name": model_name,
            "prompt": prompt,
            "agent_type": agent_type,
            "agent_name": agent_name,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }

        # Add optional fields
        if api_key:
            payload["api_key"] = api_key
        if system_prompt:
            payload["system_prompt"] = system_prompt
        if target_url:
            payload["target_url"] = target_url
        if context:
            payload["context"] = context

        try:
            # Invoke the Lambda function
            logger.info(f"Invoking Lambda function {self.function_name} with provider {provider}")

            response = self.lambda_client.invoke(
                FunctionName=self.function_name,
                InvocationType="RequestResponse",  # Synchronous execution
                Payload=json.dumps(payload),
            )

            # Parse the response
            response_payload = json.loads(response["Payload"].read())

            # Check if Lambda returned an error
            if response.get("FunctionError"):
                logger.error(f"Lambda function error: {response_payload}")
                raise Exception(f"Lambda execution failed: {response_payload}")

            # Parse the HTTP response from Lambda
            if isinstance(response_payload, dict) and "statusCode" in response_payload:
                # API Gateway format response
                status_code = response_payload["statusCode"]
                body = (
                    json.loads(response_payload["body"])
                    if isinstance(response_payload["body"], str)
                    else response_payload["body"]
                )

                if status_code != 200:
                    error_msg = body.get("message", "Unknown error")
                    logger.error(f"Lambda returned error status {status_code}: {error_msg}")
                    raise Exception(f"Lambda error: {error_msg}")

                return body
            else:
                # Direct Lambda response
                return response_payload

        except Exception as e:
            logger.error(f"Error invoking Lambda function: {str(e)}")
            raise

    def invoke_bedrock_agent(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        max_tokens: int = 2000,
        temperature: float = 0.7,
    ) -> Dict[str, Any]:
        """
        Invoke the Lambda agent using Bedrock (backward compatibility)

        This is a convenience method that uses the BEDROCK provider
        with the default Claude model configured in Lambda
        """
        return self.invoke_agent(
            provider="BEDROCK",
            model_name=settings.BEDROCK_MODEL_ID,
            api_key=None,  # Bedrock uses IAM authentication
            prompt=prompt,
            system_prompt=system_prompt,
            agent_type="one-shot",
            agent_name="Bedrock Agent",
            context=context,
            max_tokens=max_tokens,
            temperature=temperature,
        )


# Singleton instance
lambda_agent_service = LambdaAgentService()
