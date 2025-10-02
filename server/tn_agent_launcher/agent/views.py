import uuid

from botocore.exceptions import ClientError
from django.conf import settings
from django.core.files.storage import get_storage_class
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .filters import AgentInstanceFilter
from .models import AgentInstance, AgentProject, AgentTask, AgentTaskExecution
from .serializers import (
    AgentInstanceSerializer,
    AgentProjectSerializer,
    AgentTaskExecutionSerializer,
    AgentTaskSerializer,
)
from .tasks import schedule_agent_task_execution


# Create your views here.
class AgentInstanceViewSet(viewsets.ModelViewSet):
    queryset = AgentInstance.objects.all()
    serializer_class = AgentInstanceSerializer
    permission_classes = [permissions.IsAuthenticated]

    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    filterset_class = AgentInstanceFilter

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
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    filterset_fields = ["agent_instance", "status"]

    def get_queryset(self):
        return self.queryset.filter(agent_instance__user=self.request.user)

    def create(self, request, *args, **kwargs):
        # Ensure the agent instance belongs to the user
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def execute_now(self, request, pk=None):
        task = self.get_object()

        execution = schedule_agent_task_execution(task.id, force_execute=True)

        if execution:
            serializer = AgentTaskExecutionSerializer(execution)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        else:
            return Response(
                {"error": "Failed to schedule task execution"}, status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=["post"])
    def pause(self, request, pk=None):
        task = self.get_object()
        task.status = AgentTask.StatusChoices.PAUSED
        task.save()

        serializer = self.get_serializer(task)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def resume(self, request, pk=None):
        task = self.get_object()
        task.status = AgentTask.StatusChoices.ACTIVE
        task.save()

        serializer = self.get_serializer(task)
        return Response(serializer.data)

    @action(detail=False, methods=["post"])
    def generate_presigned_url(self, request):
        """Generate a presigned URL for file upload to S3"""
        filename = request.data.get("filename")
        content_type = request.data.get("content_type", "application/octet-stream")

        if not filename:
            return Response({"error": "filename is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Use django-storages for consistency with the rest of the app
            storage_class = get_storage_class(settings.DEFAULT_FILE_STORAGE)
            storage = storage_class()

            # Generate unique key for the file
            # Use AWS_LOCATION directly instead of storage.location to avoid /media/ duplication
            aws_location = getattr(settings, "AWS_LOCATION", "")
            if aws_location:
                file_key = f"{storage.location}/input-sources/{uuid.uuid4()}/{filename}"
            else:
                file_key = f"input-sources/{uuid.uuid4()}/{filename}"

            # Generate presigned POST using django-storages
            presigned_post = storage.connection.meta.client.generate_presigned_post(
                Bucket=storage.bucket_name,
                Key=file_key,
                Fields={"Content-Type": content_type},
                Conditions=[
                    {"Content-Type": content_type},
                    ["content-length-range", 1, 104857600],  # 100MB max
                ],
                ExpiresIn=3600,
            )

            # Generate the public URL manually to avoid storage.url() adding extra paths
            public_url = f"https://{storage.bucket_name}.s3.amazonaws.com/{file_key}"

            return Response(
                {
                    "presigned_post": presigned_post,
                    "public_url": public_url,
                    "filename": filename,
                    "key": file_key,
                }
            )

        except ClientError as e:
            return Response(
                {"error": f"Failed to generate presigned URL: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        except Exception as e:
            return Response(
                {"error": f"Unexpected error: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class AgentTaskExecutionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AgentTaskExecution.objects.all()
    serializer_class = AgentTaskExecutionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(agent_task__agent_instance__user=self.request.user)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        execution = self.get_object()

        if execution.status not in [
            AgentTaskExecution.StatusChoices.PENDING,
            AgentTaskExecution.StatusChoices.RUNNING,
        ]:
            return Response(
                {"error": "Only pending or running executions can be cancelled"},
                status=status.HTTP_400_BAD_REQUEST,
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
