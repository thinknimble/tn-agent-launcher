from rest_framework import serializers

from .models import PromptTemplate


class SystemPromptSerializer(serializers.ModelSerializer):
    class Meta:
        fields = ["id", "name", "content"]
        read_only_fields = ["id"]
        model = PromptTemplate
