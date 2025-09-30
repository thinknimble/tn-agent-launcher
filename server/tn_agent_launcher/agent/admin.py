from django import forms
from django.contrib import admin
from django.core.exceptions import ValidationError

from tn_agent_launcher.chat.models import PromptTemplate

from .models import AgentInstance, AgentProject, AgentTask, AgentTaskExecution

# Register your models here.


class AgentInstanceAdminForm(forms.ModelForm):
    """Custom admin form with additional validation"""

    class Meta:
        model = AgentInstance
        fields = "__all__"

    def clean(self):
        cleaned_data = super().clean()
        provider = cleaned_data.get("provider")
        use_lambda = cleaned_data.get("use_lambda")

        # Validate that BEDROCK requires use_lambda
        if provider == AgentInstance.ProviderChoices.BEDROCK and not use_lambda:
            raise ValidationError(
                {"use_lambda": "Lambda execution must be enabled for Bedrock providers."}
            )

        return cleaned_data


class PromptTemplateInline(admin.TabularInline):
    model = PromptTemplate
    extra = 0
    readonly_fields = ("created", "last_edited")
    fields = ("name", "content", "description", "order", "agent_instance")


@admin.register(AgentInstance)
class AgentInstanceAdmin(admin.ModelAdmin):
    form = AgentInstanceAdminForm
    list_display = (
        "friendly_name",
        "provider",
        "model_name",
        "use_lambda",
        "created",
        "last_edited",
    )
    search_fields = ("friendly_name", "provider", "model_name", "api_key")
    readonly_fields = ("created", "last_edited")
    ordering = ("friendly_name",)
    inlines = [PromptTemplateInline]

    def get_fieldsets(self, request, obj=None):
        """Dynamic fieldsets based on user permissions"""
        fieldsets = [
            (
                None,
                {
                    "fields": (
                        "friendly_name",
                        "provider",
                        "model_name",
                        "api_key",
                        "target_url",
                        "agent_type",
                        "user",
                    )
                },
            ),
        ]

        # Only show use_lambda field to staff users
        if request.user.is_staff:
            fieldsets[0][1]["fields"] = (
                fieldsets[0][1]["fields"][:-1] + ("use_lambda",) + (fieldsets[0][1]["fields"][-1],)
            )

        fieldsets.append(
            ("Metadata", {"fields": ("created", "last_edited"), "classes": ("collapse",)})
        )

        return fieldsets


admin.site.register(AgentTask)
admin.site.register(AgentTaskExecution)
admin.site.register(AgentProject)
