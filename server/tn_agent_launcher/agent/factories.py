import factory
from factory.django import DjangoModelFactory

from tn_agent_launcher.core.factories import UserFactory

from .models import AgentInstance, AgentProject, AgentTask


class AgentProjectFactory(DjangoModelFactory):
    class Meta:
        model = AgentProject

    title = factory.Faker("company")
    description = factory.Faker("text", max_nb_chars=200)

    @factory.lazy_attribute
    def user(self):
        user = UserFactory()
        user.save()
        return user


class AgentInstanceFactory(DjangoModelFactory):
    class Meta:
        model = AgentInstance

    friendly_name = factory.Faker("name")
    provider = factory.Iterator([choice[0] for choice in AgentInstance.ProviderChoices.choices])
    model_name = factory.Faker("word")
    api_key = factory.Faker("password", length=32)
    target_url = factory.Faker("url")
    agent_type = factory.Iterator([choice[0] for choice in AgentInstance.AgentTypeChoices.choices])
    use_lambda = factory.Faker("boolean", False)

    @factory.lazy_attribute
    def user(self):
        user = UserFactory()
        user.save()
        return user

    @factory.post_generation
    def projects(self, create, extracted, **kwargs):
        if not create:
            return
        if extracted:
            self.projects.set(extracted)
        else:
            project = AgentProjectFactory()
            project.save()
            self.projects.set([project.id])


class AgentTaskFactory(DjangoModelFactory):
    class Meta:
        model = AgentTask

    name = factory.Faker("sentence", nb_words=4)
    description = factory.Faker("text", max_nb_chars=300)
    instruction = factory.Faker("text", max_nb_chars=500)
    input_sources = factory.List(
        [
            factory.Dict(
                {
                    "url": factory.Faker("url"),
                    "source_type": "public_url",
                    "filename": factory.Faker("file_name"),
                }
            )
        ]
    )
    schedule_type = factory.Iterator(
        [choice[0] for choice in AgentTask.ScheduleTypeChoices.choices]
    )
    scheduled_at = factory.Faker("future_datetime", end_date="+30d")
    interval_minutes = factory.Faker("random_int", min=15, max=1440)
    status = factory.Iterator([choice[0] for choice in AgentTask.StatusChoices.choices])
    max_executions = factory.Faker("random_int", min=1, max=100)

    @factory.lazy_attribute
    def agent_instance(self):
        # Create an agent instance with ONE_SHOT type since tasks require that
        agent_instance = AgentInstanceFactory(agent_type=AgentInstance.AgentTypeChoices.ONE_SHOT)
        agent_instance.save()
        return agent_instance
