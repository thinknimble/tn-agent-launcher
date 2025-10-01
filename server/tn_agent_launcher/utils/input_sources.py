import json
import logging
import mimetypes
from pathlib import Path
from typing import Any, Dict
from urllib.parse import urlparse

import httpx
import pandas as pd
from django.conf import settings
from django.core.files.storage import get_storage_class

from .document_pipeline import DocumentProcessor, is_document_processing_available
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
        "image/tiff",
        "image/bmp",
        # Office document types
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  # .docx
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",  # .pptx
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",  # .xlsx
        # Additional document types
        "application/vnd.ms-word",  # .doc
        "application/vnd.ms-powerpoint",  # .ppt
        "application/vnd.ms-excel",  # .xls
    }

    # Maximum file size in MB
    MAX_FILE_SIZE_MB = 50

    # Request timeout in seconds
    REQUEST_TIMEOUT = 30

    def __init__(self, processing_config: Dict[str, Any] = None):
        self.client = httpx.Client(
            timeout=self.REQUEST_TIMEOUT,
            limits=httpx.Limits(max_keepalive_connections=5, max_connections=10),
            headers={"User-Agent": "TN-Agent-Launcher/1.0 (Content Fetcher)"},
        )
        self.processing_config = processing_config or {}

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

            # Only allow http/https and special agent-output scheme
            if parsed.scheme not in ("http", "https", "agent-output"):
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

    def is_s3_url(self, url: str) -> bool:
        """Check if URL is an S3 URL that we can access with our credentials."""
        try:
            parsed = urlparse(url)
            # Check if it's our S3 bucket
            bucket_name = getattr(settings, "AWS_STORAGE_BUCKET_NAME", "")
            if bucket_name and parsed.hostname == f"{bucket_name}.s3.amazonaws.com":
                return True
            # Also check for s3:// scheme
            if parsed.scheme == "s3":
                return True
            return False
        except Exception:
            return False

    def download_from_s3(self, url: str, sandbox_dir: Path) -> Dict[str, Any]:
        """
        Download content from S3 using django-storages credentials.
        This handles cases where presigned URLs have expired.
        """
        try:
            logger.info(f"Downloading S3 content from: {url}")

            # Parse S3 URL to get key
            parsed = urlparse(url)
            if parsed.scheme == "s3":
                # s3://bucket/key format
                parsed.netloc
                key = parsed.path.lstrip("/")
            else:
                # https://bucket.s3.amazonaws.com/key format
                parsed.hostname.split(".")[0]
                key = parsed.path.lstrip("/")

            # Use django-storages to access the file
            storage_class = get_storage_class(settings.DEFAULT_FILE_STORAGE)
            storage = storage_class()

            # Open the file from S3
            file_obj = storage.open(key.replace(f"{storage.location}/", ""))

            # Generate safe filename
            sandbox_manager = SandboxManager()
            filename = sandbox_manager.get_safe_filename(key)
            file_path = sandbox_dir / filename

            # Download the file
            with open(file_path, "wb") as f:
                for chunk in file_obj.chunks():
                    f.write(chunk)

            file_obj.close()

            # Get file info
            file_size = file_path.stat().st_size
            content_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
            file_type = self._determine_file_type(file_path, content_type)

            logger.info(f"Successfully downloaded {file_size} bytes from S3 to {file_path}")

            return {
                "file_path": file_path,
                "content_type": content_type,
                "file_type": file_type,
                "size_bytes": file_size,
                "filename": filename,
                "source_url": url,
            }

        except Exception as e:
            logger.error(f"Failed to download from S3 {url}: {e}")
            raise ValueError(f"Failed to download from S3: {e}")

    def download_from_agent_output(self, url: str, sandbox_dir: Path) -> Dict[str, Any]:
        """
        Handle agent-output:// URLs by retrieving content from agent execution results.

        Args:
            url: agent-output:// URL with execution ID
            sandbox_dir: Directory to save the content to

        Returns:
            Dict containing file_path, content_type, file_type, and metadata
        """
        try:
            # Extract execution ID from agent-output://123 format
            parsed = urlparse(url)
            execution_id = parsed.netloc or parsed.path.lstrip("/")

            if not execution_id:
                raise ValueError(f"Invalid agent-output URL format: {url}")

            # Import here to avoid circular imports
            from tn_agent_launcher.agent.models import AgentTaskExecution

            # Get the execution and its output
            execution = AgentTaskExecution.objects.get(id=execution_id)
            if not execution.output_data or "result" not in execution.output_data:
                raise ValueError(f"No output data found for execution {execution_id}")

            output_content = execution.output_data["result"]

            # Create a text file with the agent output
            filename = f"agent_output_{execution_id}.txt"
            file_path = sandbox_dir / filename

            # Write the content to file
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(output_content)

            file_size = file_path.stat().st_size

            logger.info(f"Retrieved agent output from execution {execution_id}: {file_size} bytes")

            return {
                "file_path": file_path,
                "content_type": "text/plain",
                "file_type": "text",
                "size_bytes": file_size,
                "filename": filename,
                "source_url": url,
                "agent_execution_id": execution_id,
            }

        except Exception as e:
            logger.error(f"Failed to retrieve agent output from {url}: {e}")
            raise ValueError(f"Failed to retrieve agent output: {e}")

    def download_from_url(self, url: str, sandbox_dir: Path) -> Dict[str, Any]:
        """
        Download content from a URL to the sandbox directory.

        Returns:
            Dict containing file_path, content_type, file_type, and metadata
        """
        if not self.validate_url(url):
            raise ValueError(f"Invalid or unsafe URL: {url}")

        # Check if this is an agent-output URL
        if url.startswith("agent-output://"):
            return self.download_from_agent_output(url, sandbox_dir)

        # Check if this is an S3 URL we can access directly
        if self.is_s3_url(url):
            try:
                return self.download_from_s3(url, sandbox_dir)
            except Exception as e:
                logger.warning(f"S3 direct access failed for {url}, falling back to HTTP: {e}")
                # Fall through to HTTP download if S3 access fails

        try:
            logger.info(f"Downloading content via HTTP from: {url}")

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
        """Extract content from PDF using DocumentProcessor."""
        try:
            processor = DocumentProcessor()
            # Use configuration from processing_config or defaults
            contains_images = self.processing_config.get("contains_images", True)
            extract_images_as_text = self.processing_config.get("extract_images_as_text", True)

            processor.configure_for_pdfs(
                contains_images=contains_images, extract_images_as_text=extract_images_as_text
            )
            result = processor.process_document(str(file_path))
            content = result.markdown_content
            logger.info(f"Successfully extracted PDF content from {file_path}")
            return content
        except Exception as e:
            logger.error(f"Failed to extract PDF content from {file_path}: {e}")
            # Fallback to indicating it's a PDF file
            return f"[PDF file: {file_path.name} - extraction failed: {e}]"

    def extract_image_content(self, file_path: Path) -> str:
        """Extract content from images using DocumentProcessor."""
        try:
            processor = DocumentProcessor()
            # Use configuration from processing_config or defaults
            preprocess_image = self.processing_config.get("preprocess_image", True)
            is_document_with_text = self.processing_config.get("is_document_with_text", True)
            replace_images_with_descriptions = self.processing_config.get(
                "replace_images_with_descriptions", True
            )

            processor.configure_for_images(
                preprocess_image=preprocess_image,
                is_document_with_text=is_document_with_text,
                replace_images_with_descriptions=replace_images_with_descriptions,
            )
            result = processor.process_document(str(file_path))
            content = result.markdown_content
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

    def extract_document_content(self, file_path: Path) -> str:
        """Extract content from various document types using DocumentProcessor."""
        try:
            processor = DocumentProcessor()
            # Configure based on file extension and processing_config
            file_ext = file_path.suffix.lower()

            if file_ext in [".jpg", ".jpeg", ".png", ".tif", ".tiff", ".bmp", ".webp"]:
                # Use configuration from processing_config or defaults for images
                preprocess_image = self.processing_config.get("preprocess_image", True)
                is_document_with_text = self.processing_config.get("is_document_with_text", True)
                replace_images_with_descriptions = self.processing_config.get(
                    "replace_images_with_descriptions", True
                )

                processor.configure_for_images(
                    preprocess_image=preprocess_image,
                    is_document_with_text=is_document_with_text,
                    replace_images_with_descriptions=replace_images_with_descriptions,
                )
            elif file_ext == ".pdf":
                # Use configuration from processing_config or defaults for PDFs
                contains_images = self.processing_config.get("contains_images", True)
                extract_images_as_text = self.processing_config.get("extract_images_as_text", True)

                processor.configure_for_pdfs(
                    contains_images=contains_images, extract_images_as_text=extract_images_as_text
                )

            result = processor.process_document(str(file_path))
            content = result.markdown_content
            logger.info(f"Successfully extracted document content from {file_path}")
            return (
                content
                if content.strip()
                else f"[Document file: {file_path.name} - no content extracted]"
            )
        except Exception as e:
            logger.error(f"Failed to extract document content from {file_path}: {e}")
            return f"[Document file: {file_path.name} - extraction failed: {e}]"

    def process_downloaded_content(self, download_info: Dict[str, Any]) -> Dict[str, Any]:
        """Process downloaded content based on file type."""
        file_path = download_info["file_path"]
        file_type = download_info["file_type"]
        content_type = download_info.get("content_type", "")

        # Check if user wants to skip preprocessing entirely OR if document processing is not available
        skip_preprocessing = self.processing_config.get("skip_preprocessing", False) or not is_document_processing_available()

        if skip_preprocessing:
            # For raw files, prepare BinaryContent for PydanticAI
            try:
                with open(file_path, "rb") as f:
                    file_data = f.read()

                return {
                    **download_info,
                    "processed_content": f"[Raw file for multimodal processing: {file_path.name}]",
                    "content_preview": f"[File ready for direct agent processing: {download_info['filename']}]",
                    "raw_file_mode": True,
                    "binary_data": file_data,
                    "media_type": content_type,
                }
            except Exception as e:
                logger.error(f"Failed to read raw file {file_path}: {e}")
                return {
                    **download_info,
                    "processed_content": f"[Error reading raw file: {file_path.name}]",
                    "content_preview": f"[File processing failed: {download_info['filename']}]",
                    "raw_file_mode": True,
                    "error": str(e),
                }

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

            elif file_path.suffix.lower() in [
                ".docx",
                ".dotx",
                ".docm",
                ".dotm",
                ".pptx",
                ".potx",
                ".ppsx",
                ".pptm",
                ".potm",
                ".ppsm",
                ".xlsx",
                ".xlsm",
                ".html",
                ".htm",
                ".xhtml",
                ".md",
                ".adoc",
                ".asciidoc",
                ".asc",
            ]:
                # Handle Office documents, HTML, Markdown, and AsciiDoc using DocumentProcessor
                content = self.extract_document_content(file_path)
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


