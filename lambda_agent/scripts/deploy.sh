#!/bin/bash

# AWS Bedrock Agent Lambda Deployment Script

set -e

# Configuration
AWS_PROFILE="${AWS_PROFILE:-default}"
AWS_REGION="${AWS_REGION:-us-east-1}"
ENVIRONMENT="${ENVIRONMENT:-staging}"
STACK_NAME="bedrock-agent-${ENVIRONMENT}"
S3_BUCKET="${S3_BUCKET:-bedrock-agent-deployments-${ENVIRONMENT}}"

echo "🚀 Deploying Bedrock Agent Lambda"
echo "================================"
echo "Profile: $AWS_PROFILE"
echo "Region: $AWS_REGION"
echo "Environment: $ENVIRONMENT"
echo "Stack: $STACK_NAME"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if SAM CLI is installed
SAM_PATH="/Users/william/Library/Python/3.9/bin/sam"
if [ ! -f "$SAM_PATH" ]; then
    echo "❌ SAM CLI is not installed. Please install it first."
    echo "Run: pip install --user aws-sam-cli"
    exit 1
fi
echo "Using SAM CLI at: $SAM_PATH"

# Validate AWS credentials
echo "🔐 Validating AWS credentials..."
aws sts get-caller-identity --profile $AWS_PROFILE > /dev/null 2>&1 || {
    echo "❌ Failed to authenticate with AWS profile: $AWS_PROFILE"
    exit 1
}

# Create S3 bucket if it doesn't exist
echo "🪣 Checking S3 bucket..."
if ! aws s3 ls "s3://${S3_BUCKET}" --profile $AWS_PROFILE 2>/dev/null; then
    echo "Creating S3 bucket: $S3_BUCKET"
    aws s3 mb "s3://${S3_BUCKET}" --profile $AWS_PROFILE --region $AWS_REGION
else
    echo "S3 bucket exists: $S3_BUCKET"
fi

# Navigate to lambda directory
cd "$(dirname "$0")/.."

# Validate SAM template
echo "✅ Validating SAM template..."
$SAM_PATH validate --template template.yaml --profile $AWS_PROFILE --region $AWS_REGION

# Build the application
echo "🔨 Building application..."
echo "Note: Building without container for local Python compatibility"
$SAM_PATH build \
    --template template.yaml \
    --region $AWS_REGION

# Deploy the application
echo "📦 Deploying to AWS..."
$SAM_PATH deploy \
    --stack-name $STACK_NAME \
    --s3-bucket $S3_BUCKET \
    --capabilities CAPABILITY_IAM \
    --parameter-overrides EnvironmentName=$ENVIRONMENT \
    --profile $AWS_PROFILE \
    --region $AWS_REGION \
    --no-confirm-changeset \
    --no-fail-on-empty-changeset

# Get stack outputs
echo ""
echo "✨ Deployment complete!"
echo "========================"
echo "Stack outputs:"
aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --profile $AWS_PROFILE \
    --region $AWS_REGION \
    --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
    --output table

echo ""
echo "🎉 Done!"
