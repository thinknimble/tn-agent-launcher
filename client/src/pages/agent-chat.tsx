import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { agentInstanceQueries } from 'src/services/agent-instance'
import { providerLabelMap, agentTypeLabelMap } from 'src/services/agent-instance'
import { ChatInterface } from 'src/components/chat-interface'
import { Button } from 'src/components/button'
import { Spinner } from 'src/components/spinner'

export const AgentChat = () => {
  const { agentId } = useParams<{ agentId: string }>()
  const navigate = useNavigate()

  const { data: agent, isLoading: loadingAgent } = useQuery({
    ...agentInstanceQueries.retrieve(agentId!),
    enabled: Boolean(agentId),
  })

  if (loadingAgent) {
    return (
      <div className="bg-primary-50 min-h-screen">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Spinner size="lg" />
              <p className="mt-4 text-primary-600">Loading agent...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="bg-primary-50 min-h-screen">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="py-20 text-center">
            <h1 className="mb-4 text-2xl font-bold text-primary-600">Agent Not Found</h1>
            <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex h-16 w-full flex-col justify-center border-b border-primary-200 bg-primary">
        <div className="flex w-full items-center justify-between px-4">
          <div className="flex items-center space-x-4">
            <Button
              onClick={() => navigate('/dashboard')}
              variant="ghost"
              className="text-white hover:bg-primary-700"
            >
              ← Back
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white">💬 Chat with {agent.friendlyName}</h1>
              <div className="flex items-center space-x-2 text-sm text-primary-200">
                <span>
                  {providerLabelMap[agent.provider]} • {agent.modelName}
                </span>
                <span>•</span>
                <span>{agentTypeLabelMap[agent.agentType]}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Interface */}
      <div className="h-[calc(100vh-4rem)]">
        <ChatInterface agentId={agentId} />
      </div>
    </div>
  )
}
