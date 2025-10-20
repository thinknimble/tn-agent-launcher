from django.db import models
from django.utils import timezone
from encrypted_model_fields.fields import EncryptedTextField
from pydantic_ai import Agent

from tn_agent_launcher.common.models import AbstractBaseModel


class AgentInstance(AbstractBaseModel):
    class ProviderChoices(models.TextChoices):
        GEMINI = "GEMINI", "Google Gemini"
        OPENAI = "OPENAI", "OpenAI"
        OLLAMA = "OLLAMA", "Ollama"
        ANTHROPIC = "ANTHROPIC", "Anthropic"
        BEDROCK = "BEDROCK", "AWS Bedrock"

    class AgentTypeChoices(models.TextChoices):
        CHAT = "chat", "Chat"
        ONE_SHOT = "one-shot", "One-Shot"

        @property
        def description(self):
            descriptions = {
                self.CHAT: "A conversational agent that can engage in multi-turn dialogues.",
                self.ONE_SHOT: "An agent designed for single-turn interactions or tasks, not maintaining context or history.",
            }
            return descriptions.get(self.value, "No description available.")

    friendly_name = models.CharField(max_length=255)
    provider = models.CharField(max_length=50, choices=ProviderChoices.choices)
    model_name = models.CharField(max_length=100)
    api_key = EncryptedTextField(blank=True, default="")
    target_url = models.URLField(
        null=True, blank=True, help_text="Optional base URL for the model API, if applicable"
    )
    agent_type = models.CharField(
        max_length=50,
        default=AgentTypeChoices.CHAT,
        choices=AgentTypeChoices.choices,
        help_text="Type of agent, e.g., 'chat', 'one-shot', etc.",
    )
    use_lambda = models.BooleanField(
        default=False,
        help_text="Execute this agent using AWS Lambda (admin only). Auto-enabled for Bedrock providers.",
    )
    user = models.ForeignKey("core.User", on_delete=models.CASCADE, related_name="agent_instances")
    instruction = models.TextField(help_text="The prompt/instruction to send to the agent")

    def __str__(self):
        return self.friendly_name

    class Meta:
        ordering = ["friendly_name"]

    def clean(self):
        from django.core.exceptions import ValidationError

        errors = {}

        # Validate that BEDROCK provider requires use_lambda
        if self.provider == self.ProviderChoices.BEDROCK and not self.use_lambda:
            errors["use_lambda"] = "Lambda execution must be enabled for Bedrock providers."

        # Validate that non-BEDROCK providers require an API key
        if self.provider != self.ProviderChoices.BEDROCK and not self.api_key:
            errors["api_key"] = f"API key is required for {self.get_provider_display()} provider."

        # Validate that use_lambda requires Lambda to be enabled globally
        from django.conf import settings

        if self.use_lambda and not settings.USE_LAMBDA_FOR_AGENT_EXECUTION:
            errors["use_lambda"] = (
                "Lambda execution is not enabled globally. Please configure AWS Lambda settings."
            )

        if errors:
            raise ValidationError(errors)

        super().clean()

    @property
    def raw_agent(self):
        from .agent import create_agent

        return create_agent(self.provider, self.model_name, self.api_key, self.target_url)

    async def agent(self):
        from tn_agent_launcher.agent.tools import AgentDependencies, get_agent_tools
        from tn_agent_launcher.chat.models import PromptTemplate

        system_prompt = await PromptTemplate.objects.aget_assembled_prompt(agent_instance=self.id)

        # Get dependencies and tools
        deps, tools = get_agent_tools(user_id=str(self.user_id))

        return Agent(
            name=self.friendly_name,
            model=self.raw_agent,
            output_type=str,
            system_prompt=system_prompt,
            tools=tools,
            deps_type=AgentDependencies,
        )


class AgentProject(AbstractBaseModel):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    agent_instances = models.ManyToManyField(AgentInstance, related_name="projects")
    user = models.ForeignKey("core.User", on_delete=models.CASCADE, related_name="agent_projects")

    class Meta:
        ordering = ["title"]

    def __str__(self):
        return self.title


