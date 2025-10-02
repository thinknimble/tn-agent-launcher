import logging
import os
import shutil
import tempfile
import uuid
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

logger = logging.getLogger(__name__)


class SandboxManager:
    """Manages temporary sandbox directories for safe file operations."""

    def __init__(self, base_name: str = "agent_task_sandbox"):
        self.base_name = base_name
        self.sandbox_dir: Optional[Path] = None

    def __enter__(self):
        """Create a temporary sandbox directory."""
        try:
            # Create a unique temporary directory
            self.sandbox_dir = Path(tempfile.mkdtemp(prefix=f"{self.base_name}_"))
            logger.info(f"Created sandbox directory: {self.sandbox_dir}")
            return self.sandbox_dir
        except Exception as e:
            logger.error(f"Failed to create sandbox directory: {e}")
            raise

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Clean up the sandbox directory."""
        if self.sandbox_dir and self.sandbox_dir.exists():
            try:
                shutil.rmtree(self.sandbox_dir)
                logger.info(f"Cleaned up sandbox directory: {self.sandbox_dir}")
            except Exception as e:
                logger.error(f"Failed to cleanup sandbox directory {self.sandbox_dir}: {e}")

    def get_safe_filename(self, url: str, max_length: int = 100) -> str:
        """Generate a safe filename from a URL."""
        try:
            parsed = urlparse(url)
            # Get the path part and clean it
            path = parsed.path.strip("/")
            if not path:
                path = "downloaded_file"

            # Extract filename
            filename = Path(path).name
            if not filename:
                filename = "downloaded_file"

            # Remove dangerous characters and limit length
            safe_chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-_"
            filename = "".join(c if c in safe_chars else "_" for c in filename)

            # Ensure it's not too long and add uuid for uniqueness
            if len(filename) > max_length:
                name_part = filename[: max_length - 10]
                ext_part = Path(filename).suffix[:10]
                filename = f"{name_part}{ext_part}"

            # Add UUID to ensure uniqueness
            unique_id = str(uuid.uuid4())[:8]
            name, ext = os.path.splitext(filename)
            return f"{name}_{unique_id}{ext}"

        except Exception as e:
            logger.error(f"Failed to generate safe filename from URL {url}: {e}")
            return f"downloaded_file_{uuid.uuid4().hex[:8]}"

    def validate_file_size(self, file_path: Path, max_size_mb: int = 50) -> bool:
        """Validate that a file is within size limits."""
        try:
            file_size = file_path.stat().st_size
            max_size_bytes = max_size_mb * 1024 * 1024
            if file_size > max_size_bytes:
                logger.warning(
                    f"File {file_path} size {file_size} bytes exceeds limit of {max_size_bytes} bytes"
                )
                return False
            return True
        except Exception as e:
            logger.error(f"Failed to validate file size for {file_path}: {e}")
            return False

    def get_file_type(self, file_path: Path) -> str:
        """Determine the file type based on extension."""
        suffix = file_path.suffix.lower()

        text_extensions = {
            ".txt",
            ".md",
            ".py",
            ".js",
            ".html",
            ".css",
            ".json",
            ".xml",
            ".yml",
            ".yaml",
        }
        image_extensions = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".svg"}
        document_extensions = {".pdf", ".doc", ".docx"}

        if suffix in text_extensions:
            return "text"
        elif suffix in image_extensions:
            return "image"
        elif suffix in document_extensions:
            return "document"
        else:
            return "unknown"
