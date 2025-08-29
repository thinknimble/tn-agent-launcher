import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from './button'

interface InputSourceUploaderProps {
  onFilesSelected?: (urls: string[]) => void
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

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
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

    setFiles(prev => [...prev, ...acceptedFiles])
  }, [files.length, maxFiles, maxSize])

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

  const addFilesToSources = () => {
    if (files.length === 0) return

    // For now, just create placeholder URLs based on file names
    const placeholderUrls = files.map(file => 
      `file://${file.name}` // Placeholder - will be replaced with actual URLs later
    )

    onFilesSelected?.(placeholderUrls)
    setFiles([])
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
          ${isDragActive 
            ? 'border-primary-500 bg-primary-50' 
            : 'border-primary-300 hover:border-primary-400 hover:bg-primary-25'
          }
        `}
      >
        <input {...getInputProps()} />
        
        <div className="space-y-2">
          <div className="text-primary-400">
            📁
          </div>
          
          {isDragActive ? (
            <p className="text-primary-600 font-medium">Drop files here</p>
          ) : (
            <div>
              <p className="text-primary-600 font-medium">Drop files or click to select</p>
              <p className="text-xs text-primary-400 mt-1">Upload files to use as input sources</p>
            </div>
          )}
          
          <p className="text-xs text-primary-400">
            PDF, images, text, CSV, JSON (max {maxSize}MB each)
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-primary-600">Selected Files:</h4>
          <div className="space-y-2">
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between bg-primary-50 rounded-lg p-3">
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
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
          
          <Button
            type="button"
            onClick={addFilesToSources}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white"
          >
            Add {files.length} File{files.length > 1 ? 's' : ''} to Input Sources
          </Button>
        </div>
      )}
    </div>
  )
}