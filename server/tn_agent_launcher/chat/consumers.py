import json
import logging
import uuid
from typing import Any, Dict, List, Optional

from asgiref.sync import sync_to_async
from channels.generic.websocket import (  # type: ignore[import-untyped]
    AsyncJsonWebsocketConsumer,
)
from pydantic_ai import Agent
from pydantic_ai.messages import (
    FunctionToolCallEvent,
    FunctionToolResultEvent,
    ModelMessage,
    ModelRequest,
    ModelRequestPart,
    ModelResponse,
    ModelResponsePart,
    PartDeltaEvent,
    PartStartEvent,
    SystemPromptPart,
    TextPart,
    TextPartDelta,
    UserPromptPart,
)

from .models import Chat, ChatMessage, PromptTemplate
from .websocket_diagnostics import add_websocket_diagnostics

logger = logging.getLogger(__name__)


@add_websocket_diagnostics
class ChatConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        try:
            self.user = self.scope["user"]
            self.current_chat = None
            self.current_message_content = ""
            self.tool_calls = {}  # Dictionary to track tool call IDs and names
            await self.accept()
            self.groups = ["agents"]
            logger.info(f"WebSocket connection accepted for user: {self.user}")
        except Exception as e:
            logger.error(f"Error during WebSocket connection: {e}")
            await self.close(code=1011)  # Internal server error

    async def disconnect(self, close_code):
        try:
            logger.info(f"WebSocket disconnecting with code: {close_code}")
            # Clean up any resources here if needed
        except Exception as e:
            logger.error(f"Error during WebSocket disconnect: {e}")
        finally:
            # Ensure the connection is properly closed
            pass

    async def receive_json(self, data: Dict[str, Any]):
        try:
            messages = data.get("messages", [])
            chat_id = data.get("chat_id")

            # Require chat_id for all interactions
            if not chat_id:
                await self.send_json({"error": "unrecognized chat ID"})
                return

            try:
                uuid_obj = uuid.UUID(chat_id)
                chat_id_str = str(uuid_obj)
            except (ValueError, TypeError, AttributeError):
                await self.send_json({"error": "unrecognized chat ID"})
                return

            # Get chat if chat_id is valid
            self.current_chat = await self.get_chat(chat_id_str)

            if not self.current_chat:
                await self.send_json({"error": "unrecognized chat ID"})
                return

            # Save user message if we have a chat
            user_message = messages[-1] if messages else None
            if user_message and user_message.get("role") == "user":
                await self.save_message(
                    self.current_chat,
                    user_message.get("content"),
                    ChatMessage.MessageSender.USER,
                )

                # Process user query with research_agent
                user_query = user_message.get("content")
                await self.process_agent_request(user_query, data)

        except Exception as e:
            logger.error(f"Error in receive_json: {str(e)}")
            logger.exception("Full traceback:")
            try:
                await self.send_json(
                    {
                        "error": "An error occurred while processing your request",
                        "details": str(e) if logger.isEnabledFor(logging.DEBUG) else None,
                    }
                )
            except Exception as send_error:
                logger.error(f"Failed to send error message: {send_error}")
                # If we can't send an error message, close the connection
                await self.close(code=1011)

    async def process_model_event(self, event):
        """Process model generation events (text streaming)"""
        if isinstance(event, PartStartEvent):
            # Check if there's any initial content in the start event
            if hasattr(event, "part") and hasattr(event.part, "content"):
                initial_content = event.part.content
                if initial_content:
                    self.current_message_content += initial_content
                    await self.send_json({"delta": {"content": initial_content}})
        elif isinstance(event, PartDeltaEvent) and isinstance(event.delta, TextPartDelta):
            # Handle streaming token updates
            delta_content = event.delta.content_delta
            if delta_content:
                self.current_message_content += delta_content
                await self.send_json({"delta": {"content": delta_content}})

    async def process_tool_call(self, event: FunctionToolCallEvent):
        """Process a function tool call event"""
        # Extract tool call details
        tool_name = event.part.tool_name
        tool_call_id = event.part.tool_call_id
        args = event.part.args
        logger.info(f"Tool call: {tool_name} (id: {tool_call_id}) with args {args}")

        # Store tool call for later reference
        if tool_call_id:
            self.tool_calls[tool_call_id] = tool_name
        else:
            logger.warning(f"No tool_call_id found for tool {tool_name}")

        # Save tool call as message
        tool_call_content = json.dumps({"function": tool_name, "arguments": args}, indent=2)
        saved_msg = await self.save_message(
            self.current_chat,
            f"Tool call: {tool_call_content}",
            ChatMessage.MessageSender.TOOL,
        )

        # Send tool call to frontend
        await self.send_json(
            {
                "tool_message": {
                    "id": str(saved_msg.id),
                    "content": tool_call_content,
                    "created": saved_msg.created.isoformat(),
                    "type": "call",
                }
            }
        )

        # Send running status to frontend
        await self.send_json(
            {
                "status": {
                    "type": "tool_call",
                    "function": tool_name,
                    "state": "running",
                }
            }
        )

    async def process_tool_result(self, event: FunctionToolResultEvent):
        """Process a function tool result event"""
        # Extract tool result details
        tool_call_id = event.tool_call_id
        tool_name = event.result.tool_name
        logger.info(f"Tool result for '{tool_name}' with ID: {tool_call_id}")

        result_content = str(event.result.content)

        # Log the final result content
        logger.info(
            f"Using result_content: {result_content[:100] if isinstance(result_content, str) else result_content}"
        )

        # Save tool result as message with clean content
        saved_result = await self.save_message(
            self.current_chat,
            result_content,
            ChatMessage.MessageSender.TOOL,
        )

        # Send tool result to frontend
        await self.send_json(
            {
                "tool_message": {
                    "id": str(saved_result.id),
                    "content": result_content,
                    "created": saved_result.created.isoformat(),
                    "type": "result",
                    "tool_name": tool_name,
                }
            }
        )

        # Send completion status to frontend
        await self.send_json(
            {
                "status": {
                    "type": "tool_call",
                    "function": tool_name,
                    "tool_call_id": tool_call_id,
                    "state": "complete",
                }
            }
        )

    async def convert_db_message_to_prompt_part(
        self, db_message: ChatMessage
    ) -> Optional[ModelRequestPart]:
        """Convert a database ChatMessage to a pydantic-ai ModelRequestPart object"""
        if db_message.role == ChatMessage.MessageSender.USER:
            return UserPromptPart(content=db_message.content)
        elif db_message.role == ChatMessage.MessageSender.AI:
            # We don't convert AI messages to prompt parts as they'll be generated by the model
            return None
        elif db_message.role == ChatMessage.MessageSender.TOOL:
            # Tool messages require special handling
            content = db_message.content
            if content.startswith("Tool call:"):
                # We don't include tool calls in message history
                return None
            elif content.startswith("Tool result"):
                # Convert tool results to user prompts instead of ToolReturnPart
                # This workaround avoids the OpenAI model's issue with ToolReturnPart
                return UserPromptPart(content=f"[TOOL RESULT] {content}")
        return None

    async def get_chat_history(self, exclude_last_user_message: bool = False) -> List[ModelMessage]:
        """Get all previous messages in the current chat and convert them to pydantic-ai model messages"""
        message_history: list[ModelMessage] = []
        current_parts: list[ModelResponsePart] = []
        current_role = None

        # Prepend the system prompt with info about the current user.
        system_prompt = (
            f"You are chatting with {self.user.full_name}. "
            f"The current chat ID is {self.current_chat.id} "
            f"and their user ID is {self.user.id}.\n\n"
        )

        # Get the system prompt (agent type is determined internally)
        agent_instance = await sync_to_async(lambda: self.current_chat.agent_instance)()
        system_prompt += await PromptTemplate.objects.aget_assembled_prompt(
            agent_instance=agent_instance.id
        )
        system_prompt_part = SystemPromptPart(content=system_prompt)

        # Start with a ModelRequest containing the system prompt
        request_parts: list[ModelRequestPart] = [system_prompt_part]
        primary_model = f"{agent_instance.provider}:{agent_instance.model_name}"
        # Fetch all messages for the current chat
        async for db_message in ChatMessage.objects.filter(chat=self.current_chat).order_by(
            "created"
        ):
            if not db_message.content.strip():
                continue
            if db_message.role == ChatMessage.MessageSender.USER:
                # If we were building an AI response, finalize it and add to history
                if current_role == "AI" and current_parts:
                    message_history.append(ModelResponse(parts=current_parts, model_name=""))
                    current_parts = []

                # Add user message to request parts
                user_part = UserPromptPart(content=db_message.content)
                request_parts.append(user_part)
                current_role = "USER"

            elif db_message.role == ChatMessage.MessageSender.AI:
                # If we have pending request parts, finalize them
                if request_parts:
                    message_history.append(ModelRequest(parts=request_parts))
                    request_parts = []

                text_part = TextPart(content=db_message.content)
                current_parts.append(text_part)
                current_role = "AI"

            elif db_message.role == ChatMessage.MessageSender.TOOL:
                prompt_part = await self.convert_db_message_to_prompt_part(db_message)
                if prompt_part and isinstance(prompt_part, UserPromptPart):
                    # For tool results (now converted to UserPromptPart), add to request parts
                    # If we were building an AI response, finalize it first
                    if current_role == "AI" and current_parts:
                        message_history.append(
                            ModelResponse(parts=current_parts, model_name=f"{primary_model}")
                        )
                        current_parts = []

                    # Add to existing request or start a new one
                    request_parts.append(prompt_part)
                    current_role = "USER"

        # Add any remaining parts to history - but only if they have actual content
        if (
            request_parts
            and len([p for p in request_parts if not isinstance(p, SystemPromptPart)]) > 0
        ):
            message_history.append(ModelRequest(parts=request_parts))
        elif current_role == "AI" and current_parts:
            message_history.append(
                ModelResponse(parts=current_parts, model_name=f"{primary_model}")
            )

        return message_history

    async def process_agent_request(self, query: str, data: Dict[str, Any] = {}):
        """Process the user query using the research agent and stream results back"""
        # Create a blank assistant message to start streaming into
        assistant_message = await self.save_message(
            self.current_chat, "", ChatMessage.MessageSender.AI
        )

        self.current_message_content = ""

        try:
            # Get previous messages from the chat history
            message_history = await self.get_chat_history()

            # Run the agent with message history and dependencies
            agent_instance = await sync_to_async(lambda: self.current_chat.agent_instance)()

            # Get agent and dependencies
            from tn_agent_launcher.agent.tools import get_agent_tools

            deps, _ = get_agent_tools(user_id=str(self.user.id))

            agent = await agent_instance.agent()
            print(f"Using agent with model: {agent.model}")
            print(f"Message history length: {len(message_history)}")
            for i, msg in enumerate(message_history):
                print(
                    f"Message {i}: {type(msg)} with {len(msg.parts) if hasattr(msg, 'parts') else 'no parts'} parts"
                )
            async with agent.iter(
                query,
                message_history=message_history,
                deps=deps,
            ) as run:
                async for node in run:
                    if Agent.is_model_request_node(node):
                        async with node.stream(run.ctx) as request_stream:
                            async for message_event in request_stream:
                                await self.process_model_event(message_event)
                    elif Agent.is_call_tools_node(node):
                        async with node.stream(run.ctx) as handle_stream:
                            async for tool_event in handle_stream:
                                if isinstance(tool_event, FunctionToolCallEvent):
                                    await self.process_tool_call(tool_event)
                                elif isinstance(tool_event, FunctionToolResultEvent):
                                    await self.process_tool_result(tool_event)

            # Get final result and update the saved message
            final_result = run.result if run.result else ""

            # Extract the actual content from the result if it's an AgentRunResult
            if hasattr(final_result, "output"):
                # If it's an AgentRunResult object, extract the output
                content_to_save = str(final_result.output)
            elif final_result:
                # If it's already a string, use it directly
                content_to_save = str(final_result)
            else:
                # Fallback to the streamed content we've been building
                content_to_save = self.current_message_content

            # Update saved message with clean content
            await self.update_saved_message(assistant_message, content_to_save)

        except Exception as e:
            # TODO: For some reason error messages are sent 2-3 times
            logger.exception(f"Error in agent processing: {str(e)}")
            error_content = f"{self.current_message_content}\n\nError: {str(e)}"
            await self.send_json({"error": error_content})
            await self.update_saved_message(assistant_message, error_content)

    async def update_saved_message(self, message, content):
        """Update a previously saved message with new content"""
        message.content = content
        await message.asave()

    async def get_chat(self, chat_id):
        """Get a chat by ID if it belongs to the current user using async ORM"""
        try:
            return await Chat.objects.aget(id=chat_id, user=self.user)
        except Chat.DoesNotExist:
            logger.warning(f"Chat {chat_id} not found or doesn't belong to user {self.user.email}")
            return None

    async def save_message(self, chat, content, role):
        """Save a message to the database using async ORM"""
        return await ChatMessage.objects.acreate(chat=chat, content=content, role=role)


# from channels.generic.websocket import AsyncJsonWebsocketConsumer  # type: ignore[import-untyped]


# class ChatConsumer(AsyncJsonWebsocketConsumer):
#     async def connect(self):
#         await self.accept()

#     async def disconnect(self, close_code):
#         pass

#     async def receive_json(self, content):
#         await self.send_json({"echo": content})
