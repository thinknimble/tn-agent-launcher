#!/usr/bin/env python3
"""List available Bedrock models"""

import boto3

session = boto3.Session(profile_name="william-tn-staging", region_name="us-east-1")
bedrock = session.client("bedrock")

try:
    response = bedrock.list_foundation_models()

    print("Available Claude models in us-east-1:")
    print("-" * 60)

    claude_models = []
    for model in response.get("modelSummaries", []):
        if "claude" in model["modelId"].lower():
            claude_models.append(
                {
                    "id": model["modelId"],
                    "name": model.get("modelName", "N/A"),
                    "provider": model.get("providerName", "N/A"),
                    "input_modalities": model.get("inputModalities", []),
                    "output_modalities": model.get("outputModalities", []),
                }
            )

    for model in sorted(claude_models, key=lambda x: x["id"]):
        print(f"\n📦 Model ID: {model['id']}")
        print(f"   Name: {model['name']}")
        print(f"   Provider: {model['provider']}")
        print(f"   Input: {', '.join(model['input_modalities'])}")
        print(f"   Output: {', '.join(model['output_modalities'])}")

except Exception as e:
    print(f"Error: {e}")
    print("\nTrying bedrock-runtime client...")

    # Try with bedrock-runtime
    bedrock_runtime = session.client("bedrock-runtime")

    # Common model IDs to test
    test_models = [
        "anthropic.claude-3-5-sonnet-20240620-v1:0",
        "anthropic.claude-3-5-sonnet-20241022-v2:0",
        "anthropic.claude-3-sonnet-20240229-v1:0",
        "anthropic.claude-3-haiku-20240307-v1:0",
        "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
    ]

    print("\nTesting model IDs for Converse API:")
    print("-" * 60)

    for model_id in test_models:
        try:
            # Try a minimal converse call to test if model is valid
            response = bedrock_runtime.converse(
                modelId=model_id,
                messages=[{"role": "user", "content": [{"text": "Hi"}]}],
                inferenceConfig={"maxTokens": 10},
            )
            print(f"✅ {model_id} - VALID")
        except Exception as e:
            error_msg = str(e)
            if "ValidationException" in error_msg:
                print(f"❌ {model_id} - INVALID")
            elif "AccessDeniedException" in error_msg:
                print(f"🔒 {model_id} - Access Denied (may need to enable in Bedrock console)")
            else:
                print(f"⚠️  {model_id} - Error: {error_msg[:50]}...")
