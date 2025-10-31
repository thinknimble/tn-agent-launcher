import django_filters

from tn_agent_launcher.common.filters import MultiValueCharFilter

from .models import Integration


class IntegrationFilters(django_filters.FilterSet):
    integration_type = django_filters.ChoiceFilter(
        field_name="integration_type", choices=Integration.IntegrationTypes.choices
    )
    integration_roles = MultiValueCharFilter(field_name="integration_roles")

    class Meta:
        model = Integration
        fields = ["integration_type", "integration_roles"]
