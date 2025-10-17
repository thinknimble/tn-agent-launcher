"""
Management command to test WebSocket connectivity and diagnose issues.
"""

import asyncio
import json
import logging

import websockets
from channels.layers import get_channel_layer
from django.conf import settings
from django.core.management.base import BaseCommand

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Test WebSocket connectivity and diagnose common issues"

    def add_arguments(self, parser):
        parser.add_argument(
            "--host",
            type=str,
            default="localhost",
            help="WebSocket host to test (default: localhost)",
        )
        parser.add_argument(
            "--port", type=int, default=8000, help="WebSocket port to test (default: 8000)"
        )
        parser.add_argument("--token", type=str, help="Authentication token for testing")

    def handle(self, *args, **options):
        """Run WebSocket diagnostics."""
        self.stdout.write("🔍 Starting WebSocket diagnostics...")

        # Test 1: Channel layer connectivity
        self.test_channel_layer()

        # Test 2: WebSocket connection
        asyncio.run(
            self.test_websocket_connection(
                host=options["host"], port=options["port"], token=options.get("token")
            )
        )

    def test_channel_layer(self):
        """Test if the channel layer (Redis) is working."""
        self.stdout.write("\n📡 Testing channel layer connectivity...")

        try:
            channel_layer = get_channel_layer()
            if channel_layer is None:
                self.stdout.write(self.style.ERROR("❌ No channel layer configured!"))
                return False

            # Test basic connectivity
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

            async def test_redis():
                try:
                    # Send a test message
                    await channel_layer.send(
                        "test_channel", {"type": "test.message", "text": "Hello from diagnostics"}
                    )

                    # Try to receive it
                    message = await channel_layer.receive("test_channel")
                    return message is not None
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"❌ Channel layer error: {e}"))
                    return False

            result = loop.run_until_complete(test_redis())
            loop.close()

            if result:
                self.stdout.write(self.style.SUCCESS("✅ Channel layer working correctly"))
                return True
            else:
                self.stdout.write(self.style.ERROR("❌ Channel layer not responding"))
                return False

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Channel layer test failed: {e}"))
            return False

    async def test_websocket_connection(self, host="localhost", port=8000, token=None):
        """Test WebSocket connection."""
        self.stdout.write(f"\n🌐 Testing WebSocket connection to ws://{host}:{port}/ws/chat/...")

        # Build WebSocket URL
        ws_url = f"ws://{host}:{port}/ws/chat/"
        headers = {}

        if token:
            headers["Authorization"] = f"Token {token}"
            self.stdout.write(f"🔑 Using authentication token: {token[:10]}...")

        try:
            # Build headers for websockets library
            headers_list = []
            if headers:
                headers_list = [(k, v) for k, v in headers.items()]

            async with websockets.connect(
                ws_url, additional_headers=headers_list, close_timeout=10
            ) as websocket:
                self.stdout.write(self.style.SUCCESS("✅ WebSocket connection established"))

                # Test sending a simple message
                test_message = {
                    "messages": [{"role": "user", "content": "test"}],
                    "chat_id": "00000000-0000-0000-0000-000000000000",  # Invalid ID for testing
                }

                await websocket.send(json.dumps(test_message))
                self.stdout.write("📤 Test message sent")

                # Wait for response
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=5)
                    response_data = json.loads(response)
                    self.stdout.write(f"📥 Response received: {response_data}")

                    if "error" in response_data:
                        self.stdout.write(
                            self.style.WARNING(
                                f"⚠️  Expected error response: {response_data['error']}"
                            )
                        )
                    else:
                        self.stdout.write(self.style.SUCCESS("✅ WebSocket communication working"))

                except asyncio.TimeoutError:
                    self.stdout.write(self.style.ERROR("❌ No response received within 5 seconds"))

        except websockets.exceptions.ConnectionClosed as e:
            self.stdout.write(self.style.ERROR(f"❌ WebSocket connection closed: {e}"))
            self.diagnose_connection_close(e.code)

        except websockets.exceptions.WebSocketException as e:
            self.stdout.write(self.style.ERROR(f"❌ WebSocket error: {e}"))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Connection failed: {e}"))
            self.suggest_fixes()

    def diagnose_connection_close(self, close_code):
        """Provide diagnosis based on close code."""
        diagnoses = {
            1000: "Normal closure - WebSocket working correctly",
            1001: "Server going away - Check if server is running",
            1002: "Protocol error - Check message format",
            1006: "Abnormal closure - Often indicates Docker/network issues",
            1011: "Internal server error - Check server logs",
            1015: "TLS handshake error - Check SSL configuration",
        }

        diagnosis = diagnoses.get(close_code, "Unknown close code")
        self.stdout.write(f"🔍 Close code {close_code}: {diagnosis}")

    def suggest_fixes(self):
        """Suggest common fixes for WebSocket issues."""
        self.stdout.write("\n🛠️  Common fixes for WebSocket issues in Docker:")
        self.stdout.write("1. Check if Redis is running: docker-compose logs redis")
        self.stdout.write("2. Check server logs: docker-compose logs server")
        self.stdout.write("3. Verify ALLOWED_HOSTS includes your container IP")
        self.stdout.write("4. Ensure Docker ports are properly exposed")
        self.stdout.write("5. Check CORS settings for WebSocket origins")
        self.stdout.write("6. Verify authentication token is valid")

        # Show current Django settings
        self.stdout.write("\n⚙️  Current Django settings:")
        self.stdout.write(f"ALLOWED_HOSTS: {getattr(settings, 'ALLOWED_HOSTS', 'Not set')}")
        self.stdout.write(f"ASGI_APPLICATION: {getattr(settings, 'ASGI_APPLICATION', 'Not set')}")

        try:
            channel_config = getattr(settings, "CHANNEL_LAYERS", {})
            if channel_config:
                default_config = channel_config.get("default", {})
                backend = default_config.get("BACKEND", "Not configured")
                hosts = default_config.get("CONFIG", {}).get("hosts", "Not configured")
                self.stdout.write(f"CHANNEL_LAYERS backend: {backend}")
                self.stdout.write(f"CHANNEL_LAYERS hosts: {hosts}")
        except Exception:
            self.stdout.write("CHANNEL_LAYERS: Error reading configuration")
