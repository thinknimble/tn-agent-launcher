# Lambda Agent Testing Guide

This guide covers testing Lambda-based agent execution in the TN Agent Launcher.

## Overview

The system supports per-agent Lambda execution configuration, allowing individual agents to use AWS Lambda for execution. This is particularly useful for AWS Bedrock models that require IAM authentication.

## Test Command

All Lambda testing is done through the management command:

```bash
python manage.py test_lambda_agent [options]
```

## Command Options

### Basic Options
- `--provider PROVIDER` - AI provider to test (BEDROCK, OPENAI, ANTHROPIC, GEMINI, OLLAMA). Default: BEDROCK
- `--email EMAIL` - Email of user to create agent for. Default: admin@thinknimble.com
- `--prompt PROMPT` - Test prompt to send to agent. Default: "What is 2+2? Answer in one word."

### Advanced Options
- `--check-config` - Only check Lambda configuration without running tests
- `--validate` - Run validation tests for Lambda configuration rules

## Usage Examples

### 1. Quick Configuration Check
```bash
python manage.py test_lambda_agent --check-config
```

This verifies:
- `USE_LAMBDA_FOR_AGENT_EXECUTION` is enabled
- AWS credentials are configured
- Lambda function name and region are set
- Bedrock model ID is configured

### 2. Run Validation Tests
```bash
python manage.py test_lambda_agent --validate
```

This tests:
- BEDROCK provider requires `use_lambda=True`
- Non-BEDROCK providers require API keys
- Lambda can be optionally enabled for any provider

### 3. Test Bedrock Execution
```bash
python manage.py test_lambda_agent --provider BEDROCK
```

This:
- Creates a Bedrock agent with `use_lambda=True`
- Executes a test task via Lambda
- Waits for completion and shows results

### 4. Test Other Providers
```bash
# Test OpenAI with Lambda
python manage.py test_lambda_agent --provider OPENAI

# Test with custom prompt
python manage.py test_lambda_agent --provider BEDROCK --prompt "What is the capital of France?"
```

## Environment Configuration

### Required for Lambda Execution
```bash
# Enable Lambda execution globally
USE_LAMBDA_FOR_AGENT_EXECUTION=True

# AWS credentials (if not using IAM roles)
AWS_ACCESS_KEY_ID=your-key-id
AWS_SECRET_ACCESS_KEY=your-secret-key
```

### Optional Settings (with defaults)
```bash
# Lambda configuration
AWS_LAMBDA_REGION=us-east-1  # Default
LAMBDA_AGENT_FUNCTION_NAME=bedrock-agent-staging  # Default
BEDROCK_MODEL_ID=us.anthropic.claude-3-7-sonnet-20250219-v1:0  # Default
```

## Testing on Heroku Review Apps

1. **Set Lambda flag on review app:**
   ```bash
   heroku config:set USE_LAMBDA_FOR_AGENT_EXECUTION=True --app your-review-app
   ```

2. **Verify configuration:**
   ```bash
   heroku run python manage.py test_lambda_agent --check-config --app your-review-app
   ```

3. **Run validation tests:**
   ```bash
   heroku run python manage.py test_lambda_agent --validate --app your-review-app
   ```

4. **Test Bedrock execution:**
   ```bash
   heroku run python manage.py test_lambda_agent --provider BEDROCK --app your-review-app
   ```

## Validation Rules

### BEDROCK Provider
- **Requires**: `use_lambda=True`
- **API Key**: Not required (uses IAM authentication)
- **Error if**: Trying to use BEDROCK without Lambda enabled

### Other Providers (OpenAI, Anthropic, etc.)
- **Lambda**: Optional (`use_lambda` can be True or False)
- **API Key**: Required
- **Error if**: No API key provided

### Global Lambda Setting
- If `USE_LAMBDA_FOR_AGENT_EXECUTION=False`, no agents can use Lambda
- Individual agents can only use Lambda if both:
  1. Global setting is enabled
  2. Agent's `use_lambda=True`

## Troubleshooting

### Configuration Issues
```bash
# Check all Lambda-related settings
python manage.py test_lambda_agent --check-config

# Verify AWS credentials
echo $AWS_ACCESS_KEY_ID
echo $AWS_SECRET_ACCESS_KEY
```

### Validation Failures
```bash
# Run validation tests to identify issues
python manage.py test_lambda_agent --validate
```

### Common Errors

1. **"Lambda execution is not enabled globally"**
   - Set `USE_LAMBDA_FOR_AGENT_EXECUTION=True`

2. **"Lambda execution must be enabled for Bedrock providers"**
   - BEDROCK always requires `use_lambda=True`

3. **"API key is required for OpenAI provider"**
   - Non-BEDROCK providers need API keys

4. **"AWS credentials not configured"**
   - Set `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`

## Admin Interface

For admin users (`is_staff=True`), the Django admin interface shows:
- `use_lambda` checkbox for each agent
- Validation prevents saving invalid configurations
- List view shows Lambda status for each agent

Access at: `/staff/agent/agentinstance/`

## Development Workflow

1. **Local testing:**
   ```bash
   python manage.py test_lambda_agent --check-config
   python manage.py test_lambda_agent --validate
   python manage.py test_lambda_agent --provider BEDROCK
   ```

2. **Review app testing:**
   ```bash
   heroku config:set USE_LAMBDA_FOR_AGENT_EXECUTION=True --app review-app
   heroku run python manage.py test_lambda_agent --validate --app review-app
   ```

3. **Production deployment:**
   - Ensure AWS credentials are configured
   - Enable Lambda flag
   - Test with non-critical agent first
   - Monitor CloudWatch logs for Lambda function

## Related Documentation

- [Lambda Agent Deployment](../lambda_agent/DEPLOYMENT_NOTES.md) - Lambda function deployment
- [Multi-Provider Support](../lambda_agent/src/multi_provider_agent.py) - Provider implementation details
