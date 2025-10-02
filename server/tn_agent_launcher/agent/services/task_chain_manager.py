import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)


class TaskChainManager:
    """Handles triggering of chained agent tasks."""

    def __init__(self):
        pass

    def handle_task_chain(self, task: Any, execution: Any, filtered_output: str) -> None:
        """
        Handle triggering of next agent tasks in the chain.

        Args:
            task: The current agent task that just completed
            execution: The current execution
            filtered_output: The processed output from the current task
        """
        # Find all tasks that are triggered by this task
        triggered_tasks = task.triggers_tasks.all()

        if not triggered_tasks.exists():
            return

        logger.info(
            f"Triggering {triggered_tasks.count()} agent(s) from completed task: {task.name}"
        )

        for triggered_task in triggered_tasks:
            try:
                logger.info(f"Triggering agent: {triggered_task.name}")
                self._create_trigger_input_source(task, execution, filtered_output, triggered_task)
                trigger_execution = self._schedule_trigger_execution(triggered_task)

                if trigger_execution:
                    logger.info(
                        f"Successfully scheduled trigger agent execution {trigger_execution.id} for task {triggered_task.name}"
                    )
                else:
                    logger.warning(
                        f"Failed to schedule trigger agent execution for task {triggered_task.id}"
                    )

            except Exception as e:
                logger.error(f"Failed to trigger agent {triggered_task.name}: {e}")

    def _create_trigger_input_source(
        self, task: Any, execution: Any, output: str, trigger_task: Any
    ) -> None:
        """Create input source from current task's output for the trigger task."""

        # Copy preprocessing options from the triggering task's first input source if available
        preprocessing_options = {}
        if task.input_sources:
            # Get preprocessing options from the first input source of the triggering task
            first_source = (
                task.input_sources[0]
                if isinstance(task.input_sources, list)
                else task.input_sources
            )
            if isinstance(first_source, dict):
                # Copy relevant preprocessing options
                for option in [
                    "skip_preprocessing",
                    "preprocess_image",
                    "is_document_with_text",
                    "replace_images_with_descriptions",
                    "contains_images",
                    "extract_images_as_text",
                ]:
                    if option in first_source:
                        preprocessing_options[option] = first_source[option]

        # Create input source from this task's output with copied preprocessing options
        trigger_input_source = {
            "url": f"agent-output://{execution.id}",
            "source_type": "agent_output",
            "filename": f"{task.name}_output.txt",
            "content_type": "text/plain",
            "agent_execution_id": str(execution.id),
            "processed_content": output,
            **preprocessing_options,  # Include preprocessing options
        }

        # Replace all input sources with just the output from the triggering task
        # This ensures chained tasks only receive the output from their trigger, not original sources
        trigger_task.input_sources = [trigger_input_source]

        # Update the trigger task with the new input source
        trigger_task.save()

        logger.info(
            f"Replaced input sources for triggered task {trigger_task.name} with output from {task.name}"
        )
        if preprocessing_options:
            logger.info(f"Copied preprocessing options: {preprocessing_options}")

    def _schedule_trigger_execution(self, trigger_task: Any) -> Optional[Any]:
        """Schedule execution of the trigger task in a separate background task."""
        # Import here to avoid circular imports
        from ..tasks import trigger_chained_task

        # Trigger the chained task in a separate background task to avoid event loop conflicts
        bg_task = trigger_chained_task(str(trigger_task.id))
        logger.info(f"Scheduled chained task trigger with background task ID: {bg_task.id}")
        return bg_task
