import pytest 


@pytest.mark.django_db
def test_agent_instance(sample_agent_instance):
    assert sample_agent_instance.id is not None
    
    
@pytest.mark.django_db
def test_agent_serializer(api_client, sample_agent_instance):
    api_client.force_authenticate(user=sample_agent_instance.user)
    response = api_client.get("/api/agents/instances/")
    assert response.status_code == 200
    assert len(response.data['results']) == 1
    assert response.data['results'][0]["friendly_name"] == sample_agent_instance.friendly_name
    
    
@pytest.mark.django_db
def test_agent_viewset_create(api_client, sample_user):
    api_client.force_authenticate(user=sample_user)
    data = {
        "friendly_name": "Test Agent",
        "provider": "OPENAI",
        "model_name": "gpt-4",
        "target_url": "http://example.com",
        "agent_type": "chat",
        "api_key": "some_test"
    }
    response = api_client.post("/api/agents/", data, format='json')
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
    assert len(response.data['results']) == 1
    assert response.data['results'][0]["title"] == sample_agent_project.title
    
@pytest.mark.django_db
def test_agent_project_viewset_create(api_client, sample_user, sample_agent_instance):
    api_client.force_authenticate(user=sample_user)
    data = {
        "title": "Test Project",
        "description": "A test project",
    }
    response = api_client.post("/api/agents/projects/", data, format='json')
    assert response.status_code == 201
    assert response.data["title"] == "Test Project"
    assert response.data["description"] == "A test project"
    assert response.data["user"] == sample_user.id
