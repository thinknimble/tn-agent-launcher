"""
Management command to test Lambda-based agent execution
Creates a test agent instance and task, then executes it via Lambda
"""

import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from tn_agent_launcher.agent.models import AgentInstance, AgentTask
from tn_agent_launcher.agent.tasks import schedule_agent_task_execution

logger = logging.getLogger(__name__)
User = get_user_model()


class Command(BaseCommand):
    help = "Test Lambda-based agent execution with a one-shot task"

    def add_arguments(self, parser):
        parser.add_argument(
            "--provider",
            type=str,
            default="BEDROCK",
            choices=["BEDROCK", "OPENAI", "ANTHROPIC", "GEMINI", "OLLAMA"],
            help="AI provider to use for the test",
        )
        parser.add_argument(
            "--email",
            type=str,
            default="admin@thinknimble.com",
            help="Email of the user to create the agent for",
        )
        parser.add_argument(
            "--prompt",
            type=str,
            default="What is 2+2? Answer in one word.",
            help="Prompt to send to the agent",
        )
        parser.add_argument(
            "--validate",
            action="store_true",
            help="Run validation tests for Lambda configuration",
        )
        parser.add_argument(
            "--check-config",
            action="store_true",
            help="Only check configuration without running tests",
        )

    def handle(self, *args, **options):
        provider = options["provider"]
        email = options["email"]
        prompt = options["prompt"]
        validate = options["validate"]
        check_config_only = options["check_config"]

        self.stdout.write(self.style.NOTICE(f"\n{'=' * 60}"))
        self.stdout.write(self.style.NOTICE("Lambda Agent Test"))
        self.stdout.write(self.style.NOTICE(f"{'=' * 60}\n"))

        # Configuration check
        if check_config_only or validate:
            if not self._check_configuration():
                return

            if check_config_only:
                return

        # Run validation tests if requested
        if validate:
            self._run_validation_tests(email)
            return

        # Get or create user
        try:
            user = User.objects.get(email=email)
            self.stdout.write(f"Using existing user: {email}")
        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f"User {email} not found. Please create a user first.")
            )
            return

        # Create or get agent instance
        agent_name = f"Test {provider} Agent (Lambda)"

        # Model configurations for each provider
        model_configs = {
            "BEDROCK": {
                "model_name": "us.anthropic.claude-3-7-sonnet-20250219-v1:0",
                "api_key": "",  # Bedrock uses IAM auth
                "target_url": None,
            },
            "OPENAI": {
                "model_name": "gpt-4",
                "api_key": input("Enter OpenAI API key: ") if provider == "OPENAI" else "",
                "target_url": None,
            },
            "ANTHROPIC": {
                "model_name": "claude-3-opus-20240229",
                "api_key": input("Enter Anthropic API key: ") if provider == "ANTHROPIC" else "",
                "target_url": None,
            },
            "GEMINI": {
                "model_name": "gemini-pro",
                "api_key": input("Enter Gemini API key: ") if provider == "GEMINI" else "",
                "target_url": None,
            },
            "OLLAMA": {
                "model_name": "llama2",
                "api_key": "",
                "target_url": "http://localhost:11434",
            },
        }

        config = model_configs[provider]

        # Set use_lambda for Bedrock provider or if Lambda is enabled globally
        use_lambda = provider == "BEDROCK" or settings.USE_LAMBDA_FOR_AGENT_EXECUTION

        agent, created = AgentInstance.objects.get_or_create(
            friendly_name=agent_name,
            user=user,
            defaults={
                "provider": provider,
                "model_name": config["model_name"],
                "api_key": config["api_key"],
                "target_url": config["target_url"],
                "agent_type": AgentInstance.AgentTypeChoices.ONE_SHOT,
                "use_lambda": use_lambda,
            },
        )

        if created:
            self.stdout.write(self.style.SUCCESS(f"✓ Created agent: {agent_name}"))
        else:
            # Update existing agent with new config
            agent.provider = provider
            agent.model_name = config["model_name"]
            agent.api_key = config["api_key"]
            agent.target_url = config["target_url"]
            agent.use_lambda = use_lambda
            agent.save()
            self.stdout.write(f"✓ Using existing agent: {agent_name}")

        self.stdout.write(f"  Provider: {agent.provider}")
        self.stdout.write(f"  Model: {agent.model_name}")
        self.stdout.write(f"  Type: {agent.agent_type}")
        self.stdout.write(f"  Use Lambda: {agent.use_lambda}")

        # Create a one-shot task
        task_name = f"Test Lambda Task - {provider}"

        task, created = AgentTask.objects.get_or_create(
            name=task_name,
            agent_instance=agent,
            defaults={
                "description": f"Test task for Lambda execution with {provider}",
                "instruction": prompt,
                "schedule_type": AgentTask.ScheduleTypeChoices.ONCE,
                "status": AgentTask.StatusChoices.ACTIVE,
            },
        )

        if created:
            self.stdout.write(self.style.SUCCESS(f"\n✓ Created task: {task_name}"))
        else:
            # Update instruction for existing task
            task.instruction = prompt
            task.status = AgentTask.StatusChoices.ACTIVE
            task.save()
            self.stdout.write(f"\n✓ Using existing task: {task_name}")

        self.stdout.write(f"  Instruction: {task.instruction}")
        self.stdout.write(f"  Schedule: {task.schedule_type}")

        # Schedule immediate execution
        self.stdout.write(self.style.NOTICE("\n📡 Scheduling Lambda execution..."))

        try:
            execution = schedule_agent_task_execution(agent_task_id=task.id, force_execute=True)

            if execution:
                self.stdout.write(self.style.SUCCESS("✓ Task scheduled for execution"))
                self.stdout.write(f"  Execution ID: {execution.id}")
                self.stdout.write(f"  Status: {execution.status}")

                # Wait a moment for execution to start
                import time

                self.stdout.write("\n⏳ Waiting for Lambda execution...")
                time.sleep(5)

                # Refresh execution status
                execution.refresh_from_db()

                if execution.status == "completed":
                    self.stdout.write(self.style.SUCCESS("\n✅ Execution completed!"))
                    if execution.output_data:
                        self.stdout.write(
                            f"  Response: {execution.output_data.get('result', 'No result')}"
                        )
                    self.stdout.write(f"  Execution time: {execution.execution_time_seconds:.2f}s")
                elif execution.status == "failed":
                    self.stdout.write(self.style.ERROR("\n❌ Execution failed!"))
                    self.stdout.write(f"  Error: {execution.error_message}")
                else:
                    self.stdout.write(
                        self.style.WARNING(f"\n⚠️ Execution status: {execution.status}")
                    )
                    self.stdout.write("  Check Django logs or background tasks for details")

            else:
                self.stdout.write(self.style.ERROR("Failed to schedule task execution"))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"\n❌ Error: {str(e)}"))
            logger.exception("Error during Lambda test")

        self.stdout.write(self.style.NOTICE(f"\n{'=' * 60}"))
        self.stdout.write(self.style.NOTICE("Test Complete"))
        self.stdout.write(self.style.NOTICE(f"{'=' * 60}\n"))

    def _check_configuration(self):
        """Check Lambda configuration"""
        self.stdout.write("\n📋 Configuration Check:")
        self.stdout.write("-" * 40)

        lambda_enabled = settings.USE_LAMBDA_FOR_AGENT_EXECUTION
        self.stdout.write(f"✓ USE_LAMBDA_FOR_AGENT_EXECUTION: {lambda_enabled}")

        if not lambda_enabled:
            self.stdout.write(
                self.style.ERROR(
                    "❌ Lambda is not enabled. Please set USE_LAMBDA_FOR_AGENT_EXECUTION=True"
                )
            )
            return False

        self.stdout.write(f"✓ AWS_LAMBDA_REGION: {settings.AWS_LAMBDA_REGION}")
        self.stdout.write(f"✓ LAMBDA_AGENT_FUNCTION_NAME: {settings.LAMBDA_AGENT_FUNCTION_NAME}")
        self.stdout.write(f"✓ BEDROCK_MODEL_ID: {settings.BEDROCK_MODEL_ID}")

        has_credentials = bool(settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY)
        self.stdout.write(f"✓ AWS Credentials configured: {has_credentials}")

        if not has_credentials:
            self.stdout.write(
                self.style.ERROR(
                    "❌ AWS credentials not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY"
                )
            )
            return False

        self.stdout.write(self.style.SUCCESS("\n✅ Configuration check passed!\n"))
        return True

    def _run_validation_tests(self, email):
        """Run validation tests for Lambda configuration"""
        from django.core.exceptions import ValidationError

        self.stdout.write("\n🧪 Running Validation Tests:")
        self.stdout.write("-" * 40)

        # Get or create test user
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "is_staff": True,
                "is_superuser": True,
                "first_name": "Lambda",
                "last_name": "Test",
            },
        )

        if created:
            self.stdout.write(f"✓ Created test user: {email}")
        else:
            self.stdout.write(f"✓ Using existing user: {email}")

        # Test 1: BEDROCK without use_lambda should fail
        self.stdout.write("\n1. Testing BEDROCK provider without use_lambda (should fail):")
        try:
            invalid_agent = AgentInstance(
                friendly_name="Invalid Bedrock Agent",
                provider=AgentInstance.ProviderChoices.BEDROCK,
                model_name=settings.BEDROCK_MODEL_ID
                or "us.anthropic.claude-3-7-sonnet-20250219-v1:0",
                api_key="",
                agent_type=AgentInstance.AgentTypeChoices.ONE_SHOT,
                use_lambda=False,  # This should fail
                user=user,
            )
            invalid_agent.full_clean()
            self.stdout.write(self.style.ERROR("   ❌ FAILED: Should have raised ValidationError"))
        except ValidationError as e:
            self.stdout.write(self.style.SUCCESS(f"   ✓ Correctly raised error: {e}"))

        # Test 2: BEDROCK with use_lambda=True should work
        self.stdout.write("\n2. Testing BEDROCK provider with use_lambda=True:")
        try:
            valid_agent = AgentInstance(
                friendly_name="Valid Bedrock Agent",
                provider=AgentInstance.ProviderChoices.BEDROCK,
                model_name=settings.BEDROCK_MODEL_ID
                or "us.anthropic.claude-3-7-sonnet-20250219-v1:0",
                api_key="",  # Bedrock uses IAM
                agent_type=AgentInstance.AgentTypeChoices.ONE_SHOT,
                use_lambda=True,
                user=user,
            )
            valid_agent.full_clean()
            self.stdout.write(
                self.style.SUCCESS("   ✓ Validation passed for BEDROCK with use_lambda=True")
            )
        except ValidationError as e:
            self.stdout.write(self.style.ERROR(f"   ❌ FAILED: {e}"))

        # Test 3: Non-BEDROCK without API key should fail
        self.stdout.write("\n3. Testing OpenAI provider without API key (should fail):")
        try:
            invalid_openai = AgentInstance(
                friendly_name="Invalid OpenAI Agent",
                provider=AgentInstance.ProviderChoices.OPENAI,
                model_name="gpt-4",
                api_key="",  # This should fail for non-BEDROCK
                agent_type=AgentInstance.AgentTypeChoices.ONE_SHOT,
                use_lambda=False,
                user=user,
            )
            invalid_openai.full_clean()
            self.stdout.write(self.style.ERROR("   ❌ FAILED: Should have raised ValidationError"))
        except ValidationError as e:
            self.stdout.write(self.style.SUCCESS(f"   ✓ Correctly raised error: {e}"))

        # Test 4: OpenAI with use_lambda (optional) should work
        self.stdout.write("\n4. Testing OpenAI provider with use_lambda=True (optional):")
        try:
            openai_lambda = AgentInstance(
                friendly_name="OpenAI Lambda Agent",
                provider=AgentInstance.ProviderChoices.OPENAI,
                model_name="gpt-4",
                api_key="test-key",
                agent_type=AgentInstance.AgentTypeChoices.ONE_SHOT,
                use_lambda=True,  # Optional for non-BEDROCK
                user=user,
            )
            openai_lambda.full_clean()
            self.stdout.write(
                self.style.SUCCESS("   ✓ Validation passed for OpenAI with use_lambda=True")
            )
        except ValidationError as e:
            self.stdout.write(self.style.ERROR(f"   ❌ FAILED: {e}"))

        self.stdout.write(self.style.SUCCESS("\n✅ All validation tests completed!"))
