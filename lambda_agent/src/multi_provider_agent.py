"""
Multi-provider agent implementation for AWS Lambda
Supports Anthropic, OpenAI, Gemini, and Ollama providers
"""

import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional

import boto3
from pydantic import BaseModel, ConfigDict, Field
from pydantic_ai import Agent
from pydantic_ai.models.anthropic import AnthropicModel
from pydantic_ai.models.bedrock import BedrockConverseModel
from pydantic_ai.models.gemini import GeminiModel
from pydantic_ai.models.openai import OpenAIModel
from pydantic_ai.providers.anthropic import AnthropicProvider
from pydantic_ai.providers.google_gla import GoogleGLAProvider
from pydantic_ai.providers.openai import OpenAIProvider

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Provider type enum
ProviderType = Literal["GEMINI", "OPENAI", "OLLAMA", "ANTHROPIC", "BEDROCK"]
AgentType = Literal["chat", "one-shot"]


class MultiProviderRequest(BaseModel):
    """Request model for multi-provider agent execution"""

    model_config = ConfigDict(extra="forbid")

    # Provider configuration
    provider: ProviderType = Field(..., description="AI provider to use")
    model_name: str = Field(..., description="Model name/ID for the provider")
    api_key: Optional[str] = Field(
        None, description="API key for the provider (not needed for Bedrock)"
    )
    target_url: Optional[str] = Field(
        None, description="Optional base URL for self-hosted models (Ollama)"
    )

    # Agent configuration
    agent_type: AgentType = Field(default="one-shot", description="Type of agent interaction")
    agent_name: str = Field(default="Lambda Agent", description="Friendly name for the agent")
    enable_tools: bool = Field(default=False, description="Enable tool calling capabilities")

    # Request data
    prompt: str = Field(..., description="The prompt or instruction for the agent")
    system_prompt: Optional[str] = Field(None, description="System prompt to guide the agent")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Additional context")
    max_tokens: int = Field(default=2000, description="Maximum tokens for response")
    temperature: float = Field(
        default=0.7, ge=0, le=1, description="Temperature for response generation"
    )


class MultiProviderResponse(BaseModel):
    """Response model for multi-provider agent execution"""

    model_config = ConfigDict(extra="forbid")

    response: str = Field(..., description="The agent's response")
    provider: str = Field(..., description="Provider used for this response")
    model: str = Field(..., description="Model used for this response")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Response metadata")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    execution_time_seconds: Optional[float] = Field(None, description="Time taken to execute")
    token_usage: Optional[Dict[str, int]] = Field(None)


class ProviderFactory:
    """Factory for creating provider-specific models"""

    @staticmethod
    def create_model(
        provider: ProviderType,
        model_name: str,
        api_key: Optional[str] = None,
        target_url: Optional[str] = None,
    ):
        """
        Create a PydanticAI model instance based on provider type

        Args:
            provider: The AI provider type
            model_name: The model name/ID
            api_key: API key for the provider
            target_url: Optional base URL for self-hosted models

        Returns:
            PydanticAI model instance
        """
        match provider:
            case "GEMINI":
                if not api_key:
                    raise ValueError("API key required for Gemini provider")
                return GeminiModel(model_name, provider=GoogleGLAProvider(api_key=api_key))

            case "OPENAI":
                if not api_key:
                    raise ValueError("API key required for OpenAI provider")
                return OpenAIModel(model_name=model_name, provider=OpenAIProvider(api_key=api_key))

            case "OLLAMA":
                if not target_url:
                    target_url = "http://localhost:11434"  # Default Ollama URL
                # Ollama typically doesn't require an API key
                return OpenAIModel(
                    model_name=model_name,
                    provider=OpenAIProvider(
                        base_url=target_url,
                        api_key=api_key or "ollama",  # Dummy key if not provided
                    ),
                )

            case "ANTHROPIC":
                if not api_key:
                    raise ValueError("API key required for Anthropic provider")
                return AnthropicModel(
                    model_name=model_name, provider=AnthropicProvider(api_key=api_key)
                )

            case "BEDROCK":
                # Use AWS credentials from Lambda execution role
                region = os.environ.get("BEDROCK_REGION", "us-east-1")

                # Set AWS_DEFAULT_REGION for pydantic-ai
                os.environ["AWS_DEFAULT_REGION"] = region

                # Initialize AWS session for proper region config
                if os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
                    # Running in Lambda - use IAM role
                    boto3.Session(region_name=region)
                else:
                    # Running locally - use profile
                    profile = os.environ.get("AWS_PROFILE", "default")
                    boto3.Session(profile_name=profile, region_name=region)

                return BedrockConverseModel(model_name=model_name)

            case _:
                raise ValueError(f"Unsupported provider: {provider}")


