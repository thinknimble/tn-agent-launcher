from rest_framework import serializers

from tn_agent_launcher.chat.serializers import SystemPromptSerializer

from .models import AgentInstance, AgentProject, AgentTask, AgentTaskExecution


class AgentInstanceSerializer(serializers.ModelSerializer):
    masked_api_key = serializers.SerializerMethodField()
    prompt_template = serializers.SerializerMethodField()

    class Meta:
        model = AgentInstance
        fields = [
            "id",
            "friendly_name",
            "provider",
            "model_name",
            "projects",
            "target_url",
            "agent_type",
            "created",
            "last_edited",
            "api_key",
            "user",
            "masked_api_key",
            "prompt_template",
        ]
        read_only_fields = ["id", "created", "last_edited"]

    extra_kwargs = {
        "api_key": {"write_only": True},
    }

    def get_prompt_template(self, obj):
        template = obj.prompt_templates.first()
        return SystemPromptSerializer(template).data if template else None

    def get_masked_api_key(self, obj):
        if obj.api_key:
            return obj.api_key[:4] + "****" + obj.api_key[-4:]
        return None

    def to_internal_value(self, data):
        data["user"] = self.context["request"].user.id
        return super().to_internal_value(data)


class AgentProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgentProject
        fields = ["id", "title", "description", "created", "last_edited", "user", "agent_instances"]
        read_only_fields = ["id", "created", "last_edited", "agent_instances"]

    def to_internal_value(self, data):
        data["user"] = self.context["request"].user.id
        return super().to_internal_value(data)


class AgentTaskSerializer(serializers.ModelSerializer):
    agent_instance_name = serializers.CharField(
        source="agent_instance.friendly_name", read_only=True
    )
    triggered_by_task_name = serializers.CharField(source="triggered_by_task.name", read_only=True)
    next_execution_display = serializers.SerializerMethodField()
    last_execution_display = serializers.SerializerMethodField()

    class Meta:
        model = AgentTask
        fields = [
            "id",
            "name",
            "description",
            "agent_instance",
            "agent_instance_name",
            "instruction",
            "input_sources",
            "schedule_type",
            "scheduled_at",
            "interval_minutes",
            "triggered_by_task",
            "triggered_by_task_name",
            "status",
            "last_executed_at",
            "last_execution_display",
            "next_execution_at",
            "next_execution_display",
            "max_executions",
            "execution_count",
            "created",
            "last_edited",
        ]
        read_only_fields = [
            "id",
            "created",
            "last_edited",
            "last_executed_at",
            "next_execution_at",
            "execution_count",
            "agent_instance_name",
            "triggered_by_task_name",
        ]

    def get_next_execution_display(self, obj):
        if obj.next_execution_at:
            return obj.next_execution_at.strftime("%Y-%m-%d %H:%M:%S UTC")
        return None

    def get_last_execution_display(self, obj):
        if obj.last_executed_at:
            return obj.last_executed_at.strftime("%Y-%m-%d %H:%M:%S UTC")
        return None

    def validate_agent_instance(self, value):
        if value.agent_type != AgentInstance.AgentTypeChoices.ONE_SHOT:
            raise serializers.ValidationError(
                "Only one-shot agents can be used for scheduled tasks"
            )
        return value

    def validate(self, data):
        schedule_type = data.get("schedule_type")

        # Validate agent instance type (ensure this always runs)
        agent_instance = data.get("agent_instance")
        if agent_instance and agent_instance.agent_type != AgentInstance.AgentTypeChoices.ONE_SHOT:
            raise serializers.ValidationError(
                {"agent_instance": "Only one-shot agents can be used for scheduled tasks"}
            )

        if schedule_type == AgentTask.ScheduleTypeChoices.CUSTOM_INTERVAL:
            if not data.get("interval_minutes"):
                raise serializers.ValidationError(
                    {"interval_minutes": "interval_minutes is required for custom interval tasks"}
                )
        elif schedule_type == AgentTask.ScheduleTypeChoices.AGENT:
            if not data.get("triggered_by_task"):
                raise serializers.ValidationError(
                    {"triggered_by_task": "triggered_by_task is required for agent-triggered tasks"}
                )

        return data


class AgentTaskExecutionSerializer(serializers.ModelSerializer):
    agent_task_name = serializers.CharField(source="agent_task.name", read_only=True)
    duration_display = serializers.SerializerMethodField()
    started_display = serializers.SerializerMethodField()
    completed_display = serializers.SerializerMethodField()

    class Meta:
        model = AgentTaskExecution
        fields = [
            "id",
            "agent_task",
            "agent_task_name",
            "status",
            "started_at",
            "started_display",
            "completed_at",
            "completed_display",
            "input_data",
            "output_data",
            "error_message",
            "execution_time_seconds",
            "duration_display",
            "background_task_id",
            "created",
        ]
        read_only_fields = [
            "id",
            "started_at",
            "completed_at",
            "input_data",
            "output_data",
            "error_message",
            "execution_time_seconds",
            "background_task_id",
            "created",
            "agent_task_name",
        ]

    def get_duration_display(self, obj):
        if obj.execution_time_seconds:
            if obj.execution_time_seconds < 60:
                return f"{obj.execution_time_seconds:.2f} seconds"
            else:
                minutes = obj.execution_time_seconds / 60
                return f"{minutes:.2f} minutes"
        return None

    def get_started_display(self, obj):
        if obj.started_at:
            return obj.started_at.strftime("%Y-%m-%d %H:%M:%S UTC")
        return None

    def get_completed_display(self, obj):
        if obj.completed_at:
            return obj.completed_at.strftime("%Y-%m-%d %H:%M:%S UTC")
        return None
