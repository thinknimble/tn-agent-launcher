from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .exceptions import BadTemplateException
from .models import Chat, ChatMessage, PromptTemplate
from .serializers import (
    ChatMessageSerializer,
    ChatSerializer,
    SystemPromptSerializer,
)


@api_view(["GET"])
def get_current_system_prompt(request):
    try:
        assembled_prompt = PromptTemplate.objects.get_assembled_prompt()
    except BadTemplateException as e:
        return Response({"error": str(e)}, status=500)

    serializer = SystemPromptSerializer({"content": assembled_prompt, "name": "Assembled Prompt"})
    return Response(serializer.data)


class PromptTemplateViewSet(viewsets.ModelViewSet):
    queryset = PromptTemplate.objects.all()
    serializer_class = SystemPromptSerializer

    def get_queryset(self):
        return self.queryset.filter(agent_instance__user=self.request.user)


class ChatViewSet(viewsets.ModelViewSet):
    queryset = Chat.objects.all()

    def get_queryset(self):
        return Chat.objects.filter(user=self.request.user).order_by("-created")

    def get_serializer_class(self):
        return ChatSerializer

    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["agent_instance"]
    ordering = ["-last_edited"]


class ChatMessageViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for retrieving messages for a specific chat with pagination support.
    """

    serializer_class = ChatMessageSerializer

    filter_backends = [filters.OrderingFilter, DjangoFilterBackend]
    filterset_fields = ["chat"]
    ordering = ["-created"]

    def get_queryset(self):
        return ChatMessage.objects.filter(chat__user=self.request.user)
