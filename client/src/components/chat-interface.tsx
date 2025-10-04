import { useState, useRef, FormEvent, useEffect, useMemo } from 'react'
import useWebSocket from 'react-use-websocket'
import ReactMarkdown from 'react-markdown'
import { useAuth } from 'src/stores/auth'
import { Sidebar } from './sidebar'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { chatQueries } from 'src/services/chat/queries'
import { agentInstanceQueries } from 'src/services/agent-instance'
import { chatApi } from 'src/services/chat/api'
import { Spinner } from './spinner'
import { Pagination } from '@thinknimble/tn-models'
import { chatMessageQueries } from '../services/chat-messages/queries'
import { objectToCamelCase } from '@thinknimble/tn-utils'

type Message = {
  content: string
  role: 'user' | 'assistant' | 'tool'
  parsedContent?: {
    type: 'user_message' | 'agent_response' | 'tool_call' | 'tool_result' | 'message'
    content?: string
    function?: string
    arguments?: any
    toolName?: string
    result?: any
    raw?: string
    error?: string
  }
  showToolDetails?: boolean
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
      console.log('Loading existing messages for chat:', existingMessages)
      const loadedMessages = existingMessages.results.map((msg) => {
        debugger
        return {
          content: msg.content,
          role: msg.role,
          parsedContent: msg.parsedContent,
          showToolDetails: false,
        }
      })
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
            console.log('Streaming content:', newContent)
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
      } else if (data.tool_message) {
        // Handling tool messages (calls and results)
        const toolMsg = data.tool_message

        if (toolMsg.type === 'call') {
          // Parse the tool call JSON
          try {
            const callData = JSON.parse(toolMsg.content)
            setMessages((prev) => [
              ...prev,
              {
                content: toolMsg.content,
                role: 'assistant',
                parsedContent: {
                  type: 'tool_call',
                  function: callData.function,
                  arguments: JSON.parse(callData.arguments),
                  raw: toolMsg.content,
                },
              },
            ])
          } catch (e) {
            // Fallback if parsing fails
            setMessages((prev) => [
              ...prev,
              {
                content: toolMsg.content,
                role: 'assistant',
                parsedContent: {
                  type: 'tool_call',
                  raw: toolMsg.content,
                },
              },
            ])
          }
        } else if (toolMsg.type === 'result') {
          // Handle new format where tool_name is separate and content is clean
          let result
          try {
            const parsedResult = JSON.parse(toolMsg.content)
            // Convert snake_case to camelCase to match API format
            result = objectToCamelCase(parsedResult)
          } catch {
            result = toolMsg.content
          }

          setMessages((prev) => [
            ...prev,
            {
              content: toolMsg.content,
              role: 'assistant',
              parsedContent: {
                type: 'tool_result',
                toolName: toolMsg.tool_name || 'unknown',
                result: result,
                raw: toolMsg.content,
              },
            },
          ])

          // Legacy format fallback
          if (toolMsg.content.startsWith('Tool result (')) {
            try {
              const match = toolMsg.content.match(/Tool result \((.+?)\): (.+)/)
              if (match) {
                const [, toolName, resultStr] = match
                let legacyResult
                try {
                  const parsedResult = JSON.parse(resultStr)
                  // Convert snake_case to camelCase to match API format
                  legacyResult = objectToCamelCase(parsedResult)
                } catch {
                  legacyResult = resultStr
                }

                setMessages((prev) => [
                  ...prev,
                  {
                    content: toolMsg.content,
                    role: 'assistant',
                    parsedContent: {
                      type: 'tool_result',
                      toolName: toolName,
                      result: legacyResult,
                      raw: toolMsg.content,
                    },
                  },
                ])
              }
            } catch (e) {
              // Fallback
              setMessages((prev) => [
                ...prev,
                {
                  content: toolMsg.content,
                  role: 'assistant',
                  parsedContent: {
                    type: 'tool_result',
                    raw: toolMsg.content,
                  },
                },
              ])
            }
          }
        }
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
    const regex = /<think>(.*?)<\/think>/

    const match = msg.match(regex)

    // The captured text is in the second element of the match array (index 1)
    // We also use .trim() to remove any leading/trailing whitespace
    return match ? match[1].trim() : null
  }

  const toggleToolDetails = (index: number) => {
    setMessages((prev) =>
      prev.map((msg, i) => (i === index ? { ...msg, showToolDetails: !msg.showToolDetails } : msg)),
    )
  }

  const truncateContent = (content: string, maxLength: number = 300) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + '...'
  }

  // Group tool calls with their results
  const groupToolMessages = (messages: Message[]) => {
    const grouped: (
      | Message
      | { type: 'tool_group'; toolCall: Message; toolResult: Message; showCall: boolean }
    )[] = []

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i]
      const parsed = message.parsedContent

      if (parsed?.type === 'tool_call') {
        // Look for the next tool_result
        const nextMessage = messages[i + 1]
        if (nextMessage?.parsedContent?.type === 'tool_result') {
          // Group them together
          grouped.push({
            type: 'tool_group',
            toolCall: message,
            toolResult: nextMessage,
            showCall: false, // Default to showing result
          })
          i++ // Skip the next message since we've grouped it
        } else {
          // No matching result, add call alone
          grouped.push(message)
        }
      } else if (parsed?.type === 'tool_result') {
        // Tool result without a preceding call (shouldn't happen, but handle it)
        grouped.push(message)
      } else {
        // Regular message
        grouped.push(message)
      }
    }

    return grouped
  }

  const [toolGroupStates, setToolGroupStates] = useState<{ [key: number]: boolean }>({})

  const toggleToolGroup = (groupIndex: number) => {
    setToolGroupStates((prev) => ({
      ...prev,
      [groupIndex]: !prev[groupIndex],
    }))
  }

  const renderToolGroup = (
    toolCall: Message,
    toolResult: Message,
    showCall: boolean,
    groupIndex: number,
  ) => {
    const currentMessage = showCall ? toolCall : toolResult
    const parsed = currentMessage.parsedContent

    return (
      <div className="rounded-r border-l-4 border-purple-400 bg-purple-50 p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs font-medium text-purple-700">
            {showCall ? (
              <>🚀 Tool Call: {parsed?.function}</>
            ) : (
              <>🔧 Tool Result: {parsed?.toolName}</>
            )}
          </div>
          <button
            onClick={() => toggleToolGroup(groupIndex)}
            className="text-purple-600 hover:text-purple-800"
            title={showCall ? 'Show result' : 'Show call details'}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        </div>

        <div className="text-sm text-purple-800">
          {showCall ? (
            // Show tool call arguments
            <div className="whitespace-pre-wrap font-mono">
              {JSON.stringify(parsed?.arguments, null, 2)}
            </div>
          ) : (
            // Show tool result with markdown rendering
            <MarkdownRenderer>
              {typeof parsed?.result === 'string'
                ? parsed.result
                : JSON.stringify(parsed?.result, null, 2)}
            </MarkdownRenderer>
          )}
        </div>
      </div>
    )
  }

  const MarkdownRenderer = ({ children }: { children: string | undefined }) => (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        h1: ({ children }) => <h1 className="mb-2 text-xl font-bold">{children}</h1>,
        h2: ({ children }) => <h2 className="mb-2 text-lg font-bold">{children}</h2>,
        h3: ({ children }) => <h3 className="text-md mb-1 font-bold">{children}</h3>,
        ul: ({ children }) => <ul className="mb-2 ml-4 list-disc">{children}</ul>,
        ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal">{children}</ol>,
        li: ({ children }) => <li className="mb-1">{children}</li>,
        code: ({ children }) => (
          <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-sm">{children}</code>
        ),
        pre: ({ children }) => (
          <pre className="mb-2 overflow-x-auto rounded bg-gray-100 p-3">{children}</pre>
        ),
        blockquote: ({ children }) => (
          <blockquote className="mb-2 border-l-4 border-gray-300 pl-4 italic">
            {children}
          </blockquote>
        ),
        strong: ({ children }) => <strong className="font-bold">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
      }}
    >
      {children}
    </ReactMarkdown>
  )

  const renderMessageContent = (message: Message, index: number) => {
    const parsed = message.parsedContent

    // Handle different message types based on parsed_content
    if (!parsed) {
      // Fallback to original rendering for messages without parsed_content
      const content = message.content
        .replace(extractThinkingPart(message.content) ?? '', '')
        .replace('<think>', '')
        .replace('</think>', '')

      const isLong = content.length > 300
      const displayContent = message.showToolDetails || !isLong ? content : truncateContent(content)

      return (
        <div>
          <MarkdownRenderer>{displayContent}</MarkdownRenderer>
          {isLong && (
            <button
              onClick={() => toggleToolDetails(index)}
              className="mt-2 text-xs text-blue-600 hover:text-blue-800"
            >
              {message.showToolDetails ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      )
    }

    switch (parsed.type) {
      case 'agent_response':
        const agentContent =
          parsed.content
            ?.replace(extractThinkingPart(parsed.content) ?? '', '')
            .replace('<think>', '')
            .replace('</think>', '') || ''

        const isAgentLong = agentContent.length > 300
        const displayAgentContent =
          message.showToolDetails || !isAgentLong ? agentContent : truncateContent(agentContent)

        return (
          <div>
            <MarkdownRenderer>{displayAgentContent}</MarkdownRenderer>
            {isAgentLong && (
              <button
                onClick={() => toggleToolDetails(index)}
                className="mt-2 text-xs text-blue-600 hover:text-blue-800"
              >
                {message.showToolDetails ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        )

      case 'user_message':
        return <MarkdownRenderer>{parsed.content || ''}</MarkdownRenderer>

      case 'tool_result':
        const resultStr =
          typeof parsed.result === 'string' ? parsed.result : JSON.stringify(parsed.result, null, 2)
        const isResultLong = resultStr.length > 300
        const displayResult =
          message.showToolDetails || !isResultLong ? resultStr : truncateContent(resultStr)

        return (
          <div className="rounded-r border-l-4 border-green-400 bg-green-50 p-3">
            <div className="mb-1 text-xs font-medium text-green-700">
              🔧 Tool Result: {parsed.toolName}
            </div>
            <div className="whitespace-pre-wrap font-mono text-sm text-green-800">
              {displayResult}
            </div>
            {isResultLong && (
              <button
                onClick={() => toggleToolDetails(index)}
                className="mt-2 text-xs text-green-600 hover:text-green-800"
              >
                {message.showToolDetails ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        )

      case 'tool_call':
        const argsStr = parsed.arguments
        const isCallLong = argsStr.length > 200
        const displayArgs =
          message.showToolDetails || !isCallLong ? argsStr : truncateContent(argsStr, 200)

        return (
          <div className="rounded-r border-l-4 border-blue-400 bg-blue-50 p-3">
            <div className="mb-1 text-xs font-medium text-blue-700">
              🚀 Calling Tool: {parsed.function}
            </div>
            <div className="whitespace-pre-wrap font-mono text-sm text-blue-800">{displayArgs}</div>
            {isCallLong && (
              <button
                onClick={() => toggleToolDetails(index)}
                className="mt-2 text-xs text-blue-600 hover:text-blue-800"
              >
                {message.showToolDetails ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        )

      default:
        return <div className="whitespace-pre-wrap">{parsed.content || message.content}</div>
    }
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
                {groupToolMessages(messages).map((item, index) => {
                  // Handle tool groups
                  if ('type' in item && item.type === 'tool_group') {
                    const showCall = toolGroupStates[index] || false
                    const content = renderToolGroup(item.toolCall, item.toolResult, showCall, index)

                    return (
                      <div key={index} className="mb-4 flex justify-start">
                        <div className="max-w-[80%] text-left">{content}</div>
                      </div>
                    )
                  }

                  // Handle regular messages
                  const message = item as Message
                  const content = renderMessageContent(message, index)
                  const parsed = message.parsedContent
                  const isToolMessage =
                    parsed?.type === 'tool_call' || parsed?.type === 'tool_result'
                  const isUser = message.role === 'user'

                  return (
                    <div
                      key={index}
                      className={`mb-4 flex ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] text-left ${
                          isToolMessage
                            ? '' // Tool messages have their own styling
                            : `rounded-lg p-3 ${isUser ? 'bg-blue-50' : 'bg-gray-50'}`
                        }`}
                      >
                        {content}
                      </div>
                    </div>
                  )
                })}
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
