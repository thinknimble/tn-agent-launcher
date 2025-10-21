import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { Pagination } from '@thinknimble/tn-models'

import { Button } from 'src/components/button'
import { AgentTaskCard } from 'src/components/agent-task-card'
import { AgentTaskExecutionCard } from 'src/components/agent-task-execution-card'
import { AgentTask, agentTaskApi, agentTaskQueries } from 'src/services/agent-task'
import { agentTaskExecutionApi, agentTaskExecutionQueries } from 'src/services/agent-task-execution'
import { agentInstanceQueries, agentTypeEnum } from 'src/services/agent-instance'
import { CreateAgentTask } from 'src/pages/create-agent-task'

export const AgentTasks = () => {
  const { agentInstanceId } = useParams<{ agentInstanceId: string }>()
  const [editing, setEditing] = useState<AgentTask | null>(null)
  const [duplicating, setDuplicating] = useState<AgentTask | null>(null)
  const [creating, setCreating] = useState(false)
  const [showExecutions, setShowExecutions] = useState(false)
  const [selectedTaskForHistory, setSelectedTaskForHistory] = useState<AgentTask | null>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const filters = useMemo(() => {
    return agentInstanceId ? { agentInstance: agentInstanceId } : undefined
  }, [agentInstanceId])

  // Filter tasks by agent instance

  const { data: tasks, isLoading: loadingTasks } = useQuery(
    agentTaskQueries.list({ filters, pagination: new Pagination() }),
  )

  const {
    data: agentInstance,
    isLoading: loadingAgent,
    error: agentError,
  } = useQuery(agentInstanceQueries.retrieve(agentInstanceId ?? ''))

  // Get executions for this agent instance or selected task
  const executionFilters = selectedTaskForHistory
    ? { agentTask: selectedTaskForHistory.id }
    : { agentTask__agentInstance: agentInstanceId }

  const { data: executions, isLoading: loadingExecutions } = useQuery(
    agentTaskExecutionQueries.list({
      filters: executionFilters,
      pagination: new Pagination(),
    }),
  )

  const { mutate: executeTask } = useMutation({
    mutationFn: (taskId: string) => agentTaskApi.csc.executeNow(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agentTasks'] })
    },
  })

  const { mutate: pauseTask } = useMutation({
    mutationFn: (taskId: string) => agentTaskApi.csc.pause({ taskId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agentTasks'] })
    },
  })

  const { mutate: resumeTask } = useMutation({
    mutationFn: (taskId: string) => agentTaskApi.csc.resume({ taskId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agentTasks'] })
    },
  })

  const { mutate: deleteTask } = useMutation({
    mutationFn: (taskId: string) => agentTaskApi.remove(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agentTasks'] })
    },
  })

  const { mutate: cancelExecution } = useMutation({
    mutationFn: (executionId: string) => agentTaskExecutionApi.csc.cancel(executionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-task-executions'] })
    },
  })

  const handleExecuteTask = (task: AgentTask) => {
    executeTask(task.id)
  }

  const handlePauseTask = (task: AgentTask) => {
    pauseTask(task.id)
  }

  const handleResumeTask = (task: AgentTask) => {
    resumeTask(task.id)
  }

  const handleEditTask = (task: AgentTask) => {
    setEditing(task)
  }

  const handleDuplicateTask = (task: AgentTask) => {
    setDuplicating(task)
  }

  const handleDeleteTask = (taskId: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      deleteTask(taskId)
    }
  }

  const handleCancelExecution = (execution: any) => {
    if (confirm('Are you sure you want to cancel this execution?')) {
      cancelExecution(execution.id)
    }
  }

  const handleShowHistory = (task: AgentTask) => {
    setSelectedTaskForHistory(task)
    setShowExecutions(true)
  }

  const isLoading = loadingTasks || loadingAgent

  if (!agentInstanceId) {
    navigate('/dashboard')
    return null
  }
  // Handle agent not found or error
  if (agentError || (!loadingAgent && !agentInstance)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary to-primaryLight">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="rounded-2xl bg-white/10 p-12 text-center backdrop-blur-md">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-error/20">
                <span className="text-2xl">❌</span>
              </div>
              <h3 className="mb-2 text-lg font-medium text-white">Agent Not Found</h3>
              <p className="mb-6 text-white/80">The specified agent instance could not be found.</p>
              <Button
                onClick={() => navigate('/dashboard')}
                className="bg-accent hover:bg-accent-700"
              >
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Handle chat agents (not allowed for tasks)
  if (agentInstance && agentInstance.agentType === agentTypeEnum.CHAT) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary to-primaryLight">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="rounded-2xl bg-white/10 p-12 text-center backdrop-blur-md">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-warning/20">
                <span className="text-2xl">💬</span>
              </div>
              <h3 className="mb-2 text-lg font-medium text-white">Chat Agent Detected</h3>
              <p className="mb-6 text-white/80">
                Tasks are only available for one-shot agents. This is a chat agent.
              </p>
              <div className="flex justify-center gap-4">
                <Button
                  onClick={() => navigate(`/chat/agent/${agentInstanceId}`)}
                  className="bg-success hover:bg-success/80"
                >
                  Go to Chat
                </Button>
                <Button
                  onClick={() => navigate('/dashboard')}
                  variant="ghost"
                  className="border-white/30 text-white hover:bg-white/10"
                >
                  Back to Dashboard
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary to-primaryLight">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              <p className="mt-4 text-white">Loading tasks...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const pageTitle = agentInstance ? `Tasks for ${agentInstance.friendlyName}` : 'All Agent Tasks'

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-primaryLight">
      <header className="relative mx-auto flex w-full flex-col justify-center px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="mb-3 text-left text-4xl font-extrabold text-white drop-shadow-lg sm:text-5xl">
                {pageTitle}
              </h1>
              <p className="mb-4 text-lg text-white/80">
                Manage scheduled tasks for your AI agents
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setShowExecutions(false)
                    setSelectedTaskForHistory(null)
                  }}
                  className={
                    !showExecutions
                      ? 'bg-white text-primary-600 shadow-lg'
                      : 'border-2 border-white/30 bg-white/10 text-white backdrop-blur-md hover:bg-white/20'
                  }
                >
                  ⚡ Tasks ({tasks?.results?.length || 0})
                </Button>
                <Button
                  onClick={() => {
                    setShowExecutions(true)
                    setSelectedTaskForHistory(null)
                  }}
                  className={
                    showExecutions
                      ? 'bg-white text-primary-600 shadow-lg'
                      : 'border-2 border-white/30 bg-white/10 text-white backdrop-blur-md hover:bg-white/20'
                  }
                >
                  📋{' '}
                  {selectedTaskForHistory
                    ? `History: ${selectedTaskForHistory.name}`
                    : `Executions (${executions?.results?.length || 0})`}
                </Button>
              </div>
            </div>
            <Button
              onClick={() => {
                setCreating(true)
              }}
              className="bg-accent shadow-xl hover:bg-accent-700"
            >
              + Create Task
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Button
            onClick={() => navigate('/dashboard')}
            variant="ghost"
            className="mb-4 border-white/30 text-white hover:bg-white/10"
          >
            ← Back to Dashboard
          </Button>
        </div>

        {!showExecutions ? (
          // Tasks View
          tasks?.results && tasks.results.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {tasks.results.map((task) => (
                <AgentTaskCard
                  key={task.id}
                  task={task}
                  onExecute={handleExecuteTask}
                  onPause={handlePauseTask}
                  onResume={handleResumeTask}
                  onEdit={handleEditTask}
                  onDuplicate={handleDuplicateTask}
                  onDelete={handleDeleteTask}
                  onShowHistory={handleShowHistory}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-white/30 bg-white/10 p-12 text-center backdrop-blur-md">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
                <span className="text-2xl">⏰</span>
              </div>
              <h3 className="mb-2 text-lg font-medium text-white">No tasks yet</h3>
              <p className="mb-6 text-white/80">
                Create your first scheduled task to automate your AI agents
              </p>
              <Button
                onClick={() => {
                  setCreating(true)
                }}
                className="bg-accent hover:bg-accent-700"
              >
                Create First Task
              </Button>
            </div>
          )
        ) : // Executions View
        executions?.results && executions.results.length > 0 ? (
          <div className="space-y-4">
            {executions.results.map((execution) => (
              <AgentTaskExecutionCard
                key={execution.id}
                execution={execution}
                onCancel={handleCancelExecution}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-white/30 bg-white/10 p-12 text-center backdrop-blur-md">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
              <span className="text-2xl">📋</span>
            </div>
            <h3 className="mb-2 text-lg font-medium text-white">No executions yet</h3>
            <p className="mb-6 text-white/80">
              Task executions will appear here when tasks are run
            </p>
          </div>
        )}
      </div>
      {editing || duplicating || creating ? (
        <CreateAgentTask
          agent={agentInstance}
          task={editing || undefined}
          duplicateFrom={duplicating || undefined}
          onSuccess={() => {
            setEditing(null)
            setDuplicating(null)
            setCreating(false)
          }}
          onCancel={() => {
            setEditing(null)
            setDuplicating(null)
            setCreating(false)
          }}
        />
      ) : null}
    </div>
  )
}
