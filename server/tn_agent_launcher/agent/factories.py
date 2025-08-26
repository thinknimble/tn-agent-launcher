import factory 
from factory.django import DjangoModelFactory
from .models import AgentInstance, AgentProject
from tn_agent_launcher.core.factories import UserFactory

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