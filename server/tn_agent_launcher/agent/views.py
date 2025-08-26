from rest_framework import permissions, viewsets
from .models import AgentInstance, AgentProject
from .serializers import AgentInstanceSerializer, AgentProjectSerializer

# Create your views here.
class AgentInstanceViewSet(viewsets.ModelViewSet):
    queryset = AgentInstance.objects.all()
    serializer_class = AgentInstanceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)
    
    
class AgentProjectViewSet(viewsets.ModelViewSet):
    queryset = AgentProject.objects.all()
    serializer_class = AgentProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)
    

    