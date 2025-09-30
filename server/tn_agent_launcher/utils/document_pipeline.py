import re
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional

from docling.datamodel.base_models import InputFormat
from docling.datamodel.pipeline_options import PdfPipelineOptions, granite_picture_description
from docling.document_converter import (
    AsciiDocFormatOption,
    CsvFormatOption,
    DocumentConverter,
    ExcelFormatOption,
    HTMLFormatOption,
    ImageFormatOption,
    MarkdownFormatOption,
    PdfFormatOption,
    PowerpointFormatOption,
    WordFormatOption,
)
from docling_core.types.doc.document import PictureDescriptionData


class DocumentType(Enum):
    PDF = "pdf"
    IMAGE = "image"
    DOCX = "docx"
    PPTX = "pptx"
    XLSX = "xlsx"
    HTML = "html"
    MD = "md"
    CSV = "csv"
    ASCIIDOC = "asciidoc"
    XML_USPTO = "xml_uspto"
    XML_JATS = "xml_jats"
    METS_GBS = "mets_gbs"
    JSON_DOCLING = "json_docling"
    AUDIO = "audio"


@dataclass
class ImageProcessingConfig:
    preprocess_image: bool = True
    is_document_with_text: bool = True
    replace_images_with_descriptions: bool = True
    extract_image_descriptions: bool = True
    generate_picture_images: bool = True
    images_scale: float = 2.0
    description_prompt: str = "Describe the image in three sentences. Be concise and accurate."


@dataclass
class ProcessingMetadata:
    converted_images: bool = False
    image_count: int = 0
    caption_count: int = 0
    annotation_count: int = 0
    image_captions_and_annotations: List[Dict[str, Any]] = field(default_factory=list)
    processing_errors: List[str] = field(default_factory=list)
    document_type: Optional[DocumentType] = None
    file_path: Optional[str] = None


@dataclass
class ProcessingResult:
    markdown_content: str
    html_content: str
    metadata: ProcessingMetadata
    original_document: Any


class DocumentProcessor:
    def __init__(self):
        self.image_config = ImageProcessingConfig()
        self.converter = None

    def configure_for_images(
        self,
        preprocess_image: bool = True,
        is_document_with_text: bool = True,
        replace_images_with_descriptions: bool = True,
    ) -> None:
        """Configure processor for image files"""
        self.image_config.preprocess_image = preprocess_image
        self.image_config.is_document_with_text = is_document_with_text
        self.image_config.replace_images_with_descriptions = replace_images_with_descriptions

    def configure_for_pdfs(
        self, contains_images: bool = True, extract_images_as_text: bool = True
    ) -> None:
        """Configure processor for PDF files"""
        self.image_config.extract_image_descriptions = extract_images_as_text
        if not contains_images:
            self.image_config.generate_picture_images = False
            self.image_config.replace_images_with_descriptions = False

    def _setup_converter(self) -> None:
        """Setup the document converter with current configuration"""
        pipeline_options = PdfPipelineOptions()
        pipeline_options.do_picture_description = self.image_config.extract_image_descriptions
        pipeline_options.picture_description_options = granite_picture_description
        pipeline_options.picture_description_options.prompt = self.image_config.description_prompt
        pipeline_options.images_scale = self.image_config.images_scale
        pipeline_options.generate_picture_images = self.image_config.generate_picture_images

        format_options = {}

        # Configure for different input formats
        if self.image_config.preprocess_image:
            format_options[InputFormat.PDF] = PdfFormatOption(pipeline_options=pipeline_options)
            format_options[InputFormat.IMAGE] = ImageFormatOption(pipeline_options=pipeline_options)
        else:
            format_options[InputFormat.PDF] = PdfFormatOption()
            format_options[InputFormat.IMAGE] = ImageFormatOption()

        # Add support for all other formats
        format_options[InputFormat.DOCX] = WordFormatOption()
        format_options[InputFormat.PPTX] = PowerpointFormatOption()
        format_options[InputFormat.XLSX] = ExcelFormatOption()
        format_options[InputFormat.HTML] = HTMLFormatOption()
        format_options[InputFormat.MD] = MarkdownFormatOption()
        format_options[InputFormat.CSV] = CsvFormatOption()
        format_options[InputFormat.ASCIIDOC] = AsciiDocFormatOption()

        self.converter = DocumentConverter(format_options=format_options)

    def _detect_document_type(self, file_path: str) -> DocumentType:
        """Detect document type from file extension based on docling's FormatToExtensions"""
        path = Path(file_path)
        suffix = path.suffix.lower().lstrip(".")

        # Based on docling's FormatToExtensions mapping
        type_mapping = {
            # DOCX formats
            "docx": DocumentType.DOCX,
            "dotx": DocumentType.DOCX,
            "docm": DocumentType.DOCX,
            "dotm": DocumentType.DOCX,
            # PPTX formats
            "pptx": DocumentType.PPTX,
            "potx": DocumentType.PPTX,
            "ppsx": DocumentType.PPTX,
            "pptm": DocumentType.PPTX,
            "potm": DocumentType.PPTX,
            "ppsm": DocumentType.PPTX,
            # XLSX formats
            "xlsx": DocumentType.XLSX,
            "xlsm": DocumentType.XLSX,
            # PDF
            "pdf": DocumentType.PDF,
            # Images
            "jpg": DocumentType.IMAGE,
            "jpeg": DocumentType.IMAGE,
            "png": DocumentType.IMAGE,
            "tif": DocumentType.IMAGE,
            "tiff": DocumentType.IMAGE,
            "bmp": DocumentType.IMAGE,
            "webp": DocumentType.IMAGE,
            # HTML
            "html": DocumentType.HTML,
            "htm": DocumentType.HTML,
            "xhtml": DocumentType.HTML,
            # Markdown
            "md": DocumentType.MD,
            # CSV
            "csv": DocumentType.CSV,
            # AsciiDoc
            "adoc": DocumentType.ASCIIDOC,
            "asciidoc": DocumentType.ASCIIDOC,
            "asc": DocumentType.ASCIIDOC,
            # XML formats
            "xml": DocumentType.XML_JATS,
            "nxml": DocumentType.XML_JATS,
            "txt": DocumentType.XML_USPTO,  # USPTO can be txt
            # Archives
            "tar.gz": DocumentType.METS_GBS,
            # JSON
            "json": DocumentType.JSON_DOCLING,
            # Audio
            "wav": DocumentType.AUDIO,
            "mp3": DocumentType.AUDIO,
        }

        return type_mapping.get(suffix, DocumentType.PDF)

    def _process_images_in_document(
        self, doc, md_content: str
    ) -> tuple[str, str, ProcessingMetadata]:
        """Process images in the document and generate HTML/markdown content"""
        metadata = ProcessingMetadata()
        metadata.converted_images = True
        metadata.image_count = len(doc.pictures)

        html_buffer = []
        processed_md = md_content

        for pic in doc.pictures:
            # Build HTML representation
            html_item = (
                f"<h3>Picture <code>{pic.self_ref}</code></h3>"
                f'<img src="{pic.image.uri if pic.image else ""}" /><br />'
                f"<h4>Caption</h4>{pic.caption_text(doc=doc)}<br />"
            )

            # Collect all text content
            all_text = pic.caption_text(doc=doc)
            if all_text.strip():
                metadata.caption_count += 1

            # Process annotations
            image_data = {
                "self_ref": pic.self_ref,
                "caption": pic.caption_text(doc=doc),
                "annotations": [],
                "image_uri": pic.image.uri if pic.image else None,
            }

            for annotation in pic.annotations:
                if isinstance(annotation, PictureDescriptionData):
                    html_item += (
                        f"<h4>Annotations ({annotation.provenance})</h4>{annotation.text}<br />\n"
                    )
                    all_text += "\n" + annotation.text
                    metadata.annotation_count += 1
                    image_data["annotations"].append(
                        {"provenance": annotation.provenance, "text": annotation.text}
                    )

            metadata.image_captions_and_annotations.append(image_data)

            # Replace in markdown if configured
            if self.image_config.replace_images_with_descriptions:
                if all_text.strip() == "" and pic.image:
                    replacement = f"![Image]({pic.image.uri})"
                else:
                    replacement = (
                        all_text if all_text.strip() else "_No caption or annotations found._"
                    )

                processed_md = re.sub(r"<!-- image -->", replacement, processed_md, count=1)

            html_buffer.append(html_item)

        html_content = "\n".join(html_buffer)
        return processed_md, html_content, metadata

    def process_document(self, file_path: str) -> ProcessingResult:
        """Process a document and return results with metadata"""
        if not self.converter:
            self._setup_converter()

        try:
            # Convert document
            result = self.converter.convert(file_path)
            doc = result.document

            # Get initial markdown
            md_content = doc.export_to_markdown()

            # Process images if present
            if doc.pictures and self.image_config.extract_image_descriptions:
                processed_md, html_content, metadata = self._process_images_in_document(
                    doc, md_content
                )
            else:
                processed_md = md_content
                html_content = ""
                metadata = ProcessingMetadata()
                metadata.image_count = len(doc.pictures) if doc.pictures else 0

            # Set metadata
            metadata.document_type = self._detect_document_type(file_path)
            metadata.file_path = file_path

            return ProcessingResult(
                markdown_content=processed_md,
                html_content=html_content,
                metadata=metadata,
                original_document=doc,
            )

        except Exception as e:
            metadata = ProcessingMetadata()
            metadata.processing_errors.append(str(e))
            metadata.document_type = self._detect_document_type(file_path)
            metadata.file_path = file_path

            return ProcessingResult(
                markdown_content="", html_content="", metadata=metadata, original_document=None
            )

    def get_user_configuration(self, file_path: str) -> Dict[str, Any]:
        """Get user configuration based on document type"""
        doc_type = self._detect_document_type(file_path)

        if doc_type == DocumentType.IMAGE:
            return {
                "questions": [
                    "Do you want us to preprocess your image or send it straight to the agent?",
                    "Is your image an image of a document with text?",
                    "Do you need the images in this document to be replaced with descriptive text for context?",
                ],
                "defaults": {
                    "preprocess_image": True,
                    "is_document_with_text": True,
                    "replace_images_with_descriptions": True,
                },
            }
        else:
            return {
                "questions": [
                    "Does the document contain images?",
                    "Do the images need to be extracted into text for context?",
                ],
                "defaults": {"contains_images": True, "extract_images_as_text": True},
            }
