import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Modal } from 'src/components'
import { Button } from 'src/components/button'
import { integrationApi } from 'src/services/integration'

interface Directory {
  name: string
  path: string
  type: string
  parents?: string[]
}

interface FolderSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (folder: Directory) => void
  integrationId: string
  title: string
  description?: string
}

export const FolderSelectionModal = ({
  isOpen,
  onClose,
  onSelect,
  integrationId,
  title,
  description,
}: FolderSelectionModalProps) => {
  const [selectedFolder, setSelectedFolder] = useState<Directory | null>(null)

  const {
    data: directoriesData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['integration-directories', integrationId],
    queryFn: () => integrationApi.csc.getDirectories({ integrationId }),
    enabled: isOpen && !!integrationId,
  })

  const directories = directoriesData?.directories || []

  const handleSelect = () => {
    if (selectedFolder) {
      onSelect(selectedFolder)
      onClose()
      setSelectedFolder(null)
    }
  }

  const handleClose = () => {
    onClose()
    setSelectedFolder(null)
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <section className="p-6">
        <h2 className="mb-4 text-2xl font-bold">{title}</h2>
        {description && <p className="mb-4 text-gray-600">{description}</p>}

        {isLoading ? (
          <div className="py-8 text-center">
            <p className="text-gray-500">Loading folders...</p>
          </div>
        ) : error ? (
          <div className="py-8 text-center">
            <p className="text-red-500">Error loading folders. Please try again.</p>
          </div>
        ) : directories.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-gray-500">No folders found in this integration.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">Select a folder:</p>
            <div className="max-h-64 space-y-1 overflow-y-auto rounded border">
              {directories.map((directory) => (
                <button
                  key={directory.path}
                  className={`flex w-full items-center space-x-3 p-3 text-left transition-colors hover:bg-gray-50 ${
                    selectedFolder?.path === directory.path
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700'
                  }`}
                  onClick={() => setSelectedFolder(directory)}
                >
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-gray-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{directory.name}</p>
                    <p className="text-xs text-gray-500">{directory.path}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex space-x-3">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSelect}
            disabled={!selectedFolder || isLoading}
          >
            Select Folder
          </Button>
        </div>
      </section>
    </Modal>
  )
}