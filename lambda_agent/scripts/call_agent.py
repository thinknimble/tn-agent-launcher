#!/usr/bin/env python3
"""
Call the Bedrock Agent Lambda with IAM authentication using AWS Signature V4
"""

import argparse
import json
import os
from pathlib import Path

import boto3
import requests
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest
from dotenv import load_dotenv

# Load environment variables from .env file
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)


def call_agent_with_iam(prompt, profile_name="default", region="us-east-1"):
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
        "https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/Prod/agent",
    )

    if "YOUR_API_ID" in api_url:
        print("❌ Error: Please set BEDROCK_AGENT_API_URL environment variable")
        print("   or update the api_url in this script with your actual API Gateway URL")
        print("   You can find it in the SAM deployment output")
        return None

    # Prepare the request body
    body = {"prompt": prompt, "max_tokens": 500, "temperature": 0.7}

    # Create a session with the specified profile
    session = boto3.Session(profile_name=profile_name)
    credentials = session.get_credentials()

    # Create the request
    request = AWSRequest(
        method="POST",
        url=api_url,
        data=json.dumps(body),
        headers={
            "Content-Type": "application/json",
            "Host": api_url.split("/")[2],  # Extract host from URL
        },
    )

    # Sign the request with SigV4
    SigV4Auth(credentials, "execute-api", region).add_auth(request)

    # Send the request
    response = requests.post(api_url, data=request.data, headers=dict(request.headers))

    return response


def main():
    # Parse command line arguments
    parser = argparse.ArgumentParser(
        description="Call the Bedrock Agent Lambda with IAM authentication"
    )
    parser.add_argument(
        "prompt", nargs="*", help="The prompt to send to the agent", default=["What", "is", "2+2?"]
    )
    parser.add_argument(
        "--profile", "-p", default="default", help="AWS profile name (default: 'default')"
    )
    parser.add_argument(
        "--region", "-r", default="us-east-1", help="AWS region (default: 'us-east-1')"
    )

    args = parser.parse_args()

    # Join prompt words if provided as separate arguments
    prompt = " ".join(args.prompt) if args.prompt else "What is 2+2?"

    print(f"🤖 Sending prompt: {prompt}")
    print(f"📍 Using AWS profile: {args.profile}")
    print("-" * 50)

    try:
        response = call_agent_with_iam(prompt, profile_name=args.profile, region=args.region)

        if response is None:
            return

        if response.status_code == 200:
            data = response.json()
            print("✅ Success!")
            print(f"Response: {data.get('response', 'No response field')}")
            if "metadata" in data:
                print(f"Metadata: {json.dumps(data['metadata'], indent=2)}")
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"Response: {response.text}")

    except Exception as e:
        print(f"❌ Failed to call agent: {e}")


if __name__ == "__main__":
    main()
