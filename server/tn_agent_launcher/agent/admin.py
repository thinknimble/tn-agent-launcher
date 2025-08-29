from django.contrib import admin

from tn_agent_launcher.chat.models import PromptTemplate

from .models import AgentInstance, AgentTask, AgentTaskExecution

# Register your models here.


class PromptTemplateInline(admin.TabularInline):
    model = PromptTemplate
    extra = 0
    readonly_fields = ("created", "last_edited")
    fields = ("name", "content", "description", "order", "agent_instance")


@admin.register(AgentInstance)
class AgentInstanceAdmin(admin.ModelAdmin):
    list_display = ("friendly_name", "provider", "model_name", "created", "last_edited")
    search_fields = ("friendly_name", "provider", "model_name", "api_key")
    readonly_fields = ("created", "last_edited")
    ordering = ("friendly_name",)
    fieldsets = (
        (None, {"fields": ("friendly_name", "provider", "model_name", "api_key", "target_url")}),
        ("Metadata", {"fields": ("created", "last_edited"), "classes": ("collapse",)}),
    )
    inlines = [PromptTemplateInline]


admin.site.register(AgentTask)
admin.site.register(AgentTaskExecution)
