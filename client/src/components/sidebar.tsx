import { useState } from 'react'
import { SidebarSection } from './sidebar-section'
import { Button } from './button'

type Chat = {
  id: string
  name: string
  created: string
  messageCount?: number
}

type SidebarProps = {
  isOpen: boolean
  onClose: () => void
  conversations?: Chat[]
  selectedChatId?: string
  onChatSelect: (chatId: string) => void
  onNewChat: () => void
  agentName?: string
}

export const Sidebar = ({
  isOpen,
  onClose,
  conversations = [],
  selectedChatId,
  onChatSelect,
  onNewChat,
  agentName,
}: SidebarProps) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    return date.toLocaleDateString()
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-[4rem] left-0 z-40 w-80 transform overflow-hidden border-r border-gray-200 bg-white transition-transform duration-300 lg:relative lg:inset-y-0 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Sidebar Header */}
          <div className="bg-primary-50 border-b border-primary-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-primary-600">
                  {agentName ? `Chat with ${agentName}` : 'Conversations'}
                </h2>
                <p className="text-sm text-primary-400">
                  {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button onClick={onClose} className="text-primary-500 lg:hidden">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* New Conversation Button */}
            <Button
              onClick={onNewChat}
              className="mt-4 w-full bg-primary-600 text-white hover:bg-primary-700"
            >
              + New Conversation
            </Button>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-4 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
                  <span className="text-xl">💬</span>
                </div>
                <p className="text-sm text-primary-400">No conversations yet</p>
                <p className="mt-1 text-xs text-primary-300">Start a new chat to begin</p>
              </div>
            ) : (
              <div className="p-2">
                {conversations.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => onChatSelect(chat.id)}
                    className={`hover:bg-primary-50 mb-2 cursor-pointer rounded-lg p-3 transition-colors ${
                      selectedChatId === chat.id ? 'border border-primary-200 bg-primary-100' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-medium text-primary-700">{chat.name}</h3>
                        <p className="mt-1 text-xs text-primary-400">{formatDate(chat.created)}</p>
                        {chat.messageCount && (
                          <p className="mt-1 text-xs text-primary-500">
                            {chat.messageCount} message{chat.messageCount !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                      {selectedChatId === chat.id && (
                        <div className="ml-2 h-2 w-2 rounded-full bg-primary-600"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