class AgentTask(AbstractBaseModel):
    class ScheduleTypeChoices(models.TextChoices):
        ONCE = "once", "Run Once"  # Deprecated, use MANUAL instead
        MANUAL = "manual", "Manual"
        DAILY = "daily", "Daily"
        WEEKLY = "weekly", "Weekly"
        MONTHLY = "monthly", "Monthly"
        HOURLY = "hourly", "Hourly"
        CUSTOM_INTERVAL = "custom_interval", "Custom Interval"
        AGENT = "agent", "Agent Execution"

    class StatusChoices(models.TextChoices):
        ACTIVE = "active", "Active"
        PAUSED = "paused", "Paused"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    agent_instance = models.ForeignKey(
        AgentInstance,
        on_delete=models.CASCADE,
        related_name="agent_tasks",
        limit_choices_to={"agent_type": AgentInstance.AgentTypeChoices.ONE_SHOT},
    )
    instruction = models.TextField(help_text="The prompt/instruction to send to the agent")

    # Input sources
    input_sources = models.JSONField(
        default=list,
        blank=True,
        help_text="List of input source objects with metadata (url, source_type, etc.)",
    )

    schedule_type = models.CharField(max_length=20, choices=ScheduleTypeChoices.choices)
    scheduled_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="For one-time tasks, when to run. For recurring tasks, when to start.",
    )
    interval_minutes = models.PositiveIntegerField(
        null=True, blank=True, help_text="For custom intervals, how many minutes between executions"
    )

    status = models.CharField(
        max_length=20, choices=StatusChoices.choices, default=StatusChoices.ACTIVE
    )

    last_executed_at = models.DateTimeField(null=True, blank=True)
    next_execution_at = models.DateTimeField(null=True, blank=True)

    max_executions = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Maximum number of times to execute this task. Leave blank for unlimited.",
    )
    execution_count = models.PositiveIntegerField(default=0)

    # For AGENT schedule type - which agent task triggers this task
    triggered_by_task = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="triggers_tasks",
        help_text="Agent task that triggers this task (for AGENT schedule type)",
    )

    class Meta:
        ordering = ["-created"]

    def __str__(self):
        return f"{self.name} ({self.agent_instance.friendly_name})"

    def save(self, *args, **kwargs):
        if self.pk is None:
            self._set_next_execution()
        else:
            # Handle state transitions for existing tasks
            self._handle_state_transitions()
        super().save(*args, **kwargs)

    def _set_next_execution(self):
        if self.schedule_type in [self.ScheduleTypeChoices.ONCE, self.ScheduleTypeChoices.MANUAL]:
            # For manual/one-time tasks, use the scheduled_at time or None
            self.next_execution_at = self.scheduled_at
        else:
            # For recurring tasks, use scheduled_at as start time, or calculate immediate next
            if self.scheduled_at:
                self.next_execution_at = self.scheduled_at
            else:
                # If no start time specified, calculate next execution from now
                self.next_execution_at = self.calculate_next_execution()

    def calculate_next_execution(self):
        if self.schedule_type in [self.ScheduleTypeChoices.ONCE, self.ScheduleTypeChoices.MANUAL]:
            return None
        elif self.schedule_type == self.ScheduleTypeChoices.AGENT:
            # Agent executions are triggered by other agents, not scheduled
            return None

        from datetime import timedelta

        base_time = self.last_executed_at or timezone.now()

        if self.schedule_type == self.ScheduleTypeChoices.HOURLY:
            return base_time + timedelta(hours=1)
        elif self.schedule_type == self.ScheduleTypeChoices.DAILY:
            return base_time + timedelta(days=1)
        elif self.schedule_type == self.ScheduleTypeChoices.WEEKLY:
            return base_time + timedelta(weeks=1)
        elif self.schedule_type == self.ScheduleTypeChoices.MONTHLY:
            return base_time + timedelta(days=30)
        elif (
            self.schedule_type == self.ScheduleTypeChoices.CUSTOM_INTERVAL and self.interval_minutes
        ):
            return base_time + timedelta(minutes=self.interval_minutes)

        return None

    def _handle_state_transitions(self):
        """Handle task state transitions when task is updated."""
        # Get the original state from the database
        if self.pk:
            try:
                original = AgentTask.objects.get(pk=self.pk)

                # If task was FAILED or COMPLETED and is being updated, consider reactivating
                if original.status in [self.StatusChoices.FAILED, self.StatusChoices.COMPLETED]:
                    # Check if task can be reactivated
                    can_reactivate = True

                    # Check max executions constraint
                    if self.max_executions and self.execution_count >= self.max_executions:
                        can_reactivate = False

                    # If task can be reactivated, set it to ACTIVE and calculate next execution
                    if can_reactivate and self.status != self.StatusChoices.PAUSED:
                        self.status = self.StatusChoices.ACTIVE
                        self.next_execution_at = self.calculate_next_execution()

                # If max_executions was increased and task was completed due to reaching max, reactivate
                if (
                    original.status == self.StatusChoices.COMPLETED
                    and original.max_executions
                    and self.max_executions
                    and self.max_executions > original.max_executions
                    and self.execution_count < self.max_executions
                ):
                    self.status = self.StatusChoices.ACTIVE
                    self.next_execution_at = self.calculate_next_execution()

            except AgentTask.DoesNotExist:
                pass

    def reset_to_active(self):
        """Reset a failed or completed task back to active status."""
        if self.status in [self.StatusChoices.FAILED, self.StatusChoices.COMPLETED]:
            self.status = self.StatusChoices.ACTIVE
            self.next_execution_at = self.calculate_next_execution()
            self.save()

    @property
    def is_ready_for_execution(self):
        if self.status != self.StatusChoices.ACTIVE:
            return False

        if self.max_executions and self.execution_count >= self.max_executions:
            return False

        if not self.next_execution_at:
            return False

        return self.next_execution_at <= timezone.now()


class AgentTaskExecution(AbstractBaseModel):
    class StatusChoices(models.TextChoices):
        PENDING = "pending", "Pending"
        RUNNING = "running", "Running"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    agent_task = models.ForeignKey(AgentTask, on_delete=models.CASCADE, related_name="executions")
    status = models.CharField(
        max_length=20, choices=StatusChoices.choices, default=StatusChoices.PENDING
    )
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    input_data = models.JSONField(default=dict, help_text="The input sent to the agent")
    output_data = models.JSONField(null=True, blank=True, help_text="The response from the agent")
    error_message = models.TextField(blank=True)
    execution_time_seconds = models.FloatField(null=True, blank=True)
    api_security_summary = models.JSONField(
        default=dict,
        blank=True,
        help_text="Summary of API calls, authentication methods, and security checks",
    )

    background_task_id = models.CharField(
        max_length=100, blank=True, help_text="ID of the django-background-tasks task"
    )

    class Meta:
        ordering = ["-created"]

    def __str__(self):
        return f"{self.agent_task.name} execution at {self.created}"

    @property
    def duration(self):
        if self.started_at and self.completed_at:
            return self.completed_at - self.started_at
        return None


class ProjectEnvironmentSecretQuerySet(models.QuerySet):
    def for_user(self, user):
        """Filter environment secrets for a specific user"""
        return self.filter(user=user)


class ProjectEnvironmentSecretManager(models.Manager):
    def get_queryset(self):
        return ProjectEnvironmentSecretQuerySet(self.model, using=self._db)

    def for_user(self, user):
        return self.get_queryset().for_user(user)


class ProjectEnvironmentSecret(AbstractBaseModel):
    """
    Environment secrets for projects that can be used in agent prompts.
    Secrets are encrypted and only show masked values after creation.
    """

    project = models.ForeignKey(
        AgentProject, on_delete=models.CASCADE, related_name="environment_secrets"
    )
    user = models.ForeignKey(
        "core.User", on_delete=models.CASCADE, related_name="project_environment_secrets"
    )
    key = models.CharField(
        max_length=255, help_text="Environment variable name (e.g., 'API_KEY', 'DATABASE_URL')"
    )
    value = EncryptedTextField(help_text="Encrypted secret value")
    description = models.TextField(
        blank=True, help_text="Optional description of what this secret is used for"
    )

    objects = ProjectEnvironmentSecretManager()

    class Meta:
        ordering = ["key"]
        unique_together = [["project", "key", "user"]]

    def __str__(self):
        return f"{self.project.title}: {self.key}"

    @property
    def masked_value(self):
        """Return masked version of the secret (last 4 characters)"""
        if self.value and len(self.value) > 4:
            return "****" + self.value[-4:]
        elif self.value:
            return "****"
        return ""

    def clean(self):
        from django.core.exceptions import ValidationError

        errors = {}

        # Validate key format (alphanumeric and underscores only)
        if self.key and not self.key.replace("_", "").isalnum():
            errors["key"] = "Key must contain only letters, numbers, and underscores"

        # Validate key doesn't start with number
        if self.key and self.key[0].isdigit():
            errors["key"] = "Key cannot start with a number"

        if errors:
            raise ValidationError(errors)

        super().clean()
