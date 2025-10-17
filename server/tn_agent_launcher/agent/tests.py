import pytest
from django.urls import reverse
from rest_framework import status

from .factories import AgentInstanceFactory, AgentProjectFactory, AgentTaskFactory
from .models import AgentInstance, AgentProject, AgentTask


@pytest.mark.django_db
def test_agent_instance(sample_agent_instance):
    assert sample_agent_instance.id is not None


@pytest.mark.django_db
def test_agent_serializer(api_client, sample_agent_instance):
    api_client.force_authenticate(user=sample_agent_instance.user)
    response = api_client.get("/api/agents/instances/")
    assert response.status_code == 200
    assert len(response.data["results"]) == 1
    assert response.data["results"][0]["friendly_name"] == sample_agent_instance.friendly_name


@pytest.mark.django_db
def test_agent_viewset_create(api_client, sample_user, sample_agent_project):
    api_client.force_authenticate(user=sample_user)
    data = {
        "friendly_name": "Test Agent",
        "provider": "OPENAI",
        "model_name": "gpt-4",
        "target_url": "http://example.com",
        "agent_type": "chat",
        "api_key": "some_test",
        "projects": [sample_agent_project.id],
        "instruction": "You are a helpful assistant.",
    }
    response = api_client.post("/api/agents/instances/", data, format="json")
    assert response.status_code == 201
    assert response.data["friendly_name"] == "Test Agent"
    assert response.data["provider"] == "OPENAI"
    assert response.data["model_name"] == "gpt-4"
    assert response.data["target_url"] == "http://example.com"
    assert response.data["agent_type"] == "chat"
    assert response.data["user"] == sample_user.id


@pytest.mark.django_db
def test_agent_project(sample_agent_project):
    assert sample_agent_project.id is not None


@pytest.mark.django_db
def test_agent_project_serializer(api_client, sample_agent_project):
    api_client.force_authenticate(user=sample_agent_project.user)
    response = api_client.get("/api/agents/projects/")
    assert response.status_code == 200
    assert len(response.data["results"]) == 1
    assert response.data["results"][0]["title"] == sample_agent_project.title


@pytest.mark.django_db
def test_agent_project_viewset_create(api_client, sample_user, sample_agent_instance):
    api_client.force_authenticate(user=sample_user)
    data = {
        "title": "Test Project",
        "description": "A test project",
    }
    response = api_client.post("/api/agents/projects/", data, format="json")
    assert response.status_code == 201
    assert response.data["title"] == "Test Project"
    assert response.data["description"] == "A test project"
    assert response.data["user"] == sample_user.id


@pytest.mark.django_db
def test_agent_project_viewset_filters(
    api_client, sample_user, sample_agent_instance, agent_project_factory, agent_instance_factory
):
    new_agent = agent_instance_factory()
    new_agent.save()
    new_agent.user = sample_agent_instance.user
    new_agent.save()

    assert new_agent.projects.count() == 1
    assert AgentProject.objects.count() == 2
    assert AgentInstance.objects.count() == 2
    assert sample_agent_instance.projects.count() == 1
    assert sample_agent_instance.projects.first().id != new_agent.projects.first().id

    api_client.force_authenticate(user=sample_agent_instance.user)
    res = api_client.get(
        reverse("agentinstance-list"), {"projects": str(sample_agent_instance.projects.first().id)}
    )
    assert res.status_code == 200
    assert res.data["results"][0]["id"] == str(sample_agent_instance.id)


@pytest.mark.django_db
def test_agent_task(sample_agent_task):
    assert AgentTask.objects.count()


# ============================================================================
# COMPREHENSIVE CRUD TESTS
# ============================================================================


