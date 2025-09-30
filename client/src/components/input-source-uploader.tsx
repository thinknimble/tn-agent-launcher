import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { useMutation } from '@tanstack/react-query'
import { Button } from './button'
import { agentTaskApi } from 'src/services/agent-task'
import { InputSource, sourceTypeEnum } from 'src/services/agent-task/models'
import { DocumentProcessingConfigModal } from './document-processing-config'

interface InputSourceUploaderProps {
  onFilesSelected?: (inputSources: InputSource[]) => void
  maxFiles?: number
  maxSize?: number // in MB
}

interface FileWithConfig {
  file: File
  id: string // Add unique ID for better React key handling
  processingConfig?: {
    skipPreprocessing: boolean
    preprocessImage: boolean
    isDocumentWithText: boolean
    replaceImagesWithDescriptions: boolean
    containsImages: boolean
    extractImagesAsText: boolean
  }
}

export const InputSourceUploader: React.FC<InputSourceUploaderProps> = ({
  onFilesSelected,
  maxFiles = 5,
  maxSize = 50,
}) => {
  const [files, setFiles] = useState<FileWithConfig[]>([])
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [configModalOpen, setConfigModalOpen] = useState(false)
  const [currentFileIndex, setCurrentFileIndex] = useState<number | null>(null)

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      setError(null)

      // Handle rejected files
      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0]
        if (rejection.errors[0]?.code === 'file-too-large') {
          setError(`File too large. Maximum size is ${maxSize}MB.`)
        } else if (rejection.errors[0]?.code === 'file-invalid-type') {
          setError('File type not supported.')
        } else {
          setError('File rejected.')
        }
        return
      }

      // Check total file count
      if (files.length + acceptedFiles.length > maxFiles) {
        setError(`Maximum ${maxFiles} files allowed.`)
        return
      }

      // Add unique IDs to files for better React key handling
      const filesWithIds = acceptedFiles.map((file) => ({
        file,
        id: `${Date.now()}-${Math.random()}`, // Simple unique ID
      }))
      setFiles((prev) => [...prev, ...filesWithIds])
    },
    [files.length, maxFiles, maxSize],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp', '.tiff', '.bmp'],
      'application/pdf': ['.pdf'],
      'text/*': ['.txt', '.md'],
      'application/json': ['.json'],
      'text/csv': ['.csv'],
      // Office documents
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-word': ['.doc'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.ms-excel': ['.xls'],
      // HTML and other formats
      'text/html': ['.html', '.htm'],
      'text/markdown': ['.md'],
    },
    maxSize: maxSize * 1024 * 1024,
    maxFiles: maxFiles,
  })

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index))
    setError(null)

    // Close configuration modal if it's open for the file being removed
    if (currentFileIndex === index) {
      setConfigModalOpen(false)
      setCurrentFileIndex(null)
    } else if (currentFileIndex !== null && currentFileIndex > index) {
      // Adjust the current file index if a file before it was removed
      setCurrentFileIndex(currentFileIndex - 1)
    }
  }

  const uploadFiles = async () => {
    if (files.length === 0) return

    setUploading(true)
    setError(null)

    try {
      const uploadedSources: InputSource[] = []

      for (const fileWrapper of files) {
        const file = fileWrapper.file
        // Get presigned URL
        const presignedData = await agentTaskApi.csc.generatePresignedUrl({
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
        })

        // Upload file to S3 using presigned POST
        const formData = new FormData()
        Object.entries(presignedData.presignedPost.fields).forEach(([key, value]) => {
          formData.append(key, value)
        })
        formData.append('file', file)

        const response = await fetch(presignedData.presignedPost.url, {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`)
        }

        // Create input source object with processing configuration
        const inputSource: InputSource = {
          url: presignedData.publicUrl,
          sourceType: sourceTypeEnum.OUR_S3,
          filename: file.name,
          size: file.size,
          contentType: file.type || 'application/octet-stream',
          // Add processing configuration (default to skip preprocessing if not configured)
          skipPreprocessing: fileWrapper.processingConfig?.skipPreprocessing ?? true,
          preprocessImage: fileWrapper.processingConfig?.preprocessImage,
          isDocumentWithText: fileWrapper.processingConfig?.isDocumentWithText,
          replaceImagesWithDescriptions:
            fileWrapper.processingConfig?.replaceImagesWithDescriptions,
          containsImages: fileWrapper.processingConfig?.containsImages,
          extractImagesAsText: fileWrapper.processingConfig?.extractImagesAsText,
        }

        uploadedSources.push(inputSource)
      }

      onFilesSelected?.(uploadedSources)
      setFiles([])
    } catch (err) {
      setError(`Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setUploading(false)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const openConfigModal = (index: number) => {
    setCurrentFileIndex(index)
    setConfigModalOpen(true)
  }

  const handleConfigSave = (config: any) => {
    if (currentFileIndex !== null) {
      const updatedFiles = [...files]
      updatedFiles[currentFileIndex] = {
        ...updatedFiles[currentFileIndex],
        processingConfig: config,
      }
      setFiles(updatedFiles)
    }
    setCurrentFileIndex(null)
  }

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`
          cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors
          ${
            isDragActive
              ? 'bg-primary-50 border-primary-500'
              : 'hover:bg-primary-25 border-primary-300 hover:border-primary-400'
          }
        `}
      >
        <input {...getInputProps()} />

        <div className="space-y-2">
          <div className="text-primary-400">📁</div>

          {isDragActive ? (
            <p className="font-medium text-primary-600">Drop files here</p>
          ) : (
            <div>
              <p className="font-medium text-primary-600">Drop files or click to select</p>
              <p className="mt-1 text-xs text-primary-400">Upload files to use as input sources</p>
            </div>
          )}

          <p className="text-xs text-primary-400">
            PDF, images, Office docs, text, CSV, JSON, HTML (max {maxSize}MB each)
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-primary-600">Selected Files:</h4>
          <div className="space-y-2">
            {files.map((fileWrapper, index) => (
              <div
                key={fileWrapper.id} // Use file ID as key
                className="bg-primary-50 flex items-center justify-between rounded-lg p-3"
              >
                <div className="flex items-center space-x-3">
                  <div className="text-primary-500">📄</div>
                  <div>
                    <p className="text-sm font-medium text-primary-900">{fileWrapper.file.name}</p>
                    <p className="text-xs text-primary-500">
                      {formatFileSize(fileWrapper.file.size)}
                    </p>
                    <p className="text-xs text-green-600">
                      {fileWrapper.processingConfig ? (
                        <>
                          ✓ Processing configured
                          {fileWrapper.processingConfig.skipPreprocessing && ' (Direct to agent)'}
                          {!fileWrapper.processingConfig.skipPreprocessing &&
                            ' (Preprocessing enabled)'}
                        </>
                      ) : (
                        '→ Will be sent directly to agent (default)'
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => openConfigModal(index)}
                    className="hover:bg-primary-50 text-primary-600 hover:text-primary-700"
                  >
                    Configure
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => removeFile(index)}
                    className="text-red-500 hover:bg-red-50 hover:text-red-700"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Button
            type="button"
            onClick={uploadFiles}
            disabled={uploading}
            className="w-full bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {uploading
              ? `Uploading ${files.length} File${files.length > 1 ? 's' : ''}...`
              : `Add ${files.length} File${files.length > 1 ? 's' : ''} to Input Sources`}
          </Button>
        </div>
      )}

      {/* Processing Configuration Modal */}
      {currentFileIndex !== null && files[currentFileIndex] && (
        <DocumentProcessingConfigModal
          isOpen={configModalOpen}
          onClose={() => {
            setConfigModalOpen(false)
            setCurrentFileIndex(null)
          }}
          onConfirm={handleConfigSave}
          filename={files[currentFileIndex].file.name}
          contentType={files[currentFileIndex].file.type}
        />
      )}
    </div>
  )
}
