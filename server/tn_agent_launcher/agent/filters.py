import django_filters

from tn_agent_launcher.common.filters import MultiValueModelFilter


class AgentInstanceFilter(django_filters.FilterSet):
    projects = MultiValueModelFilter(field_name="projects")