# AgentInstance CRUD Tests
@pytest.mark.django_db
class TestAgentInstanceCRUD:
    """Comprehensive CRUD tests for AgentInstance"""

    def test_create_agent_instance(self, api_client, sample_user):
        """Test creating an agent instance"""
        api_client.force_authenticate(user=sample_user)

        data = {
            "friendly_name": "Test Agent",
            "provider": "OPENAI",
            "model_name": "gpt-4",
            "api_key": "test-key-12345",
            "target_url": "https://api.openai.com",
            "agent_type": "chat",
            "projects": [],
            "instruction": "You are a helpful assistant.",
        }

        response = api_client.post("/api/agents/instances/", data, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["friendly_name"] == "Test Agent"
        assert response.data["provider"] == "OPENAI"
        assert response.data["agent_type"] == "chat"
        assert response.data["user"] == sample_user.id

        # Verify instance was created in database
        instance = AgentInstance.objects.get(id=response.data["id"])
        assert instance.friendly_name == "Test Agent"
        assert instance.api_key == "test-key-12345"

    def test_read_agent_instance(self, api_client, sample_agent_instance):
        """Test reading a single agent instance"""
        api_client.force_authenticate(user=sample_agent_instance.user)

        response = api_client.get(f"/api/agents/instances/{sample_agent_instance.id}/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["friendly_name"] == sample_agent_instance.friendly_name
        assert response.data["id"] == str(sample_agent_instance.id)
        # API key should be masked in response
        assert "****" in response.data["masked_api_key"]

    def test_list_agent_instances(self, api_client, sample_user):
        """Test listing agent instances with pagination"""
        api_client.force_authenticate(user=sample_user)

        # Create multiple instances for the same user
        AgentInstanceFactory.create_batch(3, user=sample_user)

        response = api_client.get("/api/agents/instances/")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 3

        # Verify all instances belong to the authenticated user
        for instance_data in response.data["results"]:
            assert instance_data["user"] == sample_user.id

    def test_update_agent_instance(self, api_client, sample_agent_instance):
        """Test updating an agent instance"""
        api_client.force_authenticate(user=sample_agent_instance.user)

        update_data = {
            "friendly_name": "Updated Agent Name",
            "model_name": "gpt-4-turbo",
            "projects": [str(p.id) for p in sample_agent_instance.projects.all()],
        }

        response = api_client.patch(
            f"/api/agents/instances/{sample_agent_instance.id}/", update_data, format="json"
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["friendly_name"] == "Updated Agent Name"
        assert response.data["model_name"] == "gpt-4-turbo"

        # Verify update in database
        instance = AgentInstance.objects.get(id=sample_agent_instance.id)
        assert instance.friendly_name == "Updated Agent Name"
        assert instance.model_name == "gpt-4-turbo"

    def test_delete_agent_instance(self, api_client, sample_agent_instance):
        """Test deleting an agent instance"""
        api_client.force_authenticate(user=sample_agent_instance.user)
        instance_id = sample_agent_instance.id

        response = api_client.delete(f"/api/agents/instances/{instance_id}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT

        # Verify deletion
        assert not AgentInstance.objects.filter(id=instance_id).exists()

    def test_agent_instance_project_filter(self, api_client, sample_user):
        """Test filtering agent instances by project"""
        api_client.force_authenticate(user=sample_user)

        # Create projects
        project1 = AgentProjectFactory(user=sample_user)
        project2 = AgentProjectFactory(user=sample_user)

        # Create agent instances with different projects
        agent1 = AgentInstanceFactory(user=sample_user, projects=[project1])
        agent2 = AgentInstanceFactory(user=sample_user, projects=[project2])
        agent3 = AgentInstanceFactory(user=sample_user, projects=[project1, project2])

        # Test filtering by project1
        response = api_client.get(f"/api/agents/instances/?projects={project1.id}")
        assert response.status_code == status.HTTP_200_OK
        agent_ids = [agent["id"] for agent in response.data["results"]]
        assert str(agent1.id) in agent_ids
        assert str(agent3.id) in agent_ids
        assert str(agent2.id) not in agent_ids

    def test_agent_instance_agent_type_filter(self, api_client, sample_user):
        """Test filtering agent instances by agent type"""
        api_client.force_authenticate(user=sample_user)

        # Create instances with different agent types
        chat_agent = AgentInstanceFactory(user=sample_user, agent_type="chat")
        oneshot_agent = AgentInstanceFactory(user=sample_user, agent_type="one-shot")

        # Filter by chat type
        response = api_client.get("/api/agents/instances/?agentType=chat")
        assert response.status_code == status.HTTP_200_OK
        agent_ids = [agent["id"] for agent in response.data["results"]]
        assert str(chat_agent.id) in agent_ids
        assert str(oneshot_agent.id) not in agent_ids

        # Filter by one-shot type
        response = api_client.get("/api/agents/instances/?agentType=one-shot")
        assert response.status_code == status.HTTP_200_OK
        agent_ids = [agent["id"] for agent in response.data["results"]]
        assert str(oneshot_agent.id) in agent_ids
        assert str(chat_agent.id) not in agent_ids

    def test_user_isolation(self, api_client, sample_user):
        """Test that users can only access their own agent instances"""
        api_client.force_authenticate(user=sample_user)

        # Create instance for different user
        other_user_instance = AgentInstanceFactory()

        # User should not see other user's instances in list
        response = api_client.get("/api/agents/instances/")
        assert response.status_code == status.HTTP_200_OK
        agent_ids = [agent["id"] for agent in response.data["results"]]
        assert str(other_user_instance.id) not in agent_ids

        # User should not be able to access other user's instance directly
        response = api_client.get(f"/api/agents/instances/{other_user_instance.id}/")
        assert response.status_code == status.HTTP_404_NOT_FOUND


# AgentProject CRUD Tests
@pytest.mark.django_db
class TestAgentProjectCRUD:
    """Comprehensive CRUD tests for AgentProject"""

    def test_create_agent_project(self, api_client, sample_user):
        """Test creating an agent project"""
        api_client.force_authenticate(user=sample_user)

        data = {"title": "Test Project", "description": "A test project for agents"}

        response = api_client.post("/api/agents/projects/", data, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["title"] == "Test Project"
        assert response.data["description"] == "A test project for agents"
        assert response.data["user"] == sample_user.id

        # Verify project was created in database
        project = AgentProject.objects.get(id=response.data["id"])
        assert project.title == "Test Project"

    def test_read_agent_project(self, api_client, sample_agent_project):
        """Test reading a single agent project"""
        api_client.force_authenticate(user=sample_agent_project.user)

        response = api_client.get(f"/api/agents/projects/{sample_agent_project.id}/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["title"] == sample_agent_project.title
        assert response.data["id"] == str(sample_agent_project.id)

    def test_list_agent_projects(self, api_client, sample_user):
        """Test listing agent projects"""
        api_client.force_authenticate(user=sample_user)

        # Create multiple projects for the same user
        AgentProjectFactory.create_batch(3, user=sample_user)

        response = api_client.get("/api/agents/projects/")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 3

        # Verify all projects belong to the authenticated user
        for project_data in response.data["results"]:
            assert project_data["user"] == sample_user.id

    def test_update_agent_project(self, api_client, sample_agent_project):
        """Test updating an agent project"""
        api_client.force_authenticate(user=sample_agent_project.user)

        update_data = {"title": "Updated Project Title", "description": "Updated description"}

        response = api_client.patch(
            f"/api/agents/projects/{sample_agent_project.id}/", update_data, format="json"
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["title"] == "Updated Project Title"
        assert response.data["description"] == "Updated description"

    def test_delete_agent_project(self, api_client, sample_agent_project):
        """Test deleting an agent project"""
        api_client.force_authenticate(user=sample_agent_project.user)
        project_id = sample_agent_project.id

        response = api_client.delete(f"/api/agents/projects/{project_id}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT

        # Verify deletion
        assert not AgentProject.objects.filter(id=project_id).exists()

    def test_project_user_isolation(self, api_client, sample_user):
        """Test that users can only access their own projects"""
        api_client.force_authenticate(user=sample_user)

        # Create project for different user
        other_user_project = AgentProjectFactory()

        # User should not see other user's projects in list
        response = api_client.get("/api/agents/projects/")
        assert response.status_code == status.HTTP_200_OK
        project_ids = [project["id"] for project in response.data["results"]]
        assert str(other_user_project.id) not in project_ids

        # User should not be able to access other user's project directly
        response = api_client.get(f"/api/agents/projects/{other_user_project.id}/")
        assert response.status_code == status.HTTP_404_NOT_FOUND


# AgentTask CRUD Tests
@pytest.mark.django_db
class TestAgentTaskCRUD:
    """Comprehensive CRUD tests for AgentTask with input sources"""

    def test_create_agent_task_with_input_sources(self, api_client, sample_user):
        """Test creating an agent task with input sources"""
        api_client.force_authenticate(user=sample_user)

        # Create a one-shot agent instance for the task
        agent_instance = AgentInstanceFactory(user=sample_user, agent_type="one-shot")

        data = {
            "name": "Test Task with Sources",
            "description": "A task with input sources",
            "agent_instance": str(agent_instance.id),
            "instruction": "Process these input sources",
            "input_sources": [
                {
                    "url": "https://example.com/document.pdf",
                    "source_type": "public_url",
                    "filename": "document.pdf",
                    "content_type": "application/pdf",
                },
                {
                    "url": "https://example.com/data.json",
                    "source_type": "public_url",
                    "filename": "data.json",
                    "content_type": "application/json",
                },
            ],
            "schedule_type": "once",
            "scheduled_at": "2024-12-31T12:00:00Z",
            "max_executions": 1,
        }

        response = api_client.post("/api/agents/tasks/", data, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "Test Task with Sources"
        assert len(response.data["input_sources"]) == 2
        assert response.data["input_sources"][0]["url"] == "https://example.com/document.pdf"
        assert response.data["input_sources"][0]["source_type"] == "public_url"

    def test_create_agent_task_empty_input_sources(self, api_client, sample_user):
        """Test creating an agent task with empty input sources"""
        api_client.force_authenticate(user=sample_user)

        agent_instance = AgentInstanceFactory(user=sample_user, agent_type="one-shot")

        data = {
            "name": "Task without Sources",
            "agent_instance": str(agent_instance.id),
            "instruction": "Simple task without input sources",
            "input_sources": [],
            "schedule_type": "daily",
            "interval_minutes": 60,
        }

        response = api_client.post("/api/agents/tasks/", data, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["input_sources"] == []

    def test_read_agent_task(self, api_client, sample_agent_task):
        """Test reading a single agent task"""
        api_client.force_authenticate(user=sample_agent_task.agent_instance.user)

        response = api_client.get(f"/api/agents/tasks/{sample_agent_task.id}/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == sample_agent_task.name
        assert response.data["id"] == str(sample_agent_task.id)

    def test_list_agent_tasks(self, api_client, sample_user):
        """Test listing agent tasks"""
        api_client.force_authenticate(user=sample_user)

        # Create agent instance and tasks for the same user
        agent_instance = AgentInstanceFactory(user=sample_user, agent_type="one-shot")
        AgentTaskFactory.create_batch(3, agent_instance=agent_instance)

        response = api_client.get("/api/agents/tasks/")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 3

    def test_update_agent_task_input_sources(self, api_client, sample_user):
        """Test updating an agent task's input sources"""
        api_client.force_authenticate(user=sample_user)

        agent_instance = AgentInstanceFactory(user=sample_user, agent_type="one-shot")
        task = AgentTaskFactory(agent_instance=agent_instance)

        update_data = {
            "input_sources": [
                {
                    "url": "https://updated.com/file.pdf",
                    "source_type": "public_url",
                    "filename": "updated_file.pdf",
                }
            ]
        }

        response = api_client.patch(f"/api/agents/tasks/{task.id}/", update_data, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["input_sources"]) == 1
        assert response.data["input_sources"][0]["url"] == "https://updated.com/file.pdf"

    def test_delete_agent_task(self, api_client, sample_user):
        """Test deleting an agent task"""
        api_client.force_authenticate(user=sample_user)

        agent_instance = AgentInstanceFactory(user=sample_user, agent_type="one-shot")
        task = AgentTaskFactory(agent_instance=agent_instance)
        task_id = task.id

        response = api_client.delete(f"/api/agents/tasks/{task_id}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT

        # Verify deletion
        assert not AgentTask.objects.filter(id=task_id).exists()

    def test_task_user_isolation(self, api_client, sample_user):
        """Test that users can only access tasks from their own agent instances"""
        api_client.force_authenticate(user=sample_user)

        # Create task for different user
        other_user_task = AgentTaskFactory()

        # User should not see other user's tasks in list
        response = api_client.get("/api/agents/tasks/")
        assert response.status_code == status.HTTP_200_OK
        task_ids = [task["id"] for task in response.data["results"]]
        assert str(other_user_task.id) not in task_ids

        # User should not be able to access other user's task directly
        response = api_client.get(f"/api/agents/tasks/{other_user_task.id}/")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_task_execute_now_action(self, api_client, sample_user):
        """Test the execute_now action for tasks"""
        api_client.force_authenticate(user=sample_user)

        agent_instance = AgentInstanceFactory(user=sample_user, agent_type="one-shot")
        task = AgentTaskFactory(agent_instance=agent_instance, status="active")

        response = api_client.post(f"/api/agents/tasks/{task.id}/execute_now/")
        assert response.status_code == status.HTTP_201_CREATED
        assert "agent_task" in response.data
        assert response.data["status"] == "pending"

    def test_task_pause_resume_actions(self, api_client, sample_user):
        """Test pause and resume actions for tasks"""
        api_client.force_authenticate(user=sample_user)

        agent_instance = AgentInstanceFactory(user=sample_user, agent_type="one-shot")
        task = AgentTaskFactory(agent_instance=agent_instance, status="active")

        # Test pause
        response = api_client.post(f"/api/agents/tasks/{task.id}/pause/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "paused"

        # Test resume
        response = api_client.post(f"/api/agents/tasks/{task.id}/resume/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "active"
