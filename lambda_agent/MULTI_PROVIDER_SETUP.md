# Multi-Provider Lambda Agent Setup

## Overview

The Lambda agent now supports multiple AI providers, allowing Django to orchestrate agent tasks while leveraging serverless execution for scalability and cost efficiency.

## Supported Providers

1. **AWS Bedrock** - Claude models via AWS (no API key needed, uses IAM)
2. **Anthropic** - Direct Claude API access
3. **OpenAI** - GPT models
4. **Google Gemini** - Google's AI models
5. **Ollama** - Self-hosted open source models

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
            ├── Executes prompt
            └── Returns response
```

## Configuration

### Django Settings

Add to your Django settings:

```python
# Enable Lambda execution for agent tasks
USE_LAMBDA_FOR_AGENT_EXECUTION = True

# Lambda configuration (in .env)
AWS_LAMBDA_REGION=us-east-1
LAMBDA_AGENT_FUNCTION_NAME=bedrock-agent-staging
AWS_ACCESS_KEY_ID=your_key  # For Heroku deployment
AWS_SECRET_ACCESS_KEY=your_secret  # For Heroku deployment
```

### Lambda Environment Variables

The Lambda function needs:

```bash
BEDROCK_REGION=us-east-1
BEDROCK_MODEL_ID=us.anthropic.claude-3-7-sonnet-20250219-v1:0
```

## API Request Format

### Multi-Provider Request

```json
{
  "provider": "OPENAI",
  "model_name": "gpt-4",
  "api_key": "sk-...",
  "prompt": "Your instruction here",
  "system_prompt": "Optional system prompt",
  "agent_type": "one-shot",
  "agent_name": "My Agent",
  "max_tokens": 2000,
  "temperature": 0.7,
  "context": {
    "additional": "context data"
  }
}
```

### Response Format

```json
{
  "response": "The agent's response",
  "provider": "OPENAI",
  "model": "gpt-4",
  "metadata": {
    "agent_type": "one-shot",
    "agent_name": "My Agent",
    "context_provided": true,
    "custom_system_prompt": true
  },
  "timestamp": "2024-01-01T00:00:00Z",
  "execution_time_seconds": 1.23,
  "token_usage": {
    "input_tokens": 100,
    "output_tokens": 50,
    "total_tokens": 150
  }
}
```

## Django Integration

### Using the Lambda Service

```python
from tn_agent_launcher.agent.lambda_service import lambda_agent_service

# Invoke with any provider
response = lambda_agent_service.invoke_agent(
    provider="GEMINI",
    model_name="gemini-pro",
    api_key="your-api-key",
    prompt="Generate a summary",
    system_prompt="You are a helpful assistant",
    agent_type="one-shot",
    agent_name="Summary Agent",
    max_tokens=1000,
    temperature=0.5
)

print(response["response"])
```

### Automatic Task Execution

When `USE_LAMBDA_FOR_AGENT_EXECUTION=True`, agent tasks automatically use Lambda:

```python
# This will execute via Lambda if configured
task = AgentTask.objects.create(
    name="Daily Report",
    agent_instance=agent,  # Any provider type
    instruction="Generate daily report",
    schedule_type="daily"
)
```

## Testing

### Local Testing

```bash
cd lambda_agent
python scripts/test_multi_provider.py
```

### Lambda Testing

```bash
# Deploy first
bash scripts/deploy.sh

# Test the deployed function
python scripts/test_multi_provider.py
```

## Adding New Providers

To add a new provider:

1. Update `ProviderType` literal in `multi_provider_agent.py`
2. Add case to `ProviderFactory.create_model()`
3. Update Django's `AgentInstance.ProviderChoices`
4. Test the integration

Example:

```python
case "COHERE":
    if not api_key:
        raise ValueError("API key required for Cohere")
    return CohereModel(
        model_name=model_name,
        api_key=api_key
    )
```

## Security Considerations

1. **API Keys**: Never log or expose API keys
2. **IAM Permissions**: Lambda role should have minimal permissions
3. **Input Validation**: All inputs are validated with Pydantic
4. **Error Handling**: Sensitive errors are logged, generic messages returned

## Cost Optimization

1. **Lambda Advantages**:
   - Pay only for execution time
   - Auto-scaling without infrastructure
   - No idle costs

2. **Provider Selection**:
   - Bedrock: Best for AWS-native, no API key management
   - OpenAI: Wide model selection
   - Ollama: Free with self-hosting
   - Gemini: Competitive pricing for long contexts

## Monitoring

### CloudWatch Logs

```bash
aws logs tail /aws/lambda/bedrock-agent-staging \
  --profile william-tn-staging \
  --region us-east-1 \
  --since 5m
```

### Django Logs

Agent task executions are logged with:
- Provider used
- Execution time
- Success/failure status
- Token usage (when available)

## Troubleshooting

### Common Issues

1. **"API key required"**: Ensure API key is provided for non-Bedrock providers
2. **"Lambda timeout"**: Increase timeout in `template.yaml` (default 60s)
3. **"Invalid provider"**: Check provider name matches exactly (case-sensitive)
4. **IAM errors**: Ensure Lambda role has necessary permissions

### Debug Mode

Enable detailed logging:

```python
import logging
logging.getLogger('tn_agent_launcher.agent').setLevel(logging.DEBUG)
```

## Migration from Local Execution

1. Set `USE_LAMBDA_FOR_AGENT_EXECUTION=True`
2. Deploy Lambda function
3. Configure AWS credentials
4. Test with existing agent tasks
5. Monitor logs for issues

The system falls back to local execution if Lambda fails, ensuring reliability.