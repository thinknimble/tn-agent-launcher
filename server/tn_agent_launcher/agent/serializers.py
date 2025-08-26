from rest_framework import serializers

from .models import AgentInstance, AgentProject


class AgentInstanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgentInstance
        fields = [
            "id",
            "friendly_name",
            "provider",
            "model_name",
            "target_url",
            "agent_type",
            "created",
            "last_edited",
            "api_key",
            "user",
        ]
        read_only_fields = ["id", "created", "last_edited"]

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
