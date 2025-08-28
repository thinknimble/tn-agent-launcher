from rest_framework import permissions, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import AgentInstance, AgentProject, AgentTask, AgentTaskExecution
from .serializers import AgentInstanceSerializer, AgentProjectSerializer, AgentTaskSerializer, AgentTaskExecutionSerializer
from .tasks import schedule_agent_task_execution


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


class AgentTaskViewSet(viewsets.ModelViewSet):
    queryset = AgentTask.objects.all()
    serializer_class = AgentTaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    @action(detail=True, methods=['post'])
    def execute_now(self, request, pk=None):
        task = self.get_object()
        
        if task.status != AgentTask.StatusChoices.ACTIVE:
            return Response(
                {"error": "Task must be active to execute"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        execution = schedule_agent_task_execution(task.id)
        
        if execution:
            serializer = AgentTaskExecutionSerializer(execution)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        else:
            return Response(
                {"error": "Failed to schedule task execution"},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def pause(self, request, pk=None):
        task = self.get_object()
        task.status = AgentTask.StatusChoices.PAUSED
        task.save()
        
        serializer = self.get_serializer(task)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def resume(self, request, pk=None):
        task = self.get_object()
        task.status = AgentTask.StatusChoices.ACTIVE
        task.save()
        
        serializer = self.get_serializer(task)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def executions(self, request, pk=None):
        task = self.get_object()
        executions = task.executions.all()
        
        page = self.paginate_queryset(executions)
        if page is not None:
            serializer = AgentTaskExecutionSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = AgentTaskExecutionSerializer(executions, many=True)
        return Response(serializer.data)


class AgentTaskExecutionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AgentTaskExecution.objects.all()
    serializer_class = AgentTaskExecutionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(agent_task__user=self.request.user)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        execution = self.get_object()
        
        if execution.status not in [
            AgentTaskExecution.StatusChoices.PENDING,
            AgentTaskExecution.StatusChoices.RUNNING
        ]:
            return Response(
                {"error": "Only pending or running executions can be cancelled"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Try to cancel the background task if it exists
        if execution.background_task_id:
            try:
                from background_task.models import Task
                bg_task = Task.objects.get(id=execution.background_task_id)
                bg_task.delete()
            except Task.DoesNotExist:
                pass
        
        execution.status = AgentTaskExecution.StatusChoices.FAILED
        execution.error_message = "Cancelled by user"
        execution.save()
        
        serializer = self.get_serializer(execution)
        return Response(serializer.data)
