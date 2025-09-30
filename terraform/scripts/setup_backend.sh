#!/bin/bash

# S3 Backend Setup Script
# This script creates the S3 bucket and DynamoDB table needed for Terraform remote state backend

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_colored() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to get user input with default
get_input() {
    local prompt=$1
    local default=$2
    local var_name=$3
    
    echo -n "$prompt [$default]: "
    read input
    
    if [[ -z "$input" ]]; then
        input="$default"
    fi
    
    eval "$var_name='$input'"
}

# Function to check if AWS CLI is configured
check_aws_cli() {
    local profile=$1
    local profile_flag=""
    
    if ! command -v aws &> /dev/null; then
        print_colored $RED "❌ AWS CLI not found. Please install AWS CLI first."
        exit 1
    fi
    
    if [[ -n "$profile" && "$profile" != "default" ]]; then
        profile_flag="--profile $profile"
    fi
    
    if ! aws sts get-caller-identity $profile_flag &> /dev/null; then
        print_colored $RED "❌ AWS CLI not configured for profile '$profile'. Please run 'aws configure --profile $profile' first."
        exit 1
    fi
    
    print_colored $GREEN "✅ AWS CLI configured for profile: $profile"
}

# Function to create S3 bucket
create_s3_bucket() {
    local bucket_name=$1
    local region=$2
    local profile=$3
    local profile_flag=""
    
    if [[ -n "$profile" && "$profile" != "default" ]]; then
        profile_flag="--profile $profile"
    fi
    
    print_colored $BLUE "🪣 Creating S3 bucket: $bucket_name"
    
    # Check if bucket already exists
    if aws s3api head-bucket --bucket "$bucket_name" --region "$region" $profile_flag 2>/dev/null; then
        print_colored $YELLOW "⚠️  S3 bucket '$bucket_name' already exists"
        return 0
    fi
    
    # Create bucket
    if [[ "$region" == "us-east-1" ]]; then
        aws s3api create-bucket \
            --bucket "$bucket_name" \
            --region "$region" \
            $profile_flag
    else
        aws s3api create-bucket \
            --bucket "$bucket_name" \
            --region "$region" \
            --create-bucket-configuration LocationConstraint="$region" \
            $profile_flag
    fi
    
    # Enable versioning
    aws s3api put-bucket-versioning \
        --bucket "$bucket_name" \
        --versioning-configuration Status=Enabled \
        $profile_flag
    
    # Enable encryption
    aws s3api put-bucket-encryption \
        --bucket "$bucket_name" \
        --server-side-encryption-configuration '{
            "Rules": [
                {
                    "ApplyServerSideEncryptionByDefault": {
                        "SSEAlgorithm": "AES256"
                    },
                    "BucketKeyEnabled": true
                }
            ]
        }' \
        $profile_flag
    
    # Block public access
    aws s3api put-public-access-block \
        --bucket "$bucket_name" \
        --public-access-block-configuration \
            BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true \
        $profile_flag
    
    print_colored $GREEN "✅ S3 bucket created with versioning, encryption, and public access blocked"
}

# Function to create DynamoDB table
create_dynamodb_table() {
    local table_name=$1
    local region=$2
    local profile=$3
    local profile_flag=""
    
    if [[ -n "$profile" && "$profile" != "default" ]]; then
        profile_flag="--profile $profile"
    fi
    
    print_colored $BLUE "🗃️  Creating DynamoDB table: $table_name"
    
    # Check if table already exists
    if aws dynamodb describe-table --table-name "$table_name" --region "$region" $profile_flag 2>/dev/null; then
        print_colored $YELLOW "⚠️  DynamoDB table '$table_name' already exists"
        return 0
    fi
    
    # Create table
    aws dynamodb create-table \
        --table-name "$table_name" \
        --attribute-definitions \
            AttributeName=LockID,AttributeType=S \
        --key-schema \
            AttributeName=LockID,KeyType=HASH \
        --billing-mode PAY_PER_REQUEST \
        --region "$region" \
        $profile_flag
    
    # Wait for table to be active
    print_colored $BLUE "⏳ Waiting for DynamoDB table to be active..."
    aws dynamodb wait table-exists --table-name "$table_name" --region "$region" $profile_flag
    
    print_colored $GREEN "✅ DynamoDB table created successfully"
}

# Function to create backend config template
create_backend_config_template() {
    local bucket_name=$1
    local table_name=$2
    local region=$3
    local aws_account_id=$4
    
    # Generate in terraform directory (parent of scripts)
    local terraform_dir="$(dirname "$(pwd)")"
    local config_file="${terraform_dir}/backend-${aws_account_id}.hcl"
    
    cat > "$config_file" << EOF
# Terraform Backend Configuration for Account: $aws_account_id
# Generated by setup_backend.sh
# This is a template - actual state key will be set by init_backend.sh

bucket         = "$bucket_name"
region         = "$region"
dynamodb_table = "$table_name"
encrypt        = true

# Note: The 'key' parameter is dynamically set based on:
# service/environment/terraform.tfstate
# Examples:
#   myapp/development/terraform.tfstate
#   myapp/pr-123/terraform.tfstate  
#   myapp/production/terraform.tfstate
#   anotherapp/development/terraform.tfstate
EOF

    # Also create a generic backend.hcl that points to this account's config
    local default_backend="${terraform_dir}/backend.hcl"
    if [[ ! -f "$default_backend" ]]; then
        cp "$config_file" "$default_backend"
        print_colored $BLUE "📋 Created default backend.hcl pointing to account $aws_account_id"
    fi

    print_colored $GREEN "✅ Created backend config: $config_file"
    print_colored $BLUE "💡 Use ./scripts/init_backend.sh to initialize with environment-specific keys"
}

