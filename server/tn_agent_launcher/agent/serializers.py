from rest_framework import serializers

from .models import AgentInstance, AgentProject


class AgentInstanceSerializer(serializers.ModelSerializer):
    masked_api_key = serializers.SerializerMethodField()

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
            "masked_api_key",
        ]
        read_only_fields = ["id", "created", "last_edited"]

    extra_kwargs = {
        "api_key": {"write_only": True},
    }

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
