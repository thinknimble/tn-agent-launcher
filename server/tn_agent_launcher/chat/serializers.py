from rest_framework import serializers

from .models import Chat, ChatMessage, PromptTemplate


class SystemPromptSerializer(serializers.ModelSerializer):
    class Meta:
        fields = ["id", "name", "content", "agent_instance"]
        read_only_fields = ["id"]
        model = PromptTemplate


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = [
            "id",
            "content",
            "role",
            "created",
        ]
        read_only_fields = ["id", "created"]


class ChatSerializer(serializers.ModelSerializer):
    message_count = serializers.SerializerMethodField()

    class Meta:
        model = Chat
        fields = [
            "id",
            "name",
            "created",
            "last_edited",
            "message_count",
            "completed",
            "agent_instance",
            "user",
        ]
        read_only_fields = ["id", "created", "last_edited", "message_count"]

    def get_message_count(self, obj):
        return obj.messages.count()

    def to_internal_value(self, data):
        data["user"] = self.context["request"].user.id
        return super().to_internal_value(data)