class MultiProviderAgent:
    """Multi-provider agent implementation"""

    def __init__(self, request: MultiProviderRequest):
        self.request = request
        self.model = ProviderFactory.create_model(
            provider=request.provider,
            model_name=request.model_name,
            api_key=request.api_key,
            target_url=request.target_url,
        )

        # Default system prompt if not provided
        system_prompt = request.system_prompt or (
            f"You are a helpful AI assistant named {request.agent_name}. "
            "Provide clear, accurate, and helpful responses."
        )

        self.agent = Agent(
            name=request.agent_name,
            model=self.model,
            output_type=str,
            system_prompt=system_prompt,
        )

    async def execute(self) -> MultiProviderResponse:
        """
        Execute the agent request and return a response
        """
        import time

        start_time = time.time()

        try:
            # Prepare context
            agent_context = {}
            if self.request.context:
                agent_context.update(self.request.context)

            # Run the agent
            result = await self.agent.run(
                self.request.prompt,
                deps=agent_context,
                model_settings={
                    "max_tokens": self.request.max_tokens,
                    "temperature": self.request.temperature,
                },
            )

            # Extract token usage if available
            token_usage = None
            if hasattr(result, "_usage") and result._usage:
                token_usage = {
                    "input_tokens": result._usage.input_tokens,
                    "output_tokens": result._usage.output_tokens,
                    "total_tokens": result._usage.total_tokens,
                }

            execution_time = time.time() - start_time

            # Create response
            response = MultiProviderResponse(
                response=result.output,
                provider=self.request.provider,
                model=self.request.model_name,
                metadata={
                    "agent_type": self.request.agent_type,
                    "agent_name": self.request.agent_name,
                    "context_provided": bool(agent_context),
                    "custom_system_prompt": bool(self.request.system_prompt),
                },
                execution_time_seconds=execution_time,
                token_usage=token_usage,
            )

            return response

        except Exception as e:
            logger.error(f"Error executing agent: {str(e)}")
            raise


class ToolEnabledMultiProviderAgent(MultiProviderAgent):
    """Multi-provider agent with tool calling capabilities"""

    def __init__(self, request: MultiProviderRequest):
        super().__init__(request)
        if request.enable_tools:
            self._setup_tools()
            logger.info(f"Tools enabled for agent '{request.agent_name}'")

    def _setup_tools(self):
        """Setup available tools for the agent using tool_plain for context-free tools"""

        @self.agent.tool_plain
        def get_current_time() -> str:
            """Get the current UTC time"""
            return datetime.now(timezone.utc).isoformat()

        @self.agent.tool_plain
        def calculate(expression: str) -> float:
            """Evaluate a mathematical expression safely"""
            try:
                # Safe evaluation of mathematical expressions
                import ast
                import operator as op

                # Supported operators
                ops = {
                    ast.Add: op.add,
                    ast.Sub: op.sub,
                    ast.Mult: op.mul,
                    ast.Div: op.truediv,
                    ast.Pow: op.pow,
                    ast.USub: op.neg,
                    ast.Mod: op.mod,
                    ast.FloorDiv: op.floordiv,
                }

                def eval_expr(expr):
                    return eval_node(ast.parse(expr, mode="eval").body)

                def eval_node(node):
                    if isinstance(node, ast.Constant):  # Python 3.8+
                        return node.value
                    elif isinstance(node, ast.Num):  # Backwards compatibility
                        return node.n
                    elif isinstance(node, ast.BinOp):
                        return ops[type(node.op)](eval_node(node.left), eval_node(node.right))
                    elif isinstance(node, ast.UnaryOp):
                        return ops[type(node.op)](eval_node(node.operand))
                    else:
                        raise TypeError(f"Unsupported node type: {type(node)}")

                result = eval_expr(expression)
                return float(result)
            except Exception as e:
                logger.error(f"Error evaluating expression '{expression}': {str(e)}")
                raise ValueError(f"Error evaluating expression: {str(e)}")

        @self.agent.tool_plain
        def search_knowledge_base(query: str, top_k: int = 3) -> List[str]:
            """
            Search a knowledge base (mock implementation for demo).
            In production, this would connect to your actual knowledge base.
            """
            # Mock results for demonstration
            results = [
                f"Knowledge Result 1 for '{query}': This is a sample knowledge base entry demonstrating search capability",
                f"Knowledge Result 2 for '{query}': Another relevant entry that would contain domain-specific information",
                f"Knowledge Result 3 for '{query}': Additional contextual information related to the query",
            ]
            return results[:top_k]

        @self.agent.tool_plain
        def multiply_numbers(a: float, b: float) -> float:
            """
            Multiply two numbers together - simple demo of tool logic execution.
            """
            result = a * b
            logger.info(f"Tool multiply_numbers called: {a} * {b} = {result}")
            return result

        @self.agent.tool_plain
        def add_numbers(a: float, b: float) -> float:
            """
            Add two numbers together - another simple math demo.
            """
            result = a + b
            logger.info(f"Tool add_numbers called: {a} + {b} = {result}")
            return result


async def execute_multi_provider_agent(request_data: dict) -> dict:
    """
    Convenience function to execute a multi-provider agent request

    Args:
        request_data: Dictionary containing request parameters

    Returns:
        Dictionary containing response data
    """
    request = MultiProviderRequest(**request_data)

    # Use tool-enabled agent if tools are requested
    if request.enable_tools:
        agent = ToolEnabledMultiProviderAgent(request)
    else:
        agent = MultiProviderAgent(request)

    response = await agent.execute()
    return response.model_dump(mode="json")
