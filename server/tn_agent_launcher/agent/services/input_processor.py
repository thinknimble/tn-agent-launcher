import logging
from typing import Any, Dict, List

from tn_agent_launcher.utils.input_sources import (
    create_pydantic_ai_content,
    download_and_process_url,
)

logger = logging.getLogger(__name__)


class InputSourceProcessor:
    """Handles processing of input sources for agent tasks."""

    def __init__(self):
        pass

    def process_input_sources(self, input_sources: List[Any]) -> Dict[str, Any]:
        """
        Process all input sources and return processed data.

        Returns:
            Dict containing:
                - input_sources_content: List of processed sources
                - multimodal_content: List for PydanticAI
                - has_raw_files: Boolean indicating if raw files are present
        """
        if not input_sources:
            return {"input_sources_content": [], "multimodal_content": [], "has_raw_files": False}

        logger.info(f"Processing {len(input_sources)} input sources")

        input_sources_content = []
        multimodal_content = []
        has_raw_files = False

        for source in input_sources:
            processed_source = self._process_single_source(source)
            if processed_source:
                input_sources_content.append(processed_source)

                # Check for multimodal content
                if processed_source.get("raw_file_mode"):
                    has_raw_files = True
                    pydantic_content = create_pydantic_ai_content(processed_source)
                    if pydantic_content:
                        multimodal_content.append(pydantic_content)
                        logger.info(
                            f"Added multimodal content for {processed_source.get('filename', 'unknown file')}"
                        )

        return {
            "input_sources_content": input_sources_content,
            "multimodal_content": multimodal_content,
            "has_raw_files": has_raw_files,
        }

    def _process_single_source(self, source: Any) -> Dict[str, Any]:
        """Process a single input source."""
        url, source_type, filename, content_type, size, processing_config = (
            self._extract_source_metadata(source)
        )

        if not url:
            logger.warning(f"Skipping input source with missing URL: {source}")
            return None

        try:
            processed_content = download_and_process_url(url, processing_config)

            # Enhance with original metadata
            if filename:
                processed_content["original_filename"] = filename
            if content_type:
                processed_content["original_content_type"] = content_type
            if size:
                processed_content["original_size"] = size
            processed_content["source_type"] = source_type

            logger.info(f"Successfully processed {source_type} input source: {url}")
            return processed_content

        except Exception as e:
            logger.error(f"Failed to process input source {url}: {e}")
            return {
                "source_url": url,
                "source_type": source_type,
                "error": str(e),
                "processed_content": f"[Error processing {source_type} URL: {url}]",
                "original_filename": filename,
            }

    def _extract_source_metadata(self, source: Any) -> tuple:
        """Extract metadata from source object or string."""
        if isinstance(source, dict):
            url = source.get("url")
            source_type = source.get("source_type", "unknown")
            filename = source.get("filename")
            content_type = source.get("content_type")
            size = source.get("size")

            # Extract processing configuration
            processing_config = {
                "skip_preprocessing": source.get("skip_preprocessing", False),
                "preprocess_image": source.get("preprocess_image", True),
                "is_document_with_text": source.get("is_document_with_text", True),
                "replace_images_with_descriptions": source.get(
                    "replace_images_with_descriptions", True
                ),
                "contains_images": source.get("contains_images", True),
                "extract_images_as_text": source.get("extract_images_as_text", True),
            }
        else:
            # Backward compatibility for simple URL strings
            url = source
            source_type = "public_url"
            filename = None
            content_type = None
            size = None
            processing_config = {}

        return url, source_type, filename, content_type, size, processing_config

    def create_enhanced_instruction(
        self, base_instruction: str, input_sources_content: List[Dict]
    ) -> str:
        """Create enhanced instruction with input sources content."""
        if not input_sources_content:
            return base_instruction

        sources_text = "\n\n--- INPUT SOURCES ---\n"

        for i, source in enumerate(input_sources_content, 1):
            sources_text += self._format_source_content(i, source)

        return f"{base_instruction}\n{sources_text}"

    def _format_source_content(self, index: int, source: Dict) -> str:
        """Format a single source's content for the instruction."""
        source_url = source.get("source_url", "Unknown")
        source_type = source.get("source_type", "unknown")

        content = f"\nSource {index}: {source_url}\n"
        content += f"Source Type: {source_type}\n"

        if source.get("error"):
            content += f"Error: {source.get('error')}\n"
        else:
            content_type = source.get("content_type", "unknown")
            file_type = source.get("file_type", "unknown")
            filename = source.get("filename", source.get("original_filename", "unknown"))

            content += f"File Type: {file_type} ({content_type})\n"
            content += f"Filename: {filename}\n"

            # Include the full content for text files
            if file_type in ("text", "json"):
                content += f"Content:\n{source.get('processed_content', '[No content]')}\n"
            else:
                # For binary files, provide metadata and description
                content += f"Description: {source.get('processed_content', '[Binary file]')}\n"
                if "size_bytes" in source:
                    size_mb = source["size_bytes"] / (1024 * 1024)
                    content += f"File Size: {size_mb:.2f} MB\n"
                elif source.get("original_size"):
                    size_mb = source["original_size"] / (1024 * 1024)
                    content += f"Original File Size: {size_mb:.2f} MB\n"

        content += "\n" + "-" * 50 + "\n"
        return content

    def sanitize_input_sources(self, input_sources_content: List[Dict]) -> List[Dict]:
        """Remove binary data from input sources for JSON storage."""
        sanitized_sources = []
        for source in input_sources_content:
            sanitized_source = {k: v for k, v in source.items() if k != "binary_data"}
            sanitized_sources.append(sanitized_source)
        return sanitized_sources
