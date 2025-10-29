import pytest

from tn_agent_launcher.agent.factories import AgentInstanceFactory, AgentTaskFactory


@pytest.mark.django_db
def test_append_agent_instruction_defaults_to_true():
    """Test that append_agent_instruction defaults to True"""
    agent = AgentInstanceFactory(agent_type="one-shot")
    task = AgentTaskFactory(agent_instance=agent)

    assert task.append_agent_instruction is True


@pytest.mark.django_db
def test_append_agent_instruction_can_be_false():
    """Test that append_agent_instruction can be set to False"""
    agent = AgentInstanceFactory(agent_type="one-shot")
    task = AgentTaskFactory(agent_instance=agent, append_agent_instruction=False)

    assert task.append_agent_instruction is False
