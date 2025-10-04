"""
WebSocket diagnostic utilities for debugging connection issues.
"""

import json
import logging
from datetime import datetime
from typing import Any, Dict

logger = logging.getLogger(__name__)


class WebSocketDiagnostics:
    """Diagnostic utilities for WebSocket connections."""

    def __init__(self, consumer_instance):
        self.consumer = consumer_instance
        self.connection_start = datetime.now()
        self.message_count = 0
        self.error_count = 0

    def log_connection_start(self):
        """Log when a WebSocket connection starts."""
        logger.info(
            f"WebSocket connection started for user: {getattr(self.consumer, 'user', 'Anonymous')}"
        )
        logger.info(f"Connection scope: {self.consumer.scope.get('type', 'unknown')}")
        logger.info(f"Headers: {dict(self.consumer.scope.get('headers', []))}")

    def log_message_received(self, data: Dict[str, Any]):
        """Log when a message is received."""
        self.message_count += 1
        logger.info(
            f"Message #{self.message_count} received: {json.dumps(data, default=str)[:200]}..."
        )

    def log_message_sent(self, data: Dict[str, Any]):
        """Log when a message is sent."""
        logger.info(f"Message sent: {json.dumps(data, default=str)[:200]}...")

    def log_error(self, error: Exception, context: str = ""):
        """Log an error with context."""
        self.error_count += 1
        logger.error(f"WebSocket error #{self.error_count} in {context}: {str(error)}")
        logger.exception("Full traceback:")

    def log_disconnection(self, close_code: int):
        """Log when the WebSocket disconnects."""
        duration = datetime.now() - self.connection_start
        logger.info(f"WebSocket disconnected after {duration.total_seconds():.2f}s")
        logger.info(f"Close code: {close_code}")
        logger.info(f"Messages processed: {self.message_count}")
        logger.info(f"Errors encountered: {self.error_count}")

        # Common close codes and their meanings
        close_code_meanings = {
            1000: "Normal closure",
            1001: "Going away",
            1002: "Protocol error",
            1003: "Unsupported data",
            1006: "Abnormal closure (no close frame)",
            1007: "Invalid frame payload data",
            1008: "Policy violation",
            1009: "Message too big",
            1010: "Mandatory extension",
            1011: "Internal server error",
            1015: "TLS handshake error",
        }

        meaning = close_code_meanings.get(close_code, "Unknown close code")
        logger.info(f"Close code meaning: {meaning}")

        if close_code in [1006, 1011]:
            logger.warning("This close code typically indicates a server-side issue!")

    def get_connection_health(self) -> Dict[str, Any]:
        """Get current connection health status."""
        duration = datetime.now() - self.connection_start
        return {
            "duration_seconds": duration.total_seconds(),
            "messages_processed": self.message_count,
            "errors_encountered": self.error_count,
            "health_score": max(0, 100 - (self.error_count * 10)),
            "user": str(getattr(self.consumer, "user", "Anonymous")),
        }


def add_websocket_diagnostics(consumer_class):
    """Decorator to add diagnostic capabilities to a WebSocket consumer."""

    original_connect = consumer_class.connect
    original_disconnect = consumer_class.disconnect
    original_receive_json = consumer_class.receive_json
    original_send_json = consumer_class.send_json

    async def connect_with_diagnostics(self):
        self.diagnostics = WebSocketDiagnostics(self)
        self.diagnostics.log_connection_start()
        return await original_connect(self)

    async def disconnect_with_diagnostics(self, close_code):
        if hasattr(self, "diagnostics"):
            self.diagnostics.log_disconnection(close_code)
        return await original_disconnect(self, close_code)

    async def receive_json_with_diagnostics(self, data):
        if hasattr(self, "diagnostics"):
            self.diagnostics.log_message_received(data)
        try:
            return await original_receive_json(self, data)
        except Exception as e:
            if hasattr(self, "diagnostics"):
                self.diagnostics.log_error(e, "receive_json")
            raise

    async def send_json_with_diagnostics(self, data, close=False):
        if hasattr(self, "diagnostics"):
            self.diagnostics.log_message_sent(data)
        try:
            return await original_send_json(self, data, close)
        except Exception as e:
            if hasattr(self, "diagnostics"):
                self.diagnostics.log_error(e, "send_json")
            raise

    # Replace methods
    consumer_class.connect = connect_with_diagnostics
    consumer_class.disconnect = disconnect_with_diagnostics
    consumer_class.receive_json = receive_json_with_diagnostics
    consumer_class.send_json = send_json_with_diagnostics

    return consumer_class
