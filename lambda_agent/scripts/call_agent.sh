#!/bin/bash

# Simple wrapper script for calling the agent with AWS CLI

API_URL="${BEDROCK_AGENT_API_URL:-https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/Prod/agent}"
PROFILE="${AWS_PROFILE:-william-tn-staging}"
REGION="${AWS_REGION:-us-east-1}"

# Get prompt from arguments or use default
PROMPT="${1:-What is 2+2?}"

# Create request body
REQUEST_BODY=$(cat <<EOF
{
  "prompt": "$PROMPT",
  "max_tokens": 500,
  "temperature": 0.7
}
EOF
)

echo "🤖 Calling Bedrock Agent with IAM auth..."
echo "Profile: $PROFILE"
echo "Prompt: $PROMPT"
echo "----------------------------------------"

# Use AWS CLI to sign and send the request
aws apigatewaymanagementapi post-to-connection \
    --connection-id "dummy" \
    --data "$REQUEST_BODY" \
    --endpoint-url "$API_URL" \
    --profile "$PROFILE" \
    --region "$REGION" 2>/dev/null || \
aws apigateway test-invoke-method \
    --rest-api-id "YOUR_API_ID" \
    --resource-id "/" \
    --http-method POST \
    --path-with-query-string "/agent" \
    --body "$REQUEST_BODY" \
    --profile "$PROFILE" \
    --region "$REGION" 2>/dev/null || \
echo "Note: Direct AWS CLI invocation requires the apigateway:POST permission"

echo ""
echo "Alternative: Use curl with AWS Signature V4:"
echo "curl --aws-sigv4 \"aws:amz:${REGION}:execute-api\" \\"
echo "  --user \"$(aws configure get aws_access_key_id --profile $PROFILE):$(aws configure get aws_secret_access_key --profile $PROFILE)\" \\"
echo "  -X POST \"$API_URL\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '$REQUEST_BODY'"