import django_filters

from tn_agent_launcher.common.filters import MultiValueModelFilter

from .models import AgentInstance


class AgentInstanceFilter(django_filters.FilterSet):
    projects = MultiValueModelFilter(field_name="projects")
    agentType = django_filters.ChoiceFilter(
        field_name="agent_type", choices=AgentInstance.AgentTypeChoices.choices
    )

    class Meta:
        model = AgentInstance
        fields = ["projects", "agentType"]
