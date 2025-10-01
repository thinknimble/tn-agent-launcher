# Document Processing Configuration

This project supports optional document preprocessing using the `docling` library. Document preprocessing can extract text and images from PDFs, Word documents, PowerPoint presentations, and other file formats before sending them to the AI agent.

## Environment Configuration

Document processing is controlled by the `ENABLE_DOC_PREPROCESSING` environment variable:

- **Default behavior**: 
  - `False` on Heroku (auto-detected)
  - `False` in local development (changed from True to avoid installation issues)
- **Override**: Set `ENABLE_DOC_PREPROCESSING=true` to force enable (requires dependencies)

## Installation Options

### Option 1: With Document Processing (Recommended for local development)

```bash
# Install with optional document processing dependencies
uv sync --extra doc-processing
```

### Option 2: Without Document Processing (Default, works on Heroku)

```bash
# Install without document processing (default)
uv sync
```

## Platform-Specific Setup

### Local Development
```bash
# Enable document processing
uv sync --extra doc-processing
export ENABLE_DOC_PREPROCESSING=true
```

### Heroku Deployment
```bash
# Use default installation (no extra dependencies needed)
# Document processing will be automatically disabled
```

### Custom Deployment
```bash
# Install with document processing if your platform supports it
uv sync --extra doc-processing
export ENABLE_DOC_PREPROCESSING=true
```

## How It Works

1. **Frontend**: Checks `/api/config/` endpoint to determine if document processing is available
2. **Backend**: 
   - Automatically detects Heroku environment and disables doc processing
   - Falls back to sending raw files to multimodal AI agents when processing unavailable
   - Shows appropriate UI options based on server capabilities

## File Processing Behavior

### When Document Processing is Enabled
- Users can choose between raw file upload or preprocessed text extraction
- Supports advanced options for images (OCR, descriptions) and PDFs (image extraction)
- Text extraction from Word, PowerPoint, Excel, and other document formats

### When Document Processing is Disabled
- All files are sent directly to the AI agent as raw binary data
- Relies on the AI agent's multimodal capabilities to process files
- UI automatically hides preprocessing options and shows appropriate messaging

## Troubleshooting

### "Document processing not available" error
- Run `uv sync --extra doc-processing` to install dependencies
- Set `ENABLE_DOC_PREPROCESSING=true` in environment
- Verify docling installation: `python -c "import docling; print('OK')"`

### Heroku build failures related to docling
- Ensure you're not manually installing docling in requirements
- Use the default `uv sync` command without `--extra` flags
- The system will automatically work without document processing on Heroku