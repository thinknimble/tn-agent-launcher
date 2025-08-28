import factory
from factory.django import DjangoModelFactory

from tn_agent_launcher.core.factories import UserFactory

from .models import AgentInstance, AgentProject


class AgentInstanceFactory(DjangoModelFactory):
    class Meta:
        model = AgentInstance

    @factory.lazy_attribute
    def user(self, *args, **kwargs):
        user = UserFactory()
        user.save()
        return user


class AgentProjectFactory(DjangoModelFactory):
    class Meta:
        model = AgentProject

    @factory.lazy_attribute
    def user(self, *args, **kwargs):
        user = UserFactory()
        user.save()
        return user
