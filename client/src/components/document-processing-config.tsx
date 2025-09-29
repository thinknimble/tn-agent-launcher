import React, { useState } from 'react'
import { Button } from './button'

interface DocumentProcessingConfig {
  skipPreprocessing: boolean
  // Image processing options
  preprocessImage: boolean
  isDocumentWithText: boolean
  replaceImagesWithDescriptions: boolean
  // PDF processing options
  containsImages: boolean
  extractImagesAsText: boolean
}

interface DocumentProcessingConfigModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (config: DocumentProcessingConfig) => void
  filename: string
  contentType?: string
}

const isImageFile = (contentType?: string): boolean => {
  return contentType?.startsWith('image/') || false
}

const isPdfFile = (contentType?: string): boolean => {
  return contentType === 'application/pdf'
}

export const DocumentProcessingConfigModal: React.FC<DocumentProcessingConfigModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  filename,
  contentType,
}) => {
  const [config, setConfig] = useState<DocumentProcessingConfig>({
    skipPreprocessing: false,
    // Image processing defaults
    preprocessImage: true,
    isDocumentWithText: true,
    replaceImagesWithDescriptions: true,
    // PDF processing defaults
    containsImages: true,
    extractImagesAsText: true,
  })

  const isImage = isImageFile(contentType)
  const isPdf = isPdfFile(contentType)

  if (!isOpen) return null

  const handleConfirm = () => {
    onConfirm(config)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold text-primary-600">
          Document Processing Options
        </h3>
        
        <p className="mb-4 text-sm text-primary-500">
          Configure how <strong>{filename}</strong> should be processed for the agent.
        </p>

        <div className="space-y-4">
          {/* Skip preprocessing option */}
          <div className="rounded-lg border border-primary-200 p-4">
            <label className="flex items-start space-x-3">
              <input
                type="checkbox"
                checked={config.skipPreprocessing}
                onChange={(e) =>
                  setConfig({ ...config, skipPreprocessing: e.target.checked })
                }
                className="mt-1 h-4 w-4 rounded border-primary-300 text-primary-600 focus:ring-primary-500"
              />
              <div>
                <span className="font-medium text-primary-700">
                  Send file directly to agent (recommended for multimodal models)
                </span>
                <p className="text-sm text-primary-500">
                  Skip all preprocessing and let the agent handle the raw file directly.
                </p>
              </div>
            </label>
          </div>

          {/* Conditional processing options when not skipping */}
          {!config.skipPreprocessing && (
            <div className="space-y-4">
              {isImage && (
                <div className="rounded-lg border border-blue-200 bg-blue-25 p-4">
                  <h4 className="mb-3 font-medium text-blue-700">Image Processing Options</h4>
                  <div className="space-y-3">
                    <label className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={config.preprocessImage}
                        onChange={(e) =>
                          setConfig({ ...config, preprocessImage: e.target.checked })
                        }
                        className="mt-1 h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-blue-700">
                          Preprocess your image
                        </span>
                        <p className="text-xs text-blue-600">
                          Apply image processing before sending to agent
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={config.isDocumentWithText}
                        onChange={(e) =>
                          setConfig({ ...config, isDocumentWithText: e.target.checked })
                        }
                        className="mt-1 h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-blue-700">
                          Image contains text/document content
                        </span>
                        <p className="text-xs text-blue-600">
                          Enable if this image shows a document with readable text
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={config.replaceImagesWithDescriptions}
                        onChange={(e) =>
                          setConfig({ ...config, replaceImagesWithDescriptions: e.target.checked })
                        }
                        className="mt-1 h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-blue-700">
                          Replace images with descriptive text
                        </span>
                        <p className="text-xs text-blue-600">
                          Convert images to text descriptions for context
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {isPdf && (
                <div className="rounded-lg border border-green-200 bg-green-25 p-4">
                  <h4 className="mb-3 font-medium text-green-700">PDF Processing Options</h4>
                  <div className="space-y-3">
                    <label className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={config.containsImages}
                        onChange={(e) =>
                          setConfig({ ...config, containsImages: e.target.checked })
                        }
                        className="mt-1 h-4 w-4 rounded border-green-300 text-green-600 focus:ring-green-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-green-700">
                          Document contains images
                        </span>
                        <p className="text-xs text-green-600">
                          Enable if this PDF has images, charts, or figures
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={config.extractImagesAsText}
                        onChange={(e) =>
                          setConfig({ ...config, extractImagesAsText: e.target.checked })
                        }
                        className="mt-1 h-4 w-4 rounded border-green-300 text-green-600 focus:ring-green-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-green-700">
                          Extract images as text for context
                        </span>
                        <p className="text-xs text-green-600">
                          Convert images within the PDF to descriptive text
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {!isImage && !isPdf && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm text-gray-600">
                    This file type will be processed with default settings.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="hover:bg-primary-50 border-primary-300 text-primary-600"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            className="bg-primary-600 hover:bg-primary-700"
          >
            Apply Settings
          </Button>
        </div>
      </div>
    </div>
  )
}