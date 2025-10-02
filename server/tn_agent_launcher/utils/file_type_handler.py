import logging
from enum import Enum
from pathlib import Path
from typing import Any, Dict

logger = logging.getLogger(__name__)


class ProcessingStrategy(Enum):
    """Different strategies for processing files based on their type and user preferences."""

    # Always process as text, regardless of skip_preprocessing setting
    ALWAYS_TEXT = "always_text"

    # Can be sent as raw binary to multimodal models (images, PDFs)
    BINARY_CAPABLE = "binary_capable"

    # Requires document processing (Office docs, etc.)
    DOCUMENT_PROCESSING = "document_processing"

    # Structured data that benefits from parsing (CSV, JSON)
    STRUCTURED_DATA = "structured_data"

    # Unknown or unsupported file type
    UNKNOWN = "unknown"


class FileTypeHandler:
    """Handles file type detection and processing strategy determination."""

    # File type mappings based on content type and extension
    CONTENT_TYPE_MAPPING = {
        # Text-based files that should always be processed as text
        "text/plain": ProcessingStrategy.ALWAYS_TEXT,
        "text/html": ProcessingStrategy.ALWAYS_TEXT,
        "text/markdown": ProcessingStrategy.ALWAYS_TEXT,
        "text/x-markdown": ProcessingStrategy.ALWAYS_TEXT,
        # Structured data files
        "text/csv": ProcessingStrategy.STRUCTURED_DATA,
        "application/json": ProcessingStrategy.STRUCTURED_DATA,
        "application/xml": ProcessingStrategy.STRUCTURED_DATA,
        "text/xml": ProcessingStrategy.STRUCTURED_DATA,
        # Binary files that can be sent to multimodal models
        "application/pdf": ProcessingStrategy.BINARY_CAPABLE,
        "image/jpeg": ProcessingStrategy.BINARY_CAPABLE,
        "image/jpg": ProcessingStrategy.BINARY_CAPABLE,
        "image/png": ProcessingStrategy.BINARY_CAPABLE,
        "image/gif": ProcessingStrategy.BINARY_CAPABLE,
        "image/webp": ProcessingStrategy.BINARY_CAPABLE,
        "image/tiff": ProcessingStrategy.BINARY_CAPABLE,
        "image/bmp": ProcessingStrategy.BINARY_CAPABLE,
        # Office documents that need document processing
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ProcessingStrategy.DOCUMENT_PROCESSING,  # .docx
        "application/vnd.openxmlformats-officedocument.presentationml.presentation": ProcessingStrategy.DOCUMENT_PROCESSING,  # .pptx
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ProcessingStrategy.DOCUMENT_PROCESSING,  # .xlsx
        "application/vnd.ms-word": ProcessingStrategy.DOCUMENT_PROCESSING,  # .doc
        "application/vnd.ms-powerpoint": ProcessingStrategy.DOCUMENT_PROCESSING,  # .ppt
        "application/vnd.ms-excel": ProcessingStrategy.DOCUMENT_PROCESSING,  # .xls
    }

    # Extension-based fallback mapping
    EXTENSION_MAPPING = {
        # Text files
        ".txt": ProcessingStrategy.ALWAYS_TEXT,
        ".md": ProcessingStrategy.ALWAYS_TEXT,
        ".markdown": ProcessingStrategy.ALWAYS_TEXT,
        ".html": ProcessingStrategy.ALWAYS_TEXT,
        ".htm": ProcessingStrategy.ALWAYS_TEXT,
        ".xml": ProcessingStrategy.ALWAYS_TEXT,
        ".adoc": ProcessingStrategy.ALWAYS_TEXT,
        ".asciidoc": ProcessingStrategy.ALWAYS_TEXT,
        ".asc": ProcessingStrategy.ALWAYS_TEXT,
        ".rst": ProcessingStrategy.ALWAYS_TEXT,
        # Structured data
        ".csv": ProcessingStrategy.STRUCTURED_DATA,
        ".json": ProcessingStrategy.STRUCTURED_DATA,
        ".jsonl": ProcessingStrategy.STRUCTURED_DATA,
        ".tsv": ProcessingStrategy.STRUCTURED_DATA,
        # Binary capable
        ".pdf": ProcessingStrategy.BINARY_CAPABLE,
        ".jpg": ProcessingStrategy.BINARY_CAPABLE,
        ".jpeg": ProcessingStrategy.BINARY_CAPABLE,
        ".png": ProcessingStrategy.BINARY_CAPABLE,
        ".gif": ProcessingStrategy.BINARY_CAPABLE,
        ".webp": ProcessingStrategy.BINARY_CAPABLE,
        ".tiff": ProcessingStrategy.BINARY_CAPABLE,
        ".tif": ProcessingStrategy.BINARY_CAPABLE,
        ".bmp": ProcessingStrategy.BINARY_CAPABLE,
        # Document processing required
        ".docx": ProcessingStrategy.DOCUMENT_PROCESSING,
        ".dotx": ProcessingStrategy.DOCUMENT_PROCESSING,
        ".docm": ProcessingStrategy.DOCUMENT_PROCESSING,
        ".dotm": ProcessingStrategy.DOCUMENT_PROCESSING,
        ".doc": ProcessingStrategy.DOCUMENT_PROCESSING,
        ".pptx": ProcessingStrategy.DOCUMENT_PROCESSING,
        ".potx": ProcessingStrategy.DOCUMENT_PROCESSING,
        ".ppsx": ProcessingStrategy.DOCUMENT_PROCESSING,
        ".pptm": ProcessingStrategy.DOCUMENT_PROCESSING,
        ".potm": ProcessingStrategy.DOCUMENT_PROCESSING,
        ".ppsm": ProcessingStrategy.DOCUMENT_PROCESSING,
        ".ppt": ProcessingStrategy.DOCUMENT_PROCESSING,
        ".xlsx": ProcessingStrategy.DOCUMENT_PROCESSING,
        ".xlsm": ProcessingStrategy.DOCUMENT_PROCESSING,
        ".xls": ProcessingStrategy.DOCUMENT_PROCESSING,
    }

    @classmethod
    def get_processing_strategy(cls, file_path: Path, content_type: str) -> ProcessingStrategy:
        """
        Determine the appropriate processing strategy for a file.

        Args:
            file_path: Path to the file
            content_type: MIME content type of the file

        Returns:
            ProcessingStrategy enum indicating how the file should be processed
        """
        # First try content type mapping
        if content_type:
            # Handle generic image/* content types
            if content_type.startswith("image/"):
                return ProcessingStrategy.BINARY_CAPABLE

            strategy = cls.CONTENT_TYPE_MAPPING.get(content_type.lower())
            if strategy:
                logger.debug(
                    f"Determined strategy {strategy} for {file_path} based on content type {content_type}"
                )
                return strategy

        # Fall back to extension-based mapping
        extension = file_path.suffix.lower()
        strategy = cls.EXTENSION_MAPPING.get(extension)
        if strategy:
            logger.debug(
                f"Determined strategy {strategy} for {file_path} based on extension {extension}"
            )
            return strategy

        # Default to unknown
        logger.warning(
            f"Unknown file type for {file_path} (content_type: {content_type}, extension: {extension})"
        )
        return ProcessingStrategy.UNKNOWN

    @classmethod
    def should_send_as_binary(cls, strategy: ProcessingStrategy, skip_preprocessing: bool) -> bool:
        """
        Determine if a file should be sent as raw binary data to the agent.

        Args:
            strategy: The processing strategy for the file
            skip_preprocessing: Whether preprocessing is disabled

        Returns:
            True if file should be sent as binary, False if it should be processed as text
        """
        if not skip_preprocessing:
            # If preprocessing is enabled, never send as binary
            return False

        # Only send as binary if the file type supports it and preprocessing is skipped
        return strategy == ProcessingStrategy.BINARY_CAPABLE

    @classmethod
    def requires_document_processing(cls, strategy: ProcessingStrategy) -> bool:
        """Check if a file requires document processing pipeline."""
        return strategy == ProcessingStrategy.DOCUMENT_PROCESSING

    @classmethod
    def is_structured_data(cls, strategy: ProcessingStrategy) -> bool:
        """Check if a file contains structured data that benefits from parsing."""
        return strategy == ProcessingStrategy.STRUCTURED_DATA

    @classmethod
    def is_text_based(cls, strategy: ProcessingStrategy) -> bool:
        """Check if a file is text-based and should always be processed as text."""
        return strategy in (ProcessingStrategy.ALWAYS_TEXT, ProcessingStrategy.STRUCTURED_DATA)

    @classmethod
    def get_fallback_content_type(cls, file_path: Path) -> str:
        """Get a fallback content type based on file extension."""
        extension = file_path.suffix.lower()

        fallback_types = {
            ".txt": "text/plain",
            ".md": "text/markdown",
            ".html": "text/html",
            ".csv": "text/csv",
            ".json": "application/json",
            ".pdf": "application/pdf",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".gif": "image/gif",
            ".webp": "image/webp",
        }

        return fallback_types.get(extension, "application/octet-stream")


