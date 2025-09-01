import asyncio
import logging
import re
from datetime import datetime
from typing import Optional

from background_task import background
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


@background(schedule=1)
def execute_agent_task(task_execution_id: int):
    from .models import AgentTask, AgentTaskExecution

    logger.info(f"Starting execution of agent task execution {task_execution_id}")

    try:
        execution = AgentTaskExecution.objects.get(id=task_execution_id)
    except AgentTaskExecution.DoesNotExist:
        logger.error(f"AgentTaskExecution {task_execution_id} not found")
        return

    task = execution.agent_task
    start_time = timezone.now()

    execution.status = AgentTaskExecution.StatusChoices.RUNNING
    execution.started_at = start_time
    execution.save()

    try:
        agent_instance = task.agent_instance
        use_lambda = getattr(settings, "USE_LAMBDA_FOR_AGENT_EXECUTION", False)

        input_data = {
            "instruction": task.instruction,
            "task_name": task.name,
            "execution_id": str(execution.id),
        }

        execution.input_data = input_data
        execution.save()

        logger.info(
            f"Executing agent {agent_instance.friendly_name} with instruction: {task.instruction[:100]}..."
        )

        if use_lambda:
            # Use Lambda for execution
            from tn_agent_launcher.chat.models import PromptTemplate

            from .lambda_service import lambda_agent_service

            # Get the system prompt
            system_prompt = PromptTemplate.objects.get_assembled_prompt(
                agent_instance=agent_instance.id
            )

            # Invoke Lambda with provider configuration
            response = lambda_agent_service.invoke_agent(
                provider=agent_instance.provider,
                model_name=agent_instance.model_name,
                api_key=agent_instance.api_key,
                prompt=task.instruction,
                system_prompt=system_prompt,
                agent_type=agent_instance.agent_type,
                agent_name=agent_instance.friendly_name,
                target_url=agent_instance.target_url,
                context=input_data,
            )

            # Create a result object similar to PydanticAI response
            class LambdaResult:
                def __init__(self, output):
                    self.output = output

            result = LambdaResult(response.get("response", ""))
        else:
            # Run locally with async agent
            async def run_agent():
                agent = await agent_instance.agent()
                return await agent.run(task.instruction)

            result = asyncio.run(run_agent())

        end_time = timezone.now()
        duration = (end_time - start_time).total_seconds()

        execution.status = AgentTaskExecution.StatusChoices.COMPLETED
        execution.completed_at = end_time
        execution.execution_time_seconds = duration
        # lets filter out the thinknig from the output <think> some text </think>

        filtered_output = re.sub(r"<think>.*?</think>", "", result.output, flags=re.DOTALL).strip()
        execution.output_data = {"result": filtered_output}

        execution.save()

        task.execution_count += 1
        task.last_executed_at = end_time

        next_execution = task.calculate_next_execution()
        if next_execution:
            task.next_execution_at = next_execution
        else:
            task.status = AgentTask.StatusChoices.COMPLETED

        task.save()

        logger.info(
            f"Agent task execution {task_execution_id} completed successfully in {duration:.2f} seconds"
        )

    except Exception as e:
        error_message = str(e)
        logger.error(f"Agent task execution {task_execution_id} failed: {error_message}")

        end_time = timezone.now()
        duration = (end_time - start_time).total_seconds()

        execution.status = AgentTaskExecution.StatusChoices.FAILED
        execution.completed_at = end_time
        execution.execution_time_seconds = duration
        execution.error_message = error_message
        execution.save()

        task.status = AgentTask.StatusChoices.FAILED
        task.save()


def schedule_agent_task_execution(
    agent_task_id: int, scheduled_time: Optional[datetime] = None, force_execute: bool = False
):
    from .models import AgentTask, AgentTaskExecution

    try:
        task = AgentTask.objects.get(id=agent_task_id)
    except AgentTask.DoesNotExist:
        logger.error(f"AgentTask {agent_task_id} not found")
        return None

    # For manual execution (force_execute=True), only check if task is active
    if force_execute:
        if task.status != task.StatusChoices.ACTIVE:
            logger.info(f"Task {task.name} is not active")
            return None
        # Check max executions if set
        if task.max_executions and task.execution_count >= task.max_executions:
            logger.info(f"Task {task.name} has reached maximum executions")
            return None
    else:
        # For scheduled execution, use the full readiness check
        if not task.is_ready_for_execution:
            logger.info(f"Task {task.name} is not ready for execution")
            return None

    execution = AgentTaskExecution.objects.create(
        agent_task=task, status=AgentTaskExecution.StatusChoices.PENDING
    )

    if scheduled_time:
        bg_task = execute_agent_task(str(execution.id), schedule=scheduled_time)
    else:
        bg_task = execute_agent_task(str(execution.id))

    execution.background_task_id = bg_task.id
    execution.save()

    logger.info(f"Scheduled execution {execution.id} for task {task.name}")

    return execution


@background(schedule=60)
def process_pending_agent_tasks():
    from .models import AgentTask

    logger.info("Processing pending agent tasks")

    ready_tasks = AgentTask.objects.filter(
        status=AgentTask.StatusChoices.ACTIVE, next_execution_at__lte=timezone.now()
    )

    for task in ready_tasks:
        if task.is_ready_for_execution:
            logger.info(f"Scheduling execution for task: {task.name}")
            schedule_agent_task_execution(task.id)
        else:
            logger.info(f"Task {task.name} is not ready for execution")

    logger.info(f"Processed {ready_tasks.count()} pending agent tasks")
