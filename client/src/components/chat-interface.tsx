import { useState, useRef, FormEvent, useEffect, useMemo } from 'react'
import useWebSocket from 'react-use-websocket'
import { useAuth } from 'src/stores/auth'
import { Sidebar } from './sidebar'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { chatQueries } from 'src/services/chat/queries'
import { agentInstanceQueries } from 'src/services/agent-instance'
import { chatApi } from 'src/services/chat/api'
import { Spinner } from './spinner'
import { Pagination } from '@thinknimble/tn-models'
import { chatMessageQueries } from '../services/chat-messages/queries'

type Message = {
  content: string
  role: 'user' | 'assistant'
}

interface ChatInterfaceProps {
  agentId?: string
}

export const ChatInterface = ({ agentId }: ChatInterfaceProps) => {
  const queryClient = useQueryClient()
  const token = useAuth.use.token()

  // Fetch agent details if agentId is provided
  const { data: agent } = useQuery({
    ...agentInstanceQueries.retrieve(agentId!),
    enabled: Boolean(agentId),
  })

  // Filter chats for specific agent if agentId is provided
  const { data: chats } = useQuery({
    ...chatQueries.list({
      filters: { agentInstance: agentId ?? '' },
      pagination: new Pagination(),
    }),
  })

  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isConnectionError, setIsConnectionError] = useState(false)
  const [, setStreamingContent] = useState('')
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const { data: existingMessages, isFetching } = useQuery(
    chatMessageQueries.list({
      filters: { chat: selectedChatId ?? '' },
      pagination: new Pagination(),
    }),
  )
  const chatHistoryRef = useRef<HTMLDivElement>(null)

  // Create conversation mutation
  const { mutate: createConversation, isPending: isCreatingChat } = useMutation({
    mutationFn: (data: { name: string; agentInstance?: string }) => chatApi.create(data),
    onSuccess: (newChat) => {
      setSelectedChatId(newChat.id)
      // Invalidate and refetch chats
      queryClient.invalidateQueries({ queryKey: chatQueries.all() })
    },
  })

  const webSocketUrl = useMemo(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = import.meta.env.DEV ? window.location.host : window.location.host
    return `${protocol}//${host}/ws/chat/?token=${token}`
  }, [token])

  const { sendJsonMessage, lastJsonMessage, readyState } = useWebSocket(webSocketUrl, {
    onOpen: () => console.log('opened'),
    //Will attempt to reconnect on all close events, such as server shutting down
    shouldReconnect: (closeEvent) => true,
    onError: (event) => {
      console.error('WebSocket error:', event)
      setIsConnectionError(true)
      setIsLoading(false)
    },
  })

  useEffect(() => {
    if (readyState === WebSocket.OPEN) {
      setIsLoading(false)
    } else if (readyState === WebSocket.CLOSED) {
      setIsLoading(false)
      console.log('WebSocket is closed')
    } else if (readyState === WebSocket.CONNECTING) {
      console.log('WebSocket is connecting')
      setIsLoading(true)
    } else if (readyState === WebSocket.CLOSING) {
      console.log('WebSocket is closing')
      setIsLoading(true)
    }
  }, [readyState])

  useEffect(() => {
    if (selectedChatId && existingMessages) {
      const loadedMessages = existingMessages.results.map((msg) => ({
        content: msg.content,
        role: msg.role,
      }))
      setMessages(loadedMessages.reverse())
    }
  }, [selectedChatId, existingMessages])

  useEffect(() => {
    if (lastJsonMessage) {
      const data = lastJsonMessage as any
      console.log('Last JSON message:', lastJsonMessage)

      if (data.error) {
        setMessages((prev) => {
          const newMessages = [...prev]
          const lastMessage = newMessages[newMessages.length - 1]
          if (lastMessage?.role === 'assistant') {
            lastMessage.content += `\nError: ${data.error}`
          }
          return newMessages
        })
        return
      }

      if (data.delta) {
        // Handling streaming response
        if (data.delta.content) {
          setStreamingContent((prev) => {
            const newContent = prev + data.delta.content
            setMessages((messages) => {
              const newMessages = [...messages]
              newMessages[newMessages.length - 1].content = newContent
              return newMessages
            })
            return newContent
          })
        }
      } else if (data.message) {
        // Handling regular response
        setMessages((prev) => [...prev, { content: data.message.content, role: 'assistant' }])
      }
    }
  }, [lastJsonMessage])

  useEffect(() => {
    // Scroll to bottom when messages change
    chatHistoryRef.current?.scrollTo(0, chatHistoryRef.current.scrollHeight)
  }, [messages])

  // Auto-select first chat if none selected
  useEffect(() => {
    if (chats?.results?.length && !selectedChatId && !isCreatingChat) {
      setSelectedChatId(chats.results[0].id)
    }
  }, [chats, selectedChatId, isCreatingChat])

  const handleNewChat = () => {
    const chatName = agent
      ? `Chat with ${agent.friendlyName} - ${new Date().toLocaleDateString()}`
      : `New Chat - ${new Date().toLocaleDateString()}`

    createConversation({
      name: chatName,
      agentInstance: agentId,
    })
  }

  const handleChatSelect = (chatId: string) => {
    setSelectedChatId(chatId)
    // Clear current messages when switching chats
    setMessages([])
    // TODO: Load messages for the selected chat
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const content = inputMessage.trim()
    if (!content) return

    // If no chat is selected and no chats exist, create one first
    if (!selectedChatId && !chats?.results?.length) {
      handleNewChat()
      // The message will be sent after the chat is created via the useEffect
      return
    }

    // Add user message to conversation
    const userMessage: Message = { content, role: 'user' }
    setMessages((prev) => [...prev, userMessage])
    setInputMessage('')
    setStreamingContent('')

    // Add empty assistant message that will be updated
    setMessages((prev) => [...prev, { content: '', role: 'assistant' }])

    // Send full conversation history through WebSocket
    sendJsonMessage({
      messages: [...messages, userMessage], // Include previous messages plus new user message
      stream: true,
      chat_id: selectedChatId || chats?.results?.[0]?.id, // Use selected chat or first available
      agent_instance_id: agentId, // Pass the agent ID if available
    })
  }

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  // Add this new function to handle textarea height
  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target
    setInputMessage(textarea.value)

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto'
    // Set new height based on scrollHeight, capped at 5 lines (approximately 120px)
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
  }

  const extractThinkingPart = (msg: string) => {
    const regex = /<think>(.*?)<\/think>/s

    const match = msg.match(regex)

    // The captured text is in the second element of the match array (index 1)
    // We also use .trim() to remove any leading/trailing whitespace
    return match ? match[1].trim() : null
  }

  return (
    <div className="flex h-full">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        conversations={chats?.results || []}
        selectedChatId={selectedChatId ?? ''}
        onChatSelect={handleChatSelect}
        onNewChat={handleNewChat}
        agentName={agent?.friendlyName}
      />

      <div className="flex flex-1 flex-col">
        {/* Mobile Sidebar Toggle */}
        <div className="border-b border-gray-200 p-4 lg:hidden">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
            Menu
          </button>
        </div>

        {/* Chat Loading Overlay */}
        {(isLoading || isConnectionError) && (
          <div className="z-100 relative h-full w-full">
            <div className="flex h-full w-full items-center justify-center bg-gray-100 opacity-50">
              {isLoading ? (
                <Spinner size="lg" />
              ) : (
                <div className="text-red-500">
                  <p>Connection Error</p>
                  <p>There is an error connecting, will retry.</p>
                </div>
              )}
            </div>
          </div>
        )}
        {/* Main Chat Area - Scrollable */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div ref={chatHistoryRef} className="flex-1 overflow-y-auto p-4">
            {isFetching ? (
              <div className="flex h-full w-full items-center justify-center">
                <Spinner size="lg" />
              </div>
            ) : messages.length === 0 ? (
              <p>No Messages Yet</p>
            ) : (
              <div className="mx-auto max-w-3xl">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`mb-4 flex ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 text-left ${
                        message.role === 'user' ? 'bg-blue-50' : 'bg-gray-50'
                      }`}
                    >
                      {message.content
                        .replace(extractThinkingPart(message.content) ?? '', '')
                        .replace('<think>', '')
                        .replace('</think>', '')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chat Input Area - Fixed at Bottom */}
          <div className="border-t border-gray-200 bg-white">
            <div className="mx-auto max-w-3xl">
              <form onSubmit={handleSubmit} className="flex flex-col">
                {/* Text Input */}
                <div className="p-4 pb-2">
                  <textarea
                    value={inputMessage}
                    onChange={handleTextareaInput}
                    onKeyDown={handleTextareaKeyDown}
                    placeholder="Type your message..."
                    rows={1}
                    className="max-h-[120px] min-h-[40px] w-full resize-none overflow-y-auto rounded-lg border border-gray-300 px-4 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>

                {/* Toolbar */}
                <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2">
                  <div className="flex items-center gap-2">
                    {/* Add more toolbar buttons here */}
                  </div>
                  <button
                    type="submit"
                    className="rounded-lg bg-primary px-6 py-2 text-white hover:bg-primaryLight focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  >
                    Send
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
