#!/usr/bin/env python3
"""
Call the Bedrock Agent Lambda with IAM authentication using AWS Signature V4
"""
import json
import os
import sys
from pathlib import Path

# Load environment variables from .env file
from dotenv import load_dotenv
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

import boto3
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest
import requests


def call_agent_with_iam(prompt, profile_name="william-tn-staging", region="us-east-1"):
    """
    Call the agent endpoint with IAM authentication
    
    Args:
        prompt: The prompt to send to the agent
        profile_name: AWS profile to use for authentication
        region: AWS region
    """
    # API endpoint - replace with your API Gateway URL
    # You can find this in the CloudFormation stack outputs or SAM deploy output
    api_url = os.environ.get(
        "BEDROCK_AGENT_API_URL",
        "https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/Prod/agent"
    )
    
    if "YOUR_API_ID" in api_url:
        print("❌ Error: Please set BEDROCK_AGENT_API_URL environment variable")
        print("   or update the api_url in this script with your actual API Gateway URL")
        print("   You can find it in the SAM deployment output")
        return None
    
    # Prepare the request body
    body = {
        "prompt": prompt,
        "max_tokens": 500,
        "temperature": 0.7
    }
    
    # Create a session with the specified profile
    session = boto3.Session(profile_name=profile_name)
    credentials = session.get_credentials()
    
    # Create the request
    request = AWSRequest(
        method='POST',
        url=api_url,
        data=json.dumps(body),
        headers={
            'Content-Type': 'application/json',
            'Host': api_url.split('/')[2]  # Extract host from URL
        }
    )
    
    # Sign the request with SigV4
    SigV4Auth(credentials, 'execute-api', region).add_auth(request)
    
    # Send the request
    response = requests.post(
        api_url,
        data=request.data,
        headers=dict(request.headers)
    )
    
    return response


def main():
    # Get prompt from command line or use default
    prompt = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else "What is 2+2?"
    
    print(f"🤖 Sending prompt: {prompt}")
    print("-" * 50)
    
    try:
        response = call_agent_with_iam(prompt)
        
        if response is None:
            return
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Success!")
            print(f"Response: {data.get('response', 'No response field')}")
            if 'metadata' in data:
                print(f"Metadata: {json.dumps(data['metadata'], indent=2)}")
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Failed to call agent: {e}")


if __name__ == "__main__":
    main()