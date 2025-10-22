import asyncio
import concurrent.futures
import logging
from typing import Any, Dict, List

logger = logging.getLogger(__name__)


class AgentExecutionResult:
    """Wrapper for agent execution results to standardize interface."""

    def __init__(self, output: str):
        self.output = output


class AgentExecutor:
    """Handles execution of agents via Lambda or local execution."""

    def __init__(self):
        pass

    def execute_agent(
        self,
        agent_instance: Any,
        instruction: str,
        multimodal_content: List[Any],
        has_raw_files: bool,
        input_data: Dict[str, Any],
        use_lambda: bool,
    ) -> AgentExecutionResult:
        """
        Execute agent either via Lambda or locally.

        Args:
            agent_instance: The agent instance to execute
            instruction: Complete instruction (includes agent instruction, task instruction, and input sources)
            multimodal_content: List of multimodal content for PydanticAI
            has_raw_files: Whether raw files are present
            input_data: Input data context
            use_lambda: Whether to use Lambda execution

        Returns:
            AgentExecutionResult with the output
        """
        logger.info(
            f"Executing agent {agent_instance.friendly_name} with instruction: {instruction[:100]}..."
        )

        if has_raw_files:
            logger.info(
                f"Task includes {len(multimodal_content)} raw files for multimodal processing"
            )

        if use_lambda:
            return self._execute_via_lambda(agent_instance, instruction, input_data)
        else:
            return self._execute_locally(
                agent_instance,
                instruction,
                multimodal_content,
                has_raw_files,
                input_data,
            )

    def _execute_via_lambda(
        self, agent_instance: Any, instruction: str, input_data: Dict[str, Any]
    ) -> AgentExecutionResult:
        """Execute agent via Lambda service."""
        from tn_agent_launcher.chat.models import PromptTemplate

        from ..lambda_service import lambda_agent_service

        # Get the system prompt
        system_prompt = PromptTemplate.objects.get_assembled_prompt(
            agent_instance=agent_instance.id
        )

        # Invoke Lambda with provider configuration
        # Note: Lambda doesn't support multimodal content yet, so always use instruction
        response = lambda_agent_service.invoke_agent(
            provider=agent_instance.provider,
            model_name=agent_instance.model_name,
            api_key=agent_instance.api_key,
            prompt=instruction,
            system_prompt=system_prompt,
            agent_type=agent_instance.agent_type,
            agent_name=agent_instance.friendly_name,
            target_url=agent_instance.target_url,
            context=input_data,
        )

        return AgentExecutionResult(response.get("response", ""))

    def _execute_locally(
        self,
        agent_instance: Any,
        instruction: str,
        multimodal_content: List[Any],
        has_raw_files: bool,
        input_data: Dict[str, Any] = None,
    ) -> AgentExecutionResult:
        """Execute agent locally with async handling."""

        async def run_agent():
            from tn_agent_launcher.agent.tools import get_agent_tools

            agent = await agent_instance.agent()

            # Get the dependencies for this execution
            # Extract execution_id from input_data if available
            execution_id = input_data.get("execution_id") if input_data else None
            deps, _ = get_agent_tools(
                user_id=str(agent_instance.user_id), execution_id=execution_id
            )

            # If we have raw files, use multimodal content with PydanticAI
            if has_raw_files and multimodal_content:
                # For multimodal content, we pass the instruction along with the media
                # PydanticAI expects a list of content parts for multimodal messages
                message_content = [instruction] + multimodal_content
                return await agent.run(message_content, deps=deps)
            else:
                # For text-only or preprocessed content, use instruction
                return await agent.run(instruction, deps=deps)

        # Handle existing event loop by creating a new one in a separate thread
        def run_in_new_loop():
            # Create a new event loop for this thread
            new_loop = asyncio.new_event_loop()
            asyncio.set_event_loop(new_loop)
            try:
                return new_loop.run_until_complete(run_agent())
            finally:
                new_loop.close()

        # Run the async function in a new thread with its own event loop
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(run_in_new_loop)
            result = future.result()

        return AgentExecutionResult(result.output)
