import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { useMutation } from '@tanstack/react-query'
import { Button } from './button'
import { agentTaskApi } from 'src/services/agent-task'
import { InputSource, sourceTypeEnum } from 'src/services/agent-task/models'

interface InputSourceUploaderProps {
  onFilesSelected?: (inputSources: InputSource[]) => void
  maxFiles?: number
  maxSize?: number // in MB
}

export const InputSourceUploader: React.FC<InputSourceUploaderProps> = ({
  onFilesSelected,
  maxFiles = 5,
  maxSize = 50,
}) => {
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

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

      setFiles((prev) => [...prev, ...acceptedFiles])
    },
    [files.length, maxFiles, maxSize],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
      'application/pdf': ['.pdf'],
      'text/*': ['.txt', '.md'],
      'application/json': ['.json'],
      'text/csv': ['.csv'],
    },
    maxSize: maxSize * 1024 * 1024,
    maxFiles: maxFiles,
  })

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index))
    setError(null)
  }

  const uploadFiles = async () => {
    if (files.length === 0) return

    setUploading(true)
    setError(null)

    try {
      const uploadedSources: InputSource[] = []

      for (const file of files) {
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

        // Create input source object
        const inputSource: InputSource = {
          url: presignedData.publicUrl,
          sourceType: sourceTypeEnum.OUR_S3,
          filename: file.name,
          size: file.size,
          contentType: file.type || 'application/octet-stream',
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
            PDF, images, text, CSV, JSON (max {maxSize}MB each)
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
            {files.map((file, index) => (
              <div
                key={index}
                className="bg-primary-50 flex items-center justify-between rounded-lg p-3"
              >
                <div className="flex items-center space-x-3">
                  <div className="text-primary-500">📄</div>
                  <div>
                    <p className="text-sm font-medium text-primary-900">{file.name}</p>
                    <p className="text-xs text-primary-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => removeFile(index)}
                  className="text-red-500 hover:bg-red-50 hover:text-red-700"
                >
                  Remove
                </Button>
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
    </div>
  )
}
