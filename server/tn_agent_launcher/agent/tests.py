import pytest
from django.urls import reverse

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
def test_agent_task(api_client, sample_agent_task):
    assert AgentTask.objects.count()
