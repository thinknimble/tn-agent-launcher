# AWS Lambda Bedrock Agent Deployment Notes

## Overview
Created a serverless AWS Lambda function that uses AWS Bedrock (Claude 3.7 Sonnet) to provide an AI agent accessible via API Gateway with IAM authentication.

## Architecture
- **Runtime**: Python 3.12 on AWS Lambda
- **AI Model**: Claude 3.7 Sonnet via AWS Bedrock (cross-region inference profile)
- **Framework**: PydanticAI with Pydantic data validation
- **Deployment**: AWS SAM (Serverless Application Model)
- **Authentication**: AWS IAM (Signature Version 4)
- **Region**: us-east-1

## Key Components

### 1. Agent Implementation (`lambda_agent/src/agent.py`)
- Uses PydanticAI for agent orchestration
- Pydantic models for request/response validation
- Supports custom system prompts and context
- Configurable max tokens and temperature

### 2. Lambda Handler (`lambda_agent/src/lambda_handler.py`)
- Handles API Gateway events
- Async request processing
- Error handling and logging

### 3. SAM Template (`lambda_agent/template.yaml`)
- CloudFormation infrastructure as code
- IAM roles with minimal permissions
- API Gateway with IAM authentication
- Cross-region Bedrock access permissions

### 4. Deployment Scripts
- `deploy.sh`: Automated SAM deployment
- `call_agent.py`: Python script for authenticated API calls
- `list_models.py`: Utility to list available Bedrock models

## Security Measures Implemented

1. **IAM Authentication**: API Gateway requires AWS SigV4 authentication
2. **Minimal IAM Permissions**: Lambda role has only necessary Bedrock permissions
3. **Environment Variables**: Sensitive config in .env file (gitignored)
4. **No Hardcoded Secrets**: API URLs and credentials externalized
5. **Cross-Region Access**: Properly configured for inference profiles

## Configuration

### Environment Variables
```bash
# .env file (gitignored)
BEDROCK_AGENT_API_URL=https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/Prod/agent
AWS_PROFILE=william-tn-staging
AWS_REGION=us-east-1
```

### Model Configuration
- Model ID: `us.anthropic.claude-3-7-sonnet-20250219-v1:0`
- Uses cross-region inference profile for better availability
- Configurable via `BEDROCK_MODEL_ID` environment variable

## Deployment Process

1. **Prerequisites**:
   - AWS CLI configured with appropriate profile
   - SAM CLI installed (`pip install --user aws-sam-cli`)
   - Docker running (for container-based builds, optional)
   - Bedrock model access enabled in AWS Console

2. **Deploy**:
   ```bash
   cd lambda_agent
   bash scripts/deploy.sh
   ```

3. **Test**:
   ```bash
   # Set up environment
   cp .env.example .env
   # Edit .env with your API Gateway URL
   
   # Test authenticated call
   source .venv/bin/activate
   python scripts/call_agent.py "Your question here"
   ```

## Key Challenges Resolved

1. **Model ID Format**: Different formats needed for listing vs. invoking models
2. **Cross-Region Inference**: Required using inference profiles (us.* prefix)
3. **IAM Permissions**: Needed to allow cross-region Bedrock access
4. **PydanticAI Integration**: Used BedrockConverseModel, not BedrockModel
5. **Environment Variables**: AWS_REGION is reserved, used BEDROCK_REGION instead

## Future Considerations

### For Heroku Deployment
- Create dedicated IAM user with minimal permissions
- Store credentials as Heroku config vars
- Implement credential rotation strategy
- Consider using AWS Secrets Manager

### Enhancements
- Add request/response logging to DynamoDB
- Implement rate limiting
- Add custom Lambda authorizer for flexible auth
- Create CloudWatch dashboards for monitoring
- Implement conversation history/context

## Testing Checklist

- [x] Lambda function deploys successfully
- [x] IAM authentication blocks unauthenticated requests
- [x] Authenticated requests work from local machine
- [x] Claude 3.7 Sonnet model responds correctly
- [x] Error handling works properly
- [x] No sensitive information in code repository

## Useful Commands

```bash
# List available models
python scripts/list_models.py

# Deploy updates
bash scripts/deploy.sh

# Test endpoint
python scripts/call_agent.py "Test prompt"

# Check logs
aws logs tail /aws/lambda/bedrock-agent-staging --profile william-tn-staging --region us-east-1 --since 5m

# Delete stack (cleanup)
aws cloudformation delete-stack --stack-name bedrock-agent-staging --profile william-tn-staging --region us-east-1
```

## Files to Keep Private
- `.env` - Contains API Gateway URL and AWS configuration
- Any files with actual API IDs or account numbers

## Repository Structure
```
lambda_agent/
├── .env                 # Private: Your configuration
├── .env.example         # Template for configuration
├── .gitignore          # Excludes sensitive files
├── README.md           # User documentation
├── requirements.txt    # Python dependencies
├── template.yaml       # SAM/CloudFormation template
├── src/
│   ├── agent.py        # Core agent logic
│   └── lambda_handler.py # Lambda handler
├── scripts/
│   ├── deploy.sh       # Deployment automation
│   ├── call_agent.py   # Test client
│   └── list_models.py  # Model discovery
└── tests/
    └── test_local.py   # Local testing
```

## Notes
- Stack Name: `bedrock-agent-staging`
- Function Name: `bedrock-agent-staging`
- All sensitive configuration is externalized to environment variables
- The codebase is ready for version control without exposing secrets