from django.db import models
from pydantic_ai import Agent

from tn_agent_launcher.common.models import AbstractBaseModel


class AgentInstance(AbstractBaseModel):
    class ProviderChoices(models.TextChoices):
        GEMINI = "GEMINI", "Google Gemini"
        OPENAI = "OPENAI", "OpenAI"
        OLLAMA = "OLLAMA", "Ollama"
        ANTHROPIC = "ANTHROPIC", "Anthropic"

    class AgentTypeChoices(models.TextChoices):
        CHAT = "chat", "Chat"
        ONE_SHOT = "one-shot", "One-Shot"

    friendly_name = models.CharField(max_length=255)
    provider = models.CharField(max_length=50, choices=ProviderChoices.choices)
    model_name = models.CharField(max_length=100)
    api_key = models.TextField()
    target_url = models.URLField(
        null=True, blank=True, help_text="Optional base URL for the model API, if applicable"
    )
    agent_type = models.CharField(
        max_length=50,
        default=AgentTypeChoices.CHAT,
        choices=AgentTypeChoices.choices,
        help_text="Type of agent, e.g., 'chat', 'one-shot', etc.",
    )
    user = models.ForeignKey("core.User", on_delete=models.CASCADE, related_name="agent_instances")

    def __str__(self):
        return self.friendly_name

    class Meta:
        ordering = ["friendly_name"]

    @property
    def raw_agent(self):
        from .agent import create_agent

        return create_agent(self.provider, self.model_name, self.api_key, self.target_url)

    async def agent(self):
        from tn_agent_launcher.chat.models import PromptTemplate

        print("Fetching system prompt for agent instance:", self.id)
        system_prompt = await PromptTemplate.objects.aget_assembled_prompt(agent_instance=self.id)
        return Agent(
            name=self.friendly_name,
            model=self.raw_agent,
            output_type=str,
            system_prompt=system_prompt,
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
