# Multi-Provider Lambda Agent

A serverless AWS Lambda function that provides AI agent capabilities with support for multiple AI providers. The Lambda agent works in conjunction with the Django TN Agent Launcher to provide scalable, cost-effective agent execution.

## Features

- **Multi-Provider Support**: AWS Bedrock, Anthropic, OpenAI, Google Gemini, and Ollama
- **Django Integration**: Seamlessly integrates with Django backend for orchestration
- **IAM Authentication**: Secure access via AWS IAM (no API keys needed for Bedrock)
- **PydanticAI Framework**: Structured agents with type safety and validation
- **Tool Calling**: Optional tool execution capabilities for enhanced agent functionality
- **SAM Deployment**: Easy deployment using AWS SAM

## Supported AI Providers

1. **AWS Bedrock** - Claude models via AWS (uses IAM authentication)
2. **Anthropic** - Direct Claude API access (requires API key)
3. **OpenAI** - GPT models (requires API key)
4. **Google Gemini** - Google's AI models (requires API key)
5. **Ollama** - Self-hosted open source models (requires target URL)

## Architecture

```
Django App (Orchestration)
    ↓
    ├── Stores agent configurations
    ├── Manages task scheduling
    ├── Handles user authentication
    └── Invokes Lambda for execution
            ↓
        AWS Lambda (Execution)
            ├── Receives provider config
            ├── Creates appropriate AI client
            ├── Executes prompt with optional tools
            └── Returns structured response
```

## Prerequisites

- Python 3.12+
- AWS CLI configured with appropriate credentials
- AWS SAM CLI: `pip install aws-sam-cli`
- AWS Bedrock access in your AWS account (for Bedrock provider)
- UV package manager (recommended): `pip install uv`

## Development Setup

### 1. Install Dependencies

From the project root:

```bash
# Install all dependencies including Lambda-specific ones
uv sync

# Install Lambda development dependencies (for Lambda testing/development)
uv sync --group lambda-dev
```

This installs:
- **Core dependencies**: pydantic-ai, pydantic-ai-bedrock, boto3, python-dotenv
- **Lambda dev dependencies**: pytest>=8.0.0, pytest-asyncio, mypy, types-boto3

**Note**: The `lambda_agent/src/requirements.txt` file is kept for AWS SAM deployment purposes and will be automatically used during `sam build`.

### 2. Configure Environment

Copy the example environment file:

```bash
cp lambda_agent/.env.example lambda_agent/.env
```

Edit `.env` with your settings:

```bash
# AWS Configuration
AWS_DEFAULT_REGION=us-east-1

# Model Configuration
DEFAULT_MODEL_NAME=us.anthropic.claude-3-7-sonnet-20250219-v1:0
DEFAULT_MAX_TOKENS=2000
DEFAULT_TEMPERATURE=0.7

# API Keys (only needed for non-Bedrock providers)
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
GEMINI_API_KEY=your-gemini-key
```

### 3. Local Testing

Test the Lambda function locally:

```bash
cd lambda_agent

# Test with default Bedrock provider
python src/multi_provider_agent.py

# Test specific provider
python -c "
import asyncio
from src.multi_provider_agent import execute_multi_provider_agent

async def test():
    result = await execute_multi_provider_agent({
        'provider': 'BEDROCK',
        'model_name': 'us.anthropic.claude-3-7-sonnet-20250219-v1:0',
        'prompt': 'What is 2+2?',
        'agent_name': 'Test Agent'
    })
    print(result)

asyncio.run(test())
"
```

## Deployment

### 1. Build and Deploy

```bash
cd lambda_agent

# Deploy to AWS (creates/updates Lambda function and API Gateway)
bash scripts/deploy.sh

# The script will output the API Gateway URL for testing
```

### 2. Test Deployed Function

```bash
# Test the deployed function
bash scripts/invoke.sh "What is the capital of France?"

# Test with specific provider (requires API key configuration)
python scripts/call_agent.py "Explain quantum computing" --profile your-aws-profile
```

## Django Integration

The Lambda agent integrates with Django through the `lambda_service.py` module:

```python
from tn_agent_launcher.agent.lambda_service import lambda_agent_service

# Invoke Lambda for any provider
response = lambda_agent_service.invoke_agent(
    provider="BEDROCK",
    model_name="us.anthropic.claude-3-7-sonnet-20250219-v1:0",
    api_key=None,  # Not needed for Bedrock
    prompt="Your prompt here",
    system_prompt="Optional system prompt",
    agent_name="My Agent"
)
```

## Per-Agent Lambda Configuration

Individual agents can be configured to use Lambda execution:

```bash
# Test Django integration
cd server
python manage.py test_lambda_agent --provider BEDROCK --validate
```

See [Lambda Testing Guide](../server/LAMBDA_TESTING.md) for comprehensive testing instructions.

## Configuration

### Lambda Function Settings

- **Runtime**: Python 3.12
- **Memory**: 512 MB (configurable in `template.yaml`)
- **Timeout**: 300 seconds
- **Architecture**: x86_64

### Environment Variables (Lambda)

Set these in your Lambda function environment or SAM template:

```yaml
Environment:
  Variables:
    DEFAULT_MODEL_NAME: "us.anthropic.claude-3-7-sonnet-20250219-v1:0"
    DEFAULT_MAX_TOKENS: "2000"
    DEFAULT_TEMPERATURE: "0.7"
    OPENAI_API_KEY: !Ref OpenAIApiKey  # If using OpenAI
```

## API Interface

### Request Format

```json
{
  "provider": "BEDROCK",
  "model_name": "us.anthropic.claude-3-7-sonnet-20250219-v1:0",
  "prompt": "What is machine learning?",
  "system_prompt": "You are a helpful AI assistant.",
  "agent_name": "Learning Assistant",
  "api_key": "provider-api-key-if-needed",
  "target_url": "http://localhost:11434",  // For Ollama
  "max_tokens": 2000,
  "temperature": 0.7,
  "enable_tools": false
}
```

### Response Format

```json
{
  "response": "Machine learning is...",
  "provider": "BEDROCK",
  "model_name": "us.anthropic.claude-3-7-sonnet-20250219-v1:0",
  "agent_name": "Learning Assistant",
  "execution_time": 2.34,
  "metadata": {
    "prompt_tokens": 15,
    "completion_tokens": 150,
    "total_tokens": 165
  }
}
```

## Tool Calling (Optional)

Enable tool calling by setting `enable_tools: true`:

### Available Tools

- **get_current_time()**: Returns current UTC timestamp
- **calculate(expression)**: Safely evaluates mathematical expressions
- **search_knowledge_base(query, top_k)**: Mock knowledge base search
- **add_numbers(a, b)**: Add two numbers
- **multiply_numbers(a, b)**: Multiply two numbers

### Tool Usage Example

```python
response = lambda_agent_service.invoke_agent(
    provider="BEDROCK",
    model_name="us.anthropic.claude-3-7-sonnet-20250219-v1:0",
    prompt="What time is it and what is 15 * 8?",
    enable_tools=True
)
```

## Troubleshooting

### Common Issues

1. **"No credentials found"**
   - Configure AWS CLI: `aws configure`
   - Or set environment variables: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`

2. **"Access denied to Bedrock"**
   - Enable Bedrock access in AWS console
   - Ensure your IAM user/role has `bedrock:InvokeModel` permissions

3. **"Function not found"**
   - Deploy first: `bash scripts/deploy.sh`
   - Check function name in AWS console

4. **API key errors for non-Bedrock providers**
   - Set API keys in Lambda environment variables
   - Or pass them in the request payload

### Development Tips

- Use `pytest` for running Lambda tests: `pytest tests/ -v`
- Enable debug logging by setting `LOG_LEVEL=DEBUG`
- Use SAM local invoke for debugging: `sam local invoke BedrockAgentFunction`

## Cost Optimization

- **Bedrock**: Pay per request, no idle costs
- **Lambda**: Pay per invocation and duration
- **Cold starts**: ~1-2 seconds for Python 3.12
- **Memory**: 512MB recommended for most workloads

## Related Documentation

- [Django Lambda Testing Guide](../server/LAMBDA_TESTING.md)
- [TN Agent Launcher README](../README.md)
- [AWS SAM Documentation](https://docs.aws.amazon.com/serverless-application-model/)
- [PydanticAI Documentation](https://ai.pydantic.dev/)
