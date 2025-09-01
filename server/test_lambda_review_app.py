#!/usr/bin/env python
"""
Test script for Lambda/Bedrock functionality on Heroku review app
Deploy this script and run it via Heroku CLI:

    heroku run python test_lambda_review_app.py --app your-review-app-name

Or run locally against review app database:
    DATABASE_URL=your-review-app-database-url python test_lambda_review_app.py
"""

import os
import sys
import time

import django

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "tn_agent_launcher.settings")
django.setup()

from django.conf import settings  # noqa: E402
from django.contrib.auth import get_user_model  # noqa: E402
from django.core.exceptions import ValidationError  # noqa: E402
from tn_agent_launcher.agent.models import (  # noqa: E402
    AgentInstance,
    AgentTask,
    AgentTaskExecution,
)
from tn_agent_launcher.agent.tasks import schedule_agent_task_execution  # noqa: E402

User = get_user_model()


def run_lambda_test():
    """Test Lambda execution with Bedrock on review app"""
    print("\n" + "=" * 60)
    print("🚀 Lambda/Bedrock Integration Test")
    print("=" * 60)

    # 1. Check configuration
    print("\n📋 Configuration Check:")
    print("-" * 40)

    lambda_enabled = settings.USE_LAMBDA_FOR_AGENT_EXECUTION
    print(f"✓ USE_LAMBDA_FOR_AGENT_EXECUTION: {lambda_enabled}")

    if not lambda_enabled:
        print("❌ Lambda is not enabled. Please set USE_LAMBDA_FOR_AGENT_EXECUTION=True")
        return False

    print(f"✓ AWS_LAMBDA_REGION: {settings.AWS_LAMBDA_REGION}")
    print(f"✓ LAMBDA_AGENT_FUNCTION_NAME: {settings.LAMBDA_AGENT_FUNCTION_NAME}")
    print(f"✓ BEDROCK_MODEL_ID: {settings.BEDROCK_MODEL_ID}")

    has_credentials = bool(settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY)
    print(f"✓ AWS Credentials configured: {has_credentials}")

    if not has_credentials:
        print(
            "❌ AWS credentials not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY"
        )
        return False

    # 2. Create test user
    print("\n👤 User Setup:")
    print("-" * 40)

    test_email = "lambda-test@example.com"
    user, created = User.objects.get_or_create(
        email=test_email,
        defaults={
            "is_staff": True,
            "is_superuser": True,
            "first_name": "Lambda",
            "last_name": "Test",
        },
    )

    if created:
        print(f"✓ Created test user: {test_email}")
    else:
        print(f"✓ Using existing user: {test_email}")

    # 3. Test validation - BEDROCK without use_lambda should fail
    print("\n🧪 Validation Tests:")
    print("-" * 40)

    try:
        invalid_agent = AgentInstance(
            friendly_name="Invalid Bedrock Agent",
            provider=AgentInstance.ProviderChoices.BEDROCK,
            model_name=settings.BEDROCK_MODEL_ID,
            api_key="",
            agent_type=AgentInstance.AgentTypeChoices.ONE_SHOT,
            use_lambda=False,  # This should fail
            user=user,
        )
        invalid_agent.full_clean()
        print("❌ Validation should have failed for BEDROCK without use_lambda")
        return False
    except ValidationError:
        print("✓ Correctly rejected BEDROCK without use_lambda")

    # 4. Create valid Bedrock agent
    print("\n🤖 Agent Creation:")
    print("-" * 40)

    agent, created = AgentInstance.objects.get_or_create(
        friendly_name="Review App Bedrock Test Agent",
        user=user,
        defaults={
            "provider": AgentInstance.ProviderChoices.BEDROCK,
            "model_name": settings.BEDROCK_MODEL_ID,
            "api_key": "",  # Bedrock uses IAM
            "agent_type": AgentInstance.AgentTypeChoices.ONE_SHOT,
            "use_lambda": True,
        },
    )

    if created:
        print(f"✓ Created agent: {agent.friendly_name}")
    else:
        # Update to ensure correct settings
        agent.provider = AgentInstance.ProviderChoices.BEDROCK
        agent.model_name = settings.BEDROCK_MODEL_ID
        agent.use_lambda = True
        agent.save()
        print(f"✓ Updated agent: {agent.friendly_name}")

    print(f"  Provider: {agent.provider}")
    print(f"  Model: {agent.model_name}")
    print(f"  Lambda enabled: {agent.use_lambda}")

    # 5. Create and execute task
    print("\n📝 Task Creation:")
    print("-" * 40)

    task, created = AgentTask.objects.get_or_create(
        name="Review App Lambda Test Task",
        agent_instance=agent,
        defaults={
            "description": "Test task for Lambda/Bedrock on review app",
            "instruction": "What is the capital of France? Answer in one word.",
            "schedule_type": AgentTask.ScheduleTypeChoices.ONCE,
            "status": AgentTask.StatusChoices.ACTIVE,
        },
    )

    if created:
        print(f"✓ Created task: {task.name}")
    else:
        task.instruction = "What is the capital of France? Answer in one word."
        task.status = AgentTask.StatusChoices.ACTIVE
        task.save()
        print(f"✓ Updated task: {task.name}")

    print(f"  Instruction: {task.instruction}")

    # 6. Schedule execution
    print("\n⚡ Execution:")
    print("-" * 40)

    print("Scheduling Lambda execution...")
    execution = schedule_agent_task_execution(agent_task_id=task.id, force_execute=True)

    if not execution:
        print("❌ Failed to schedule execution")
        return False

    print(f"✓ Execution scheduled (ID: {execution.id})")

    # 7. Wait for completion (max 30 seconds)
    print("\n⏳ Waiting for Lambda response...")

    max_wait = 30
    poll_interval = 2
    elapsed = 0

    while elapsed < max_wait:
        execution.refresh_from_db()

        if execution.status == AgentTaskExecution.StatusChoices.COMPLETED:
            print("\n✅ SUCCESS! Lambda execution completed")
            print(f"  Response: {execution.output_data.get('result', 'No result')}")
            print(f"  Execution time: {execution.execution_time_seconds:.2f} seconds")

            # Verify the answer
            result = execution.output_data.get("result", "").lower()
            if "paris" in result:
                print("  ✓ Correct answer!")

            return True

        elif execution.status == AgentTaskExecution.StatusChoices.FAILED:
            print("\n❌ Execution failed!")
            print(f"  Error: {execution.error_message}")
            return False

        print(f"  Status: {execution.status} (waited {elapsed}s)...")
        time.sleep(poll_interval)
        elapsed += poll_interval

    print(f"\n⚠️  Timeout after {max_wait} seconds")
    print(f"  Final status: {execution.status}")
    return False


def cleanup_test_data():
    """Optional: Clean up test data"""
    print("\n🧹 Cleanup (optional):")
    print("-" * 40)

    # You can uncomment these to clean up after testing
    # User.objects.filter(email="lambda-test@example.com").delete()
    # AgentInstance.objects.filter(friendly_name="Review App Bedrock Test Agent").delete()
    # AgentTask.objects.filter(name="Review App Lambda Test Task").delete()

    print("Test data retained for debugging")


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("Lambda/Bedrock Review App Test Script")
    print("=" * 60)

    try:
        success = run_lambda_test()

        if success:
            print("\n" + "=" * 60)
            print("✅ All tests passed successfully!")
            print("Lambda/Bedrock integration is working on review app")
            print("=" * 60)
            sys.exit(0)
        else:
            print("\n" + "=" * 60)
            print("❌ Test failed - check the output above")
            print("=" * 60)
            sys.exit(1)

    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)
    finally:
        cleanup_test_data()
