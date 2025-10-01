import React, { useCallback, useState } from 'react'
import { Button } from './button'

interface FileUploaderProps {
  onFilesUploaded?: (urls: string[]) => void
  maxFiles?: number
  maxSize?: number // in MB
  acceptedFileTypes?: string[]
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onFilesUploaded,
  maxFiles = 5,
  maxSize = 50,
  acceptedFileTypes = ['image/*', 'application/pdf', 'text/*', '.csv', '.json'],
}) => {
  const [files, setFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      return `File "${file.name}" is too large. Maximum size is ${maxSize}MB.`
    }

    // Check file type (basic validation)
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    const allowedExtensions = ['pdf', 'txt', 'csv', 'json', 'md', 'jpg', 'jpeg', 'png', 'gif']

    if (fileExtension && !allowedExtensions.includes(fileExtension)) {
      return `File type ".${fileExtension}" is not supported.`
    }

    return null
  }

  const handleFiles = useCallback(
    (selectedFiles: FileList | File[]) => {
      const fileArray = Array.from(selectedFiles)
      const validFiles: File[] = []
      let errorMessage = ''

      for (const file of fileArray) {
        if (files.length + validFiles.length >= maxFiles) {
          errorMessage = `Maximum ${maxFiles} files allowed.`
          break
        }

        const validation = validateFile(file)
        if (validation) {
          errorMessage = validation
          break
        }

        validFiles.push(file)
      }

      if (errorMessage) {
        setError(errorMessage)
        setTimeout(() => setError(null), 5000)
        return
      }

      setFiles((prev) => [...prev, ...validFiles])
      setError(null)
    },
    [files.length, maxFiles, maxSize],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragActive(false)

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files)
        e.dataTransfer.clearData()
      }
    },
    [handleFiles],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files)
    }
  }

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  const uploadFiles = async () => {
    if (files.length === 0) return

    setIsUploading(true)
    setError(null)

    try {
      // Create a temporary URL for each file using URL.createObjectURL
      // In a real implementation, you'd upload to a server and get back URLs
      const tempUrls: string[] = []

      for (const file of files) {
        // For demo purposes, we'll create blob URLs
        // In production, you'd upload to your server here
        const formData = new FormData()
        formData.append('file', file)

        // Simulate upload delay
        await new Promise((resolve) => setTimeout(resolve, 500))

        // For now, we'll just create a local URL
        // In production, this would be the server response URL
        const tempUrl = URL.createObjectURL(file)
        tempUrls.push(tempUrl)
      }

      onFilesUploaded?.(tempUrls)
      setFiles([])
    } catch (err) {
      setError('Failed to upload files. Please try again.')
      console.error('Upload error:', err)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => document.getElementById('file-input')?.click()}
        className={`
          relative cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors
          ${
            dragActive
              ? 'bg-primary-50 border-primary-500'
              : 'hover:bg-primary-25 border-primary-300 hover:border-primary-400'
          }
        `}
      >
        <input
          id="file-input"
          type="file"
          multiple
          accept={acceptedFileTypes.join(',')}
          onChange={handleFileInput}
          className="hidden"
        />

        <div className="space-y-2">
          <div className="text-primary-400">
            <svg className="mx-auto h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>

          {dragActive ? (
            <p className="font-medium text-primary-600">Drop files here</p>
          ) : (
            <div>
              <p className="font-medium text-primary-600">Click to upload files</p>
              <p className="mt-1 text-xs text-primary-400">or drag and drop files here</p>
            </div>
          )}

          <p className="text-xs text-primary-400">
            Supports PDF, images, text files, CSV, JSON (max {maxSize}MB each)
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
        <div className="space-y-2">
          <h4 className="font-medium text-primary-600">Selected Files:</h4>
          <div className="space-y-1">
            {files.map((file, index) => (
              <div
                key={index}
                className="bg-primary-50 flex items-center justify-between rounded p-2 text-sm"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-primary-600">{file.name}</span>
                  <span className="text-xs text-primary-400">
                    ({(file.size / 1024 / 1024).toFixed(1)} MB)
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => removeFile(index)}
                  className="p-1 text-red-500 hover:bg-red-50 hover:text-red-700"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>

          <Button
            type="button"
            onClick={uploadFiles}
            disabled={isUploading}
            className="bg-primary-600 text-white hover:bg-primary-700"
          >
            {isUploading
              ? 'Processing...'
              : `Process ${files.length} File${files.length > 1 ? 's' : ''}`}
          </Button>
        </div>
      )}
    </div>
  )
}