# Function to show summary
show_summary() {
    local bucket_name=$1
    local table_name=$2
    local region=$3
    
    print_colored $GREEN "\n🎉 Backend infrastructure setup complete!"
    print_colored $BLUE "==========================================\n"
    
    echo "Shared resources created:"
    echo "  📦 S3 Bucket: $bucket_name"
    echo "  🗃️  DynamoDB Table: $table_name"
    echo "  🌍 Region: $region"
    echo ""
    
    echo "Next steps:"
    echo "1. Initialize for your environment:"
    echo "   ./scripts/init_backend.sh"
    echo ""
    echo "2. Or specify environment directly:"
    echo "   ./scripts/init_backend.sh -e development -s myapp"
    echo "   ./scripts/init_backend.sh -e pr-123 -s myapp"
    echo ""
    echo "3. For multi-account setups, run this script in each account:"
    echo "   # In dev account (123456789012):"
    echo "   ./scripts/setup_backend.sh  # Creates backend-123456789012.hcl"
    echo "   # In prod account (345678901234):"
    echo "   ./scripts/setup_backend.sh  # Creates backend-345678901234.hcl"
    echo ""
    
    print_colored $GREEN "✅ These resources support ALL environments (development, staging, production, PR apps)"
    print_colored $YELLOW "⚠️  Keep backend.hcl secure - it contains your backend configuration"
}

# Main function
main() {
    # Check if we're in the scripts directory
    if [[ ! -f "setup_backend.sh" ]]; then
        print_colored $RED "❌ Please run this script from the terraform/scripts directory"
        exit 1
    fi
    
    print_colored $BLUE "🚀 Terraform S3 Backend Infrastructure Setup"
    print_colored $BLUE "============================================\n"
    
    # Get configuration from user
    local aws_profile=""
    local service_name=""
    
    get_input "Service name" "myapp" service_name
    get_input "AWS profile" "default" aws_profile
    
    # Check AWS CLI with profile
    check_aws_cli "$aws_profile"
    
    local profile_flag=""
    if [[ -n "$aws_profile" && "$aws_profile" != "default" ]]; then
        profile_flag="--profile $aws_profile"
    fi
    
    # Get AWS account info
    local aws_account_id=$(aws sts get-caller-identity $profile_flag --query Account --output text)
    local aws_region=$(aws configure get region $profile_flag || echo "us-east-1")
    
    print_colored $BLUE "📋 Current AWS Configuration:"
    echo "  Profile: $aws_profile"
    echo "  Account ID: $aws_account_id"
    echo "  Region: $aws_region"
    echo ""
    
    # Generate standard names based on service and account
    local bucket_name="${aws_account_id}-${service_name}-terraform-state"
    local table_name="${service_name}-terraform-state-lock"
    local region="$aws_region"
    
    print_colored $BLUE "📝 Generated Backend Configuration:"
    echo "  Service: $service_name"
    echo "  S3 Bucket: $bucket_name"
    echo "  DynamoDB Table: $table_name"
    echo "  Region: $region"
    echo ""
    
    # Show what environments will use this backend
    print_colored $YELLOW "🔍 Checking environments.json for environments using account $aws_account_id:"
    local config_file="../../.github/environments.json"
    if [[ -f "$config_file" ]]; then
        # Find environments that match this account ID
        local matching_envs=$(jq -r --arg account_id "$aws_account_id" '
            (.environments // {}) as $envs |
            (.patterns // {}) as $patterns |
            (.defaults // {}) as $defaults |
            [
                ($envs | to_entries[] | select(.value.account_id == $account_id) | .key),
                ($patterns | to_entries[] | select(.value.account_id == $account_id) | .key)
            ] | .[]
        ' "$config_file" 2>/dev/null | sort -u)
        
        if [[ -n "$matching_envs" ]]; then
            echo "  Environments using this backend:"
            echo "$matching_envs" | while read env; do
                echo "    - $env"
            done
        else
            print_colored $YELLOW "  ⚠️  No environments found in environments.json for account $aws_account_id"
            print_colored $YELLOW "  💡 You may need to update .github/environments.json"
        fi
    else
        print_colored $YELLOW "  ⚠️  environments.json not found at $config_file"
    fi
    echo ""
    
    print_colored $BLUE "💡 This backend will support all environments in account $aws_account_id"
    echo -n "Proceed with creation? (y/N): "
    read confirm
    
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        print_colored $YELLOW "❌ Setup cancelled"
        exit 0
    fi
    
    echo ""
    
    # Create resources
    create_s3_bucket "$bucket_name" "$region" "$aws_profile"
    create_dynamodb_table "$table_name" "$region" "$aws_profile"
    create_backend_config_template "$bucket_name" "$table_name" "$region" "$aws_account_id"
    
    # Show summary
    show_summary "$bucket_name" "$table_name" "$region"
}

# Run main function
main "$@"