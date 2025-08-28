from django.core.management.base import BaseCommand

from tn_agent_launcher.agent.tasks import process_pending_agent_tasks


class Command(BaseCommand):
    help = "Start the recurring background task processor for agent tasks"

    def handle(self, *args, **options):
        self.stdout.write("Starting agent task processor...")

        process_pending_agent_tasks(repeat=60, repeat_until=None)

        self.stdout.write(self.style.SUCCESS("Agent task processor started successfully!"))