def create_pydantic_ai_content(processed_info: Dict[str, Any]) -> Any:
    """
    Convert processed input source to PydanticAI content.

    Returns:
        - BinaryContent for raw files (when skip_preprocessing=True)
        - str for processed text content
    """
    if processed_info.get("raw_file_mode") and "binary_data" in processed_info:
        try:
            from pydantic_ai.messages import BinaryContent

            return BinaryContent(
                data=processed_info["binary_data"],
                media_type=processed_info.get("media_type", "application/octet-stream"),
            )
        except ImportError:
            logger.error("pydantic_ai not available for raw file processing")
            return processed_info.get("processed_content", "")
    else:
        # Return processed text content for traditional preprocessing
        return processed_info.get("processed_content", "")


def download_and_process_url(url: str, processing_config: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Convenience function to download and process a URL in a sandbox environment.

    Args:
        url: The URL to download and process
        processing_config: Configuration dict with processing options:
            General:
                - skip_preprocessing: bool (default: False) - Skip all processing and send raw file to multimodal agent
            For images (when preprocessing enabled):
                - preprocess_image: bool (default: True)
                - is_document_with_text: bool (default: True)
                - replace_images_with_descriptions: bool (default: True)
            For PDFs (when preprocessing enabled):
                - contains_images: bool (default: True)
                - extract_images_as_text: bool (default: True)

    Returns processed content information that can be fed to the LLM.
    """
    with SandboxManager() as sandbox_dir:
        with InputSourceDownloader(processing_config) as downloader:
            # Download the content
            download_info = downloader.download_from_url(url, sandbox_dir)

            # Process the content
            processed_info = downloader.process_downloaded_content(download_info)

            # Remove the file path from the return since it will be cleaned up
            result = {k: v for k, v in processed_info.items() if k != "file_path"}

            return result
