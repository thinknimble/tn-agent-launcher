#!/bin/bash

# AWS Bedrock Agent Lambda Invocation Script

set -e

# Configuration
AWS_PROFILE="${AWS_PROFILE:-william-tn-staging}"
AWS_REGION="${AWS_REGION:-us-east-1}"
ENVIRONMENT="${ENVIRONMENT:-staging}"
FUNCTION_NAME="bedrock-agent-${ENVIRONMENT}"

# Parse command line arguments
PROMPT="${1:-Hello, how can you help me today?}"
USE_TOOLS="${2:-false}"

echo "🤖 Invoking Bedrock Agent Lambda"
echo "================================="
echo "Function: $FUNCTION_NAME"
echo "Profile: $AWS_PROFILE"
echo "Region: $AWS_REGION"
echo ""

# Create request payload
PAYLOAD=$(cat <<EOF
{
  "body": {
    "prompt": "$PROMPT",
    "use_tools": $USE_TOOLS,
    "max_tokens": 2000,
    "temperature": 0.7
  }
}
EOF
)

echo "📤 Request:"
echo "$PAYLOAD" | jq .
echo ""

# Invoke the Lambda function
echo "⚡ Invoking Lambda function..."
RESPONSE=$(aws lambda invoke \
    --function-name $FUNCTION_NAME \
    --profile $AWS_PROFILE \
    --region $AWS_REGION \
    --payload "$PAYLOAD" \
    --cli-binary-format raw-in-base64-out \
    response.json 2>&1)

# Check if invocation was successful
if echo "$RESPONSE" | grep -q "StatusCode.*200"; then
    echo "✅ Invocation successful!"
    echo ""
    echo "📥 Response:"
    cat response.json | jq .
    rm -f response.json
else
    echo "❌ Invocation failed!"
    echo "$RESPONSE"
    exit 1
fi