# AWS Bedrock Agent Lambda

A serverless AWS Lambda function that provides an AI agent powered by AWS Bedrock, using Pydantic for data validation and PydanticAI for agent orchestration.

## Features

- **AWS Bedrock Integration**: Uses Claude 3.5 Sonnet via AWS Bedrock
- **Pydantic Validation**: Strong type checking and validation for requests/responses
- **PydanticAI Agent**: Structured agent with optional tool calling capabilities
- **SAM Deployment**: Easy deployment using AWS SAM
- **Local Testing**: Test locally before deploying

## Prerequisites

- Python 3.12+
- AWS CLI configured with the `default` profile
- AWS SAM CLI (`pip install aws-sam-cli`)
- AWS Bedrock access in your account

## Project Structure

```
lambda/
├── src/
│   ├── agent.py           # Core agent implementation
│   └── lambda_handler.py  # Lambda handler
├── scripts/
│   ├── deploy.sh          # Deployment script
│   └── invoke.sh          # Remote invocation script
├── tests/
│   └── test_local.py      # Local testing script
├── requirements.txt       # Python dependencies
├── template.yaml         # SAM template
└── README.md
```

## Installation

1. Install dependencies for local testing:

```bash
cd lambda
pip install -r requirements.txt
```

2. Install AWS SAM CLI if not already installed:

```bash
pip install aws-sam-cli
```

## Local Testing

The test script in `tests/test_local.py` provides several testing modes:

```bash
# Run all tests
python tests/test_local.py all

# Interactive chat mode
python tests/test_local.py interactive

# Test basic agent
python tests/test_local.py basic

# Test tool-calling agent
python tests/test_local.py tools

# Test Lambda handler
python tests/test_local.py lambda

# Test health check
python tests/test_local.py health
```

## Deployment

### Using the deployment script:

```bash
cd lambda/scripts
./deploy.sh
```

This will:

1. Validate your AWS credentials
2. Create an S3 bucket for deployments (if needed)
3. Build the Lambda function
4. Deploy using SAM
5. Display the API Gateway URL and other outputs

### Manual deployment with SAM:

```bash
cd lambda

# Build
sam build

# Deploy (first time - guided)
sam deploy --guided

# Deploy (subsequent)
sam deploy
```

## Usage

### Via API Gateway (after deployment):

```bash
# Get the API URL from deployment outputs
API_URL="https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/Prod"

# Basic request
curl -X POST "$API_URL/agent" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What is the capital of France?",
    "max_tokens": 100,
    "temperature": 0.7
  }'

# Request with tools
curl -X POST "$API_URL/agent" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What time is it and what is 15 * 23?",
    "use_tools": true,
    "max_tokens": 200
  }'

# Health check
curl "$API_URL/health"
```

### Direct Lambda invocation:

```bash
cd lambda/scripts

# Basic invocation
./invoke.sh "Tell me about AWS Lambda"

# With tools enabled
./invoke.sh "What is the current time?" true
```

## API Reference

### POST /agent

Request body:

```json
{
  "prompt": "Your question here",
  "context": {
    "user_id": "optional-user-id",
    "session_id": "optional-session-id",
    "additional_context": {}
  },
  "max_tokens": 2000,
  "temperature": 0.7,
  "system_prompt": "Optional custom system prompt",
  "use_tools": false
}
```

Response:

```json
{
  "response": "Agent's response",
  "metadata": {
    "context_provided": true,
    "custom_system_prompt": false
  },
  "timestamp": "2024-01-01T00:00:00.000000",
  "model_used": "anthropic.claude-3-5-sonnet-20241022-v2:0",
  "token_usage": {
    "input_tokens": 100,
    "output_tokens": 50,
    "total_tokens": 150
  }
}
```

### GET /health

Response:

```json
{
  "status": "healthy",
  "service": "bedrock-agent"
}
```

## Environment Variables

- `AWS_REGION`: AWS region (default: us-east-1)
- `AWS_PROFILE`: AWS profile for local testing (default: default)
- `BEDROCK_MODEL_ID`: Bedrock model to use (default: anthropic.claude-3-5-sonnet-20241022-v2:0)
- `ENVIRONMENT`: Deployment environment (staging/production)

## Available Tools (when use_tools=true)

1. **get_current_time**: Returns the current UTC time
2. **calculate**: Evaluates mathematical expressions
3. **search_knowledge_base**: Mock knowledge base search (customize for your needs)

## Customization

### Adding new tools:

Edit `src/agent.py` and add new tools to the `ToolCallingAgent` class:

```python
@self.agent.tool
async def my_custom_tool(param: str) -> str:
    """Tool description"""
    # Implementation
    return result
```

### Changing the model:

Update the `BEDROCK_MODEL_ID` environment variable in:

- `template.yaml` for deployments
- `src/agent.py` for local testing

## Monitoring

Logs are available in CloudWatch under:

- Log Group: `/aws/lambda/bedrock-agent-{environment}`
- Retention: 7 days

## Cost Considerations

- Lambda costs: Based on invocations and duration
- Bedrock costs: Based on input/output tokens
- API Gateway: Based on number of API calls
- CloudWatch: Log storage and retention

## Troubleshooting

1. **Authentication errors**: Ensure AWS profile `default` is configured
2. **Bedrock access denied**: Verify Bedrock is enabled in your region
3. **Timeout errors**: Increase Lambda timeout in `template.yaml`
4. **Module not found**: Install dependencies with `pip install -r requirements.txt`

## Security Notes

- The Lambda function requires Bedrock invoke permissions
- API Gateway endpoint is public (add authentication as needed)
- Sensitive data should not be logged
- Consider implementing rate limiting for production use

## Next Steps

1. Add authentication to API Gateway
2. Implement custom tools for your use case
3. Add DynamoDB for conversation history
4. Set up monitoring and alerts
5. Implement rate limiting
6. Add input sanitization
7. Create a frontend application
