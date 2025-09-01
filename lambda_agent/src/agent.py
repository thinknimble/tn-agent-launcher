"""
AWS Bedrock Agent using Pydantic and PydanticAI
"""
import os
import json
from typing import Optional, Dict, Any, List
from datetime import datetime
import boto3
from pydantic import BaseModel, Field, ConfigDict
from pydantic_ai import Agent, RunContext
from pydantic_ai.models.bedrock import BedrockConverseModel
import logging

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# AWS Configuration
BEDROCK_REGION = os.environ.get("BEDROCK_REGION", "us-east-1")
AWS_PROFILE = os.environ.get("AWS_PROFILE", "william-tn-staging")
# Using Claude 3.7 Sonnet with cross-region inference profile
MODEL_ID = os.environ.get("BEDROCK_MODEL_ID", "us.anthropic.claude-3-7-sonnet-20250219-v1:0")

# Set AWS_DEFAULT_REGION for pydantic-ai
os.environ["AWS_DEFAULT_REGION"] = BEDROCK_REGION

# Initialize AWS session (only use profile locally, not in Lambda)
if os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
    # Running in Lambda - use IAM role
    session = boto3.Session(region_name=BEDROCK_REGION)
else:
    # Running locally - use profile
    session = boto3.Session(profile_name=AWS_PROFILE, region_name=BEDROCK_REGION)
    
bedrock_client = session.client("bedrock-runtime")


class AgentRequest(BaseModel):
    """Input model for agent requests"""
    model_config = ConfigDict(extra='forbid')
    
    prompt: str = Field(..., description="The prompt or question for the agent")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Additional context for the agent")
    max_tokens: int = Field(default=2000, description="Maximum tokens for response")
    temperature: float = Field(default=0.7, ge=0, le=1, description="Temperature for response generation")
    system_prompt: Optional[str] = Field(default=None, description="System prompt to guide the agent")


class AgentResponse(BaseModel):
    """Output model for agent responses"""
    model_config = ConfigDict(extra='forbid')
    
    response: str = Field(..., description="The agent's response")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Response metadata")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    model_used: str = Field(default=MODEL_ID)
    token_usage: Optional[Dict[str, int]] = Field(default=None)


class AgentContext(BaseModel):
    """Context model for the agent"""
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    additional_context: Dict[str, Any] = Field(default_factory=dict)


class BedrockAgent:
    """Main agent class using PydanticAI with AWS Bedrock"""
    
    def __init__(self, model_id: str = MODEL_ID):
        self.model_id = model_id
        self.bedrock_model = BedrockConverseModel(
            model_name=model_id,
        )
        
        # Create PydanticAI agent
        self.agent = Agent(
            model=self.bedrock_model,
            output_type=str,
            system_prompt=(
                "You are a helpful AI assistant powered by AWS Bedrock. "
                "Provide clear, accurate, and helpful responses."
            ),
        )
    
    async def process_request(self, request: AgentRequest, context: Optional[AgentContext] = None) -> AgentResponse:
        """
        Process an agent request and return a response
        """
        try:
            # Update agent with custom system prompt if provided
            if request.system_prompt:
                self.agent = Agent(
                    model=self.bedrock_model,
                    output_type=str,
                    system_prompt=request.system_prompt,
                )
            
            # Prepare context for the agent
            agent_context = {}
            if context:
                agent_context.update(context.model_dump())
            if request.context:
                agent_context.update(request.context)
            
            # Run the agent
            result = await self.agent.run(
                request.prompt,
                deps=agent_context,
                model_settings={
                    "max_tokens": request.max_tokens,
                    "temperature": request.temperature,
                }
            )
            
            # Extract token usage if available
            token_usage = None
            if hasattr(result, '_usage') and result._usage:
                token_usage = {
                    "input_tokens": result._usage.input_tokens,
                    "output_tokens": result._usage.output_tokens,
                    "total_tokens": result._usage.total_tokens,
                }
            
            # Create response
            response = AgentResponse(
                response=result.output,
                metadata={
                    "context_provided": bool(agent_context),
                    "custom_system_prompt": bool(request.system_prompt),
                },
                model_used=self.model_id,
                token_usage=token_usage,
            )
            
            return response
            
        except Exception as e:
            logger.error(f"Error processing request: {str(e)}")
            raise


class ToolCallingAgent(BedrockAgent):
    """Extended agent with tool calling capabilities"""
    
    def __init__(self, model_id: str = MODEL_ID):
        super().__init__(model_id)
        self._setup_tools()
    
    def _setup_tools(self):
        """Setup available tools for the agent"""
        
        @self.agent.tool
        async def get_current_time() -> str:
            """Get the current UTC time"""
            return datetime.utcnow().isoformat()
        
        @self.agent.tool
        async def calculate(expression: str) -> float:
            """Evaluate a mathematical expression"""
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
                }
                
                def eval_expr(expr):
                    return eval_node(ast.parse(expr, mode='eval').body)
                
                def eval_node(node):
                    if isinstance(node, ast.Num):
                        return node.n
                    elif isinstance(node, ast.BinOp):
                        return ops[type(node.op)](eval_node(node.left), eval_node(node.right))
                    elif isinstance(node, ast.UnaryOp):
                        return ops[type(node.op)](eval_node(node.operand))
                    else:
                        raise TypeError(node)
                
                return eval_expr(expression)
            except Exception as e:
                return f"Error evaluating expression: {str(e)}"
        
        @self.agent.tool
        async def search_knowledge_base(query: str, top_k: int = 3) -> List[str]:
            """Search a knowledge base (mock implementation)"""
            # This would connect to your actual knowledge base
            return [
                f"Result 1 for '{query}': Sample knowledge base entry",
                f"Result 2 for '{query}': Another relevant entry",
                f"Result 3 for '{query}': Additional information",
            ]


# Create a singleton instance
default_agent = BedrockAgent()
# Disable tool agent for now due to schema generation issues
tool_agent = BedrockAgent()  # ToolCallingAgent()