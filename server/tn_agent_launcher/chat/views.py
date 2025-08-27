from rest_framework import viewsets, mixins
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .exceptions import BadTemplateException
from .models import PromptTemplate
from .serializers import SystemPromptSerializer


@api_view(["GET"])
def get_current_system_prompt(request):
    try:
        assembled_prompt = PromptTemplate.objects.get_assembled_prompt()
    except BadTemplateException as e:
        return Response({"error": str(e)}, status=500)

    serializer = SystemPromptSerializer({"content": assembled_prompt})
    return Response(serializer.data)


class PromptTemplateViewSet(
    viewsets.ModelViewSet
):
    queryset = PromptTemplate.objects.all()
    serializer_class = SystemPromptSerializer

    def get_queryset(self):
        return self.queryset.filter(agent_instance__user=self.request.user)
