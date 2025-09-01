"""
Management command to test Lambda-based agent execution
Creates a test agent instance and task, then executes it via Lambda
"""

import logging

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

    def handle(self, *args, **options):
        provider = options["provider"]
        email = options["email"]
        prompt = options["prompt"]

        self.stdout.write(self.style.NOTICE(f"\n{'='*60}"))
        self.stdout.write(self.style.NOTICE("Lambda Agent Test"))
        self.stdout.write(self.style.NOTICE(f"{'='*60}\n"))

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

        agent, created = AgentInstance.objects.get_or_create(
            friendly_name=agent_name,
            user=user,
            defaults={
                "provider": provider,
                "model_name": config["model_name"],
                "api_key": config["api_key"],
                "target_url": config["target_url"],
                "agent_type": AgentInstance.AgentTypeChoices.ONE_SHOT,
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
            agent.save()
            self.stdout.write(f"✓ Using existing agent: {agent_name}")

        self.stdout.write(f"  Provider: {agent.provider}")
        self.stdout.write(f"  Model: {agent.model_name}")
        self.stdout.write(f"  Type: {agent.agent_type}")

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

        self.stdout.write(self.style.NOTICE(f"\n{'='*60}"))
        self.stdout.write(self.style.NOTICE("Test Complete"))
        self.stdout.write(self.style.NOTICE(f"{'='*60}\n"))
