import json

from rest_framework import serializers

from .models import Chat, ChatMessage, PromptTemplate


class SystemPromptSerializer(serializers.ModelSerializer):
    class Meta:
        fields = ["id", "name", "content", "agent_instance"]
        read_only_fields = ["id"]
        model = PromptTemplate


class ChatMessageSerializer(serializers.ModelSerializer):
    parsed_content = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = [
            "id",
            "content",
            "parsed_content",
            "role",
            "created",
        ]
        read_only_fields = ["id", "created"]

    def get_parsed_content(self, obj):
        """Parse and categorize different message types for frontend rendering."""
        content = obj.content

        # Handle different message roles and types
        if obj.role == ChatMessage.MessageSender.TOOL:
            if content.startswith("Tool call:"):
                # Extract the JSON part after "Tool call: "
                try:
                    json_content = content[len("Tool call: ") :].strip()
                    parsed = json.loads(json_content)
                    return {
                        "type": "tool_call",
                        "function": parsed.get("function"),
                        "arguments": parsed.get("arguments"),
                        "raw": content,
                    }
                except (json.JSONDecodeError, AttributeError):
                    return {
                        "type": "tool_call",
                        "raw": content,
                        "error": "Failed to parse tool call JSON",
                    }

            elif content.startswith("Tool result"):
                # Legacy format: "Tool result (tool_name): result_content"
                try:
                    if ": " in content:
                        header, result = content.split(": ", 1)
                        tool_name = header.replace("Tool result (", "").replace(")", "")

                        # Try to parse result as JSON if possible
                        try:
                            parsed_result = json.loads(result)
                        except json.JSONDecodeError:
                            parsed_result = result

                        return {
                            "type": "tool_result",
                            "tool_name": tool_name,
                            "result": parsed_result,
                            "raw": content,
                        }
                except Exception:
                    return {
                        "type": "tool_result",
                        "raw": content,
                        "error": "Failed to parse tool result",
                    }
            else:
                # New format: content is just the raw result
                try:
                    # Try to parse content as JSON if possible
                    try:
                        parsed_result = json.loads(content)
                    except json.JSONDecodeError:
                        parsed_result = content

                    return {
                        "type": "tool_result",
                        "tool_name": "unknown",  # We don't have tool name in new format
                        "result": parsed_result,
                        "raw": content,
                    }
                except Exception:
                    return {
                        "type": "tool_result",
                        "raw": content,
                        "error": "Failed to parse tool result",
                    }

        elif obj.role == ChatMessage.MessageSender.AI:
            # Agent/Assistant response - now should be clean content
            return {"type": "agent_response", "content": content}

        elif obj.role == ChatMessage.MessageSender.USER:
            # User message
            return {"type": "user_message", "content": content}

        # Fallback for any other message types
        return {"type": "message", "content": content}


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
