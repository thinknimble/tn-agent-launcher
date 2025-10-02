import logging
import re
from datetime import datetime
from typing import Any, Dict

from django.conf import settings
from django.utils import timezone

from .agent_executor import AgentExecutor
from .input_processor import InputSourceProcessor
from .task_chain_manager import TaskChainManager

logger = logging.getLogger(__name__)


class ExecutionManager:
    """Main orchestrator for agent task execution."""

    def __init__(self):
        self.input_processor = InputSourceProcessor()
        self.agent_executor = AgentExecutor()
        self.task_chain_manager = TaskChainManager()

    def execute_task(self, execution: Any) -> None:
        """
        Execute an agent task with full orchestration.

        Args:
            execution: The AgentTaskExecution instance
        """
        task = execution.agent_task
        start_time = timezone.now()

        # Update execution status
        execution.status = execution.StatusChoices.RUNNING
        execution.started_at = start_time
        execution.save()

        try:
            # Process input sources
            input_data = self._process_inputs(task, execution)

            # Execute the agent
            result = self._execute_agent(task, input_data)

            # Process results and update task
            self._process_results(task, execution, result, start_time)

            # Handle task chaining
            filtered_output = self._filter_output(result.output)
            self.task_chain_manager.handle_task_chain(task, execution, filtered_output)

            logger.info(
                f"Agent task execution {execution.id} completed successfully in "
                f"{execution.execution_time_seconds:.2f} seconds"
            )

        except Exception as e:
            self._handle_execution_error(task, execution, start_time, e)

    def _process_inputs(self, task: Any, execution: Any) -> Dict[str, Any]:
        """Process input sources and create input data."""
        # Process input sources
        processed_inputs = self.input_processor.process_input_sources(task.input_sources or [])

        # Create enhanced instruction
        enhanced_instruction = self.input_processor.create_enhanced_instruction(
            task.instruction, processed_inputs["input_sources_content"]
        )

        # Sanitize input sources for JSON storage
        sanitized_sources = self.input_processor.sanitize_input_sources(
            processed_inputs["input_sources_content"]
        )

        # Prepare input data
        input_data = {
            "instruction": task.instruction,
            "enhanced_instruction": enhanced_instruction,
            "task_name": task.name,
            "execution_id": str(execution.id),
            "input_sources": sanitized_sources,
            "has_raw_files": processed_inputs["has_raw_files"],
            "multimodal_content": processed_inputs["multimodal_content"],
        }

        # Save input data to execution
        execution.input_data = {k: v for k, v in input_data.items() if k != "multimodal_content"}
        execution.save()

        return input_data

    def _execute_agent(self, task: Any, input_data: Dict[str, Any]) -> Any:
        """Execute the agent with the prepared input data."""
        agent_instance = task.agent_instance
        use_lambda = settings.USE_LAMBDA_FOR_AGENT_EXECUTION and agent_instance.use_lambda

        return self.agent_executor.execute_agent(
            agent_instance=agent_instance,
            instruction=input_data["instruction"],
            enhanced_instruction=input_data["enhanced_instruction"],
            multimodal_content=input_data["multimodal_content"],
            has_raw_files=input_data["has_raw_files"],
            input_data=input_data,
            use_lambda=use_lambda,
        )

    def _process_results(
        self, task: Any, execution: Any, result: Any, start_time: datetime
    ) -> None:
        """Process execution results and update task/execution."""
        end_time = timezone.now()
        duration = (end_time - start_time).total_seconds()

        # Filter output and update execution
        filtered_output = self._filter_output(result.output)
        execution.status = execution.StatusChoices.COMPLETED
        execution.completed_at = end_time
        execution.execution_time_seconds = duration
        execution.output_data = {"result": filtered_output}
        execution.save()

        # Update task
        task.execution_count += 1
        task.last_executed_at = end_time

        # Calculate next execution
        next_execution = task.calculate_next_execution()
        if next_execution:
            task.next_execution_at = next_execution
        else:
            # Only mark task as completed if it has reached max executions
            # For MANUAL and AGENT tasks, they should remain ACTIVE until max executions reached
            if task.max_executions and task.execution_count >= task.max_executions:
                task.status = task.StatusChoices.COMPLETED
            else:
                # For MANUAL and AGENT tasks without max_executions, keep them ACTIVE
                # For ONCE tasks, keep legacy behavior for backward compatibility
                if task.schedule_type == task.ScheduleTypeChoices.ONCE:
                    task.status = task.StatusChoices.COMPLETED
                # MANUAL and AGENT tasks stay ACTIVE until manually paused or max reached

        task.save()

    def _filter_output(self, output: str) -> str:
        """Filter out thinking tags from the output."""
        return re.sub(r"<think>.*?</think>", "", output, flags=re.DOTALL).strip()

    def _handle_execution_error(
        self, task: Any, execution: Any, start_time: datetime, error: Exception
    ) -> None:
        """Handle execution errors and update task/execution status."""
        error_message = str(error)
        logger.error(f"Agent task execution {execution.id} failed: {error_message}")

        end_time = timezone.now()
        duration = (end_time - start_time).total_seconds()

        execution.status = execution.StatusChoices.FAILED
        execution.completed_at = end_time
        execution.execution_time_seconds = duration
        execution.error_message = error_message
        execution.save()

        task.status = task.StatusChoices.FAILED
        task.save()

        raise  # Re-raise the exception for the caller to handle
