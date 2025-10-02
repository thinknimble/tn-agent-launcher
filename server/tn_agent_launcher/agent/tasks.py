import logging
from datetime import datetime
from typing import Optional

from background_task import background
from django.utils import timezone

from .services.execution_manager import ExecutionManager

logger = logging.getLogger(__name__)


@background(schedule=1)
def execute_agent_task(task_execution_id: int):
    """Execute an agent task using the ExecutionManager service."""
    from .models import AgentTaskExecution

    logger.info(f"Starting execution of agent task execution {task_execution_id}")

    try:
        execution = AgentTaskExecution.objects.get(id=task_execution_id)
    except AgentTaskExecution.DoesNotExist:
        logger.error(f"AgentTaskExecution {task_execution_id} not found")
        return

    # Use the ExecutionManager to handle the entire execution flow
    execution_manager = ExecutionManager()
    execution_manager.execute_task(execution)


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


@background(schedule=1)
def trigger_chained_task(trigger_task_id: int):
    """Trigger execution of a chained task in a separate background task."""
    logger.info(f"Triggering chained task execution {trigger_task_id}")
    return schedule_agent_task_execution(trigger_task_id, force_execute=True)


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