class ProcessingDecision:
    """Encapsulates a processing decision for a file."""

    def __init__(
        self,
        strategy: ProcessingStrategy,
        send_as_binary: bool,
        content_type: str,
        file_path: Path,
        processing_config: Dict[str, Any],
    ):
        self.strategy = strategy
        self.send_as_binary = send_as_binary
        self.content_type = content_type
        self.file_path = file_path
        self.processing_config = processing_config

    @property
    def description(self) -> str:
        """Get a human-readable description of the processing decision."""
        if self.send_as_binary:
            return f"Send as raw binary to multimodal agent ({self.strategy.value})"
        elif self.strategy == ProcessingStrategy.ALWAYS_TEXT:
            return "Process as text content"
        elif self.strategy == ProcessingStrategy.STRUCTURED_DATA:
            return "Parse and format structured data"
        elif self.strategy == ProcessingStrategy.DOCUMENT_PROCESSING:
            return "Extract content using document processor"
        else:
            return f"Process using {self.strategy.value} strategy"


def make_processing_decision(
    file_path: Path, content_type: str, processing_config: Dict[str, Any]
) -> ProcessingDecision:
    """
    Make a comprehensive processing decision for a file.

    Args:
        file_path: Path to the file
        content_type: MIME content type of the file
        processing_config: Configuration dict with user preferences

    Returns:
        ProcessingDecision object with all decision details
    """
    # Determine the processing strategy
    strategy = FileTypeHandler.get_processing_strategy(file_path, content_type)

    # Check if preprocessing should be skipped
    skip_preprocessing = processing_config.get("skip_preprocessing", False)

    # Determine if file should be sent as binary
    send_as_binary = FileTypeHandler.should_send_as_binary(strategy, skip_preprocessing)

    # Use fallback content type if none provided
    if not content_type:
        content_type = FileTypeHandler.get_fallback_content_type(file_path)

    decision = ProcessingDecision(
        strategy=strategy,
        send_as_binary=send_as_binary,
        content_type=content_type,
        file_path=file_path,
        processing_config=processing_config,
    )

    logger.info(f"Processing decision for {file_path}: {decision.description}")
    return decision
