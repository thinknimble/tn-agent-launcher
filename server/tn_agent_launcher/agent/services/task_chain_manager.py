import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)


class TaskChainManager:
    """Handles triggering of chained agent tasks."""

    def __init__(self):
        pass

    def handle_task_chain(self, task: Any, execution: Any, filtered_output: str) -> None:
        """
        Handle triggering of next agent task in the chain.

        Args:
            task: The current agent task
            execution: The current execution
            filtered_output: The processed output from the current task
        """
        if not task.trigger_agent_task:
            return

        logger.info(f"Triggering next agent: {task.trigger_agent_task.name}")

        try:
            self._create_trigger_input_source(task, execution, filtered_output)
            trigger_execution = self._schedule_trigger_execution(task.trigger_agent_task)

            if trigger_execution:
                logger.info(
                    f"Successfully scheduled trigger agent execution {trigger_execution.id}"
                )
            else:
                logger.warning(
                    f"Failed to schedule trigger agent execution for task {task.trigger_agent_task.id}"
                )

        except Exception as e:
            logger.error(f"Failed to trigger next agent {task.trigger_agent_task.name}: {e}")

    def _create_trigger_input_source(self, task: Any, execution: Any, output: str) -> None:
        """Create input source from current task's output for the trigger task."""
        # Create input source from this task's output
        trigger_input_source = {
            "url": f"agent-output://{execution.id}",
            "source_type": "agent_output",
            "filename": f"{task.name}_output.txt",
            "content_type": "text/plain",
            "agent_execution_id": execution.id,
            "processed_content": output,
        }

        # Add the output as input source to the trigger task's input sources
        trigger_task = task.trigger_agent_task
        trigger_task_input_sources = (
            list(trigger_task.input_sources) if trigger_task.input_sources else []
        )
        trigger_task_input_sources.append(trigger_input_source)

        # Update the trigger task with the new input source
        trigger_task.input_sources = trigger_task_input_sources
        trigger_task.save()

    def _schedule_trigger_execution(self, trigger_task: Any) -> Optional[Any]:
        """Schedule execution of the trigger task in a separate background task."""
        # Import here to avoid circular imports
        from ..tasks import trigger_chained_task

        # Trigger the chained task in a separate background task to avoid event loop conflicts
        bg_task = trigger_chained_task(str(trigger_task.id))
        logger.info(f"Scheduled chained task trigger with background task ID: {bg_task.id}")
        return bg_task
