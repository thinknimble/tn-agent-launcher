import json
import logging
import mimetypes
from pathlib import Path
from typing import Any, Dict
from urllib.parse import urlparse

import httpx
import pandas as pd
from django.conf import settings
from docling import DocumentConverter

from .sandbox import SandboxManager

logger = logging.getLogger(__name__)


class InputSourceDownloader:
    """Handles downloading and processing of various input sources for agent tasks."""

    # Allowed content types for security
    ALLOWED_CONTENT_TYPES = {
        "text/plain",
        "text/html",
        "text/markdown",
        "text/csv",
        "application/json",
        "application/xml",
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
    }

    # Maximum file size in MB
    MAX_FILE_SIZE_MB = 50

    # Request timeout in seconds
    REQUEST_TIMEOUT = 30

    def __init__(self):
        self.client = httpx.Client(
            timeout=self.REQUEST_TIMEOUT,
            limits=httpx.Limits(max_keepalive_connections=5, max_connections=10),
            headers={"User-Agent": "TN-Agent-Launcher/1.0 (Content Fetcher)"},
        )

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.client.close()

    def validate_url(self, url: str) -> bool:
        """Validate that the URL is safe to download from."""
        try:
            parsed = urlparse(url)

            # Must have a scheme and netloc
            if not parsed.scheme or not parsed.netloc:
                logger.warning(f"Invalid URL format: {url}")
                return False

            # Only allow http/https
            if parsed.scheme not in ("http", "https"):
                logger.warning(f"Unsupported URL scheme: {parsed.scheme}")
                return False

            # Prevent local/private network access for security
            hostname = parsed.hostname
            if hostname:
                # Block localhost, private IPs, etc.
                if hostname.lower() in ("localhost", "127.0.0.1", "0.0.0.0") and settings.IN_PROD:
                    logger.warning(f"Blocked local hostname: {hostname}")
                    return False

                # Block private IP ranges (basic check)
                if hostname.startswith(("10.", "172.", "192.168.")):
                    logger.warning(f"Blocked private IP range: {hostname}")
                    return False

            return True

        except Exception as e:
            logger.error(f"URL validation failed for {url}: {e}")
            return False

    def download_from_url(self, url: str, sandbox_dir: Path) -> Dict[str, Any]:
        """
        Download content from a URL to the sandbox directory.

        Returns:
            Dict containing file_path, content_type, file_type, and metadata
        """
        if not self.validate_url(url):
            raise ValueError(f"Invalid or unsafe URL: {url}")

        try:
            logger.info(f"Downloading content from: {url}")

            # Make the request with streaming to handle large files
            with self.client.stream("GET", url) as response:
                response.raise_for_status()

                # Check content type
                content_type = response.headers.get("content-type", "").split(";")[0].lower()
                if content_type not in self.ALLOWED_CONTENT_TYPES:
                    raise ValueError(f"Unsupported content type: {content_type}")

                # Check content length if provided
                content_length = response.headers.get("content-length")
                if content_length:
                    size_mb = int(content_length) / (1024 * 1024)
                    if size_mb > self.MAX_FILE_SIZE_MB:
                        raise ValueError(
                            f"File too large: {size_mb:.2f}MB (max: {self.MAX_FILE_SIZE_MB}MB)"
                        )

                # Generate safe filename
                sandbox_manager = SandboxManager()
                filename = sandbox_manager.get_safe_filename(url)

                # Determine extension from content type if not present
                if not Path(filename).suffix and content_type:
                    ext = mimetypes.guess_extension(content_type)
                    if ext:
                        filename = f"{Path(filename).stem}{ext}"

                file_path = sandbox_dir / filename

                # Download with size checking
                total_size = 0
                max_size_bytes = self.MAX_FILE_SIZE_MB * 1024 * 1024

                with open(file_path, "wb") as f:
                    for chunk in response.iter_bytes(chunk_size=8192):
                        total_size += len(chunk)
                        if total_size > max_size_bytes:
                            # Clean up partial file
                            file_path.unlink(missing_ok=True)
                            raise ValueError(
                                f"File too large: exceeded {self.MAX_FILE_SIZE_MB}MB during download"
                            )
                        f.write(chunk)

                # Determine file type
                file_type = self._determine_file_type(file_path, content_type)

                logger.info(f"Successfully downloaded {total_size} bytes to {file_path}")

                return {
                    "file_path": file_path,
                    "content_type": content_type,
                    "file_type": file_type,
                    "size_bytes": total_size,
                    "filename": filename,
                    "source_url": url,
                }

        except httpx.RequestError as e:
            logger.error(f"Network error downloading from {url}: {e}")
            raise ValueError(f"Failed to download from URL: {e}")
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error downloading from {url}: {e}")
            raise ValueError(f"HTTP error {e.response.status_code}: {e}")
        except Exception as e:
            logger.error(f"Unexpected error downloading from {url}: {e}")
            raise

    def _determine_file_type(self, file_path: Path, content_type: str) -> str:
        """Determine the file type for processing."""
        # First check content type
        if content_type.startswith("text/"):
            return "text"
        elif content_type.startswith("image/"):
            return "image"
        elif content_type == "application/pdf":
            return "pdf"
        elif content_type == "application/json":
            return "json"

        # Fall back to extension-based detection
        sandbox_manager = SandboxManager()
        return sandbox_manager.get_file_type(file_path)

    def read_text_content(self, file_path: Path) -> str:
        """Read text content from a file."""
        try:
            # Try common encodings
            encodings = ["utf-8", "utf-16", "iso-8859-1", "cp1252"]

            for encoding in encodings:
                try:
                    with open(file_path, "r", encoding=encoding) as f:
                        content = f.read()
                    logger.info(f"Successfully read text file with {encoding} encoding")
                    return content
                except UnicodeDecodeError:
                    continue

            # If all encodings fail, read as binary and decode errors
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()
            logger.warning("Read text file with error replacement due to encoding issues")
            return content

        except Exception as e:
            logger.error(f"Failed to read text content from {file_path}: {e}")
            raise

    def extract_pdf_content(self, file_path: Path) -> str:
        """Extract content from PDF using docling."""
        try:
            converter = DocumentConverter()
            result = converter.convert(file_path)
            content = result.document.export_to_markdown()
            logger.info(f"Successfully extracted PDF content from {file_path}")
            return content
        except Exception as e:
            logger.error(f"Failed to extract PDF content from {file_path}: {e}")
            # Fallback to indicating it's a PDF file
            return f"[PDF file: {file_path.name} - extraction failed: {e}]"

    def extract_image_content(self, file_path: Path) -> str:
        """Extract content from images using docling."""
        try:
            converter = DocumentConverter()
            result = converter.convert(file_path)
            content = result.document.export_to_markdown()
            logger.info(f"Successfully extracted image content from {file_path}")
            return (
                content if content.strip() else f"[Image file: {file_path.name} - no text detected]"
            )
        except Exception as e:
            logger.error(f"Failed to extract image content from {file_path}: {e}")
            # Fallback to indicating it's an image file
            return f"[Image file: {file_path.name} - extraction failed: {e}]"

    def process_csv_content(self, file_path: Path) -> str:
        """Process CSV file and return structured summary."""
        try:
            # Read CSV with pandas
            df = pd.read_csv(file_path)

            # Create summary
            summary = f"CSV File: {file_path.name}\n"
            summary += f"Dimensions: {df.shape[0]} rows, {df.shape[1]} columns\n"
            summary += f"Columns: {', '.join(df.columns.tolist())}\n\n"

            # Add data types
            summary += "Column Data Types:\n"
            for col, dtype in df.dtypes.items():
                summary += f"- {col}: {dtype}\n"
            summary += "\n"

            # Add first few rows as preview
            summary += "Data Preview (first 5 rows):\n"
            summary += df.head().to_string(index=False)

            # Add basic statistics for numeric columns
            numeric_cols = df.select_dtypes(include=["number"]).columns
            if len(numeric_cols) > 0:
                summary += "\n\nNumeric Column Statistics:\n"
                summary += df[numeric_cols].describe().to_string()

            logger.info(f"Successfully processed CSV file {file_path}")
            return summary

        except Exception as e:
            logger.error(f"Failed to process CSV file {file_path}: {e}")
            # Fallback to reading as text
            try:
                return self.read_text_content(file_path)
            except Exception as e2:
                return f"[CSV file: {file_path.name} - processing failed: {e} {e2}]"

    def process_json_content(self, file_path: Path) -> str:
        """Process JSON file and return formatted content."""
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            # Create structured summary
            summary = f"JSON File: {file_path.name}\n"

            if isinstance(data, dict):
                summary += f"Type: Object with {len(data)} keys\n"
                summary += f"Keys: {', '.join(list(data.keys())[:10])}{'...' if len(data) > 10 else ''}\n\n"
            elif isinstance(data, list):
                summary += f"Type: Array with {len(data)} items\n"
                if len(data) > 0:
                    first_item = data[0]
                    if isinstance(first_item, dict):
                        summary += f"First item keys: {', '.join(list(first_item.keys())[:5])}\n\n"

            # Pretty print the JSON (truncate if too long)
            formatted_json = json.dumps(data, indent=2, ensure_ascii=False)
            if len(formatted_json) > 10000:
                summary += "Content (first 10,000 characters):\n"
                summary += formatted_json[:10000] + "\n... [truncated]"
            else:
                summary += "Content:\n"
                summary += formatted_json

            logger.info(f"Successfully processed JSON file {file_path}")
            return summary

        except Exception as e:
            logger.error(f"Failed to process JSON file {file_path}: {e}")
            # Fallback to reading as text
            try:
                return self.read_text_content(file_path)
            except Exception as e2:
                return f"[JSON file: {file_path.name} - processing failed: {e} {e2}]"

    def process_downloaded_content(self, download_info: Dict[str, Any]) -> Dict[str, Any]:
        """Process downloaded content based on file type."""
        file_path = download_info["file_path"]
        file_type = download_info["file_type"]
        content_type = download_info.get("content_type", "")

        try:
            if file_type == "pdf":
                content = self.extract_pdf_content(file_path)
                return {
                    **download_info,
                    "processed_content": content,
                    "content_preview": content[:500] + "..." if len(content) > 500 else content,
                }

            elif file_type == "image":
                content = self.extract_image_content(file_path)
                return {
                    **download_info,
                    "processed_content": content,
                    "content_preview": content[:200] + "..." if len(content) > 200 else content,
                }

            elif file_type == "json" or content_type == "application/json":
                content = self.process_json_content(file_path)
                return {
                    **download_info,
                    "processed_content": content,
                    "content_preview": content[:500] + "..." if len(content) > 500 else content,
                }

            elif content_type == "text/csv" or file_path.suffix.lower() == ".csv":
                content = self.process_csv_content(file_path)
                return {
                    **download_info,
                    "processed_content": content,
                    "content_preview": content[:500] + "..." if len(content) > 500 else content,
                }

            elif file_type == "text":
                content = self.read_text_content(file_path)
                return {
                    **download_info,
                    "processed_content": content,
                    "content_preview": content[:500] + "..." if len(content) > 500 else content,
                }

            else:
                # Unknown file type, try to read as text
                try:
                    content = self.read_text_content(file_path)
                    return {
                        **download_info,
                        "processed_content": content,
                        "content_preview": content[:500] + "..." if len(content) > 500 else content,
                    }
                except Exception:
                    return {
                        **download_info,
                        "processed_content": f"Binary or unreadable file: {file_path.name}",
                        "content_preview": f"[Unknown file type: {download_info['filename']}]",
                    }

        except Exception as e:
            logger.error(f"Failed to process downloaded content: {e}")
            raise


def download_and_process_url(url: str) -> Dict[str, Any]:
    """
    Convenience function to download and process a URL in a sandbox environment.

    Returns processed content information that can be fed to the LLM.
    """
    with SandboxManager() as sandbox_dir:
        with InputSourceDownloader() as downloader:
            # Download the content
            download_info = downloader.download_from_url(url, sandbox_dir)

            # Process the content
            processed_info = downloader.process_downloaded_content(download_info)

            # Remove the file path from the return since it will be cleaned up
            result = {k: v for k, v in processed_info.items() if k != "file_path"}

            return result
