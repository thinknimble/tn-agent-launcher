import factory
from factory.django import DjangoModelFactory

from tn_agent_launcher.core.factories import UserFactory

from .models import AgentInstance, AgentProject, AgentTask


class AgentProjectFactory(DjangoModelFactory):
    class Meta:
        model = AgentProject

    @factory.lazy_attribute
    def user(self, *args, **kwargs):
        user = UserFactory()
        user.save()
        return user


class AgentInstanceFactory(DjangoModelFactory):
    class Meta:
        model = AgentInstance

    @factory.lazy_attribute
    def user(self, *args, **kwargs):
        user = UserFactory()
        user.save()
        return user

    @factory.post_generation
    def projects(self, *args, **kwargs):
        project = AgentProjectFactory()
        project.save()
        self.projects.set([project.id])
        return


class AgentTaskFactory(DjangoModelFactory):
    class Meta:
        model = AgentTask

    @factory.lazy_attribute
    def agent_instance(self, *args, **kwargs):
        agent_instance = AgentInstanceFactory()
        agent_instance.save()
        return agent_instance
