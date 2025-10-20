import { AgentTask, taskStatusLabelMap, scheduleTypeLabelMap } from 'src/services/agent-task'
import { Button } from './button'

interface AgentTaskCardProps {
  task: AgentTask
  onExecute?: (task: AgentTask) => void
  onPause?: (task: AgentTask) => void
  onResume?: (task: AgentTask) => void
  onEdit?: (task: AgentTask) => void
  onDuplicate?: (task: AgentTask) => void
  onDelete?: (taskId: string) => void
  onShowHistory?: (task: AgentTask) => void
}

export const AgentTaskCard = ({
  task,
  onExecute,
  onPause,
  onResume,
  onEdit,
  onDuplicate,
  onDelete,
  onShowHistory,
}: AgentTaskCardProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-accent-100 text-accent-800'
      case 'paused':
        return 'bg-warning-100 text-warning-800'
      case 'completed':
        return 'bg-success-100 text-success-800'
      case 'failed':
        return 'bg-error-100 text-error-800'
      default:
        return 'bg-primary-100 text-primary-800'
    }
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border-2 border-primary-200 bg-white shadow-lg transition-all hover:-translate-y-1 hover:shadow-2xl">
      <div className={`p-4 ${getStatusColor(task.status)}`}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-primary-600">{task.name}</h3>
          <span className="rounded-full bg-white/50 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
            {taskStatusLabelMap[task.status]}
          </span>
        </div>
        {task.description && (
          <p className="mt-2 line-clamp-2 text-sm text-primary-500">{task.description}</p>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-4 space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium text-primary-600">Agent:</span>
            <span className="text-primary-400">
              {task.agentInstanceRef?.friendlyName || task.agentInstance}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-primary-600">Schedule:</span>
            <span className="text-primary-400">{scheduleTypeLabelMap[task.scheduleType]}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-primary-600">Executions:</span>
            <span className="text-primary-400">
              {task.executionCount}
              {task.maxExecutions && ` / ${task.maxExecutions}`}
            </span>
          </div>
          {task.nextExecutionDisplay && (
            <div className="flex items-center gap-2">
              <span className="font-medium text-primary-600">Next:</span>
              <span className="text-primary-400">{task.nextExecutionDisplay}</span>
            </div>
          )}
          {task.lastExecutionDisplay && (
            <div className="flex items-center gap-2">
              <span className="font-medium text-primary-600">Last:</span>
              <span className="text-primary-400">{task.lastExecutionDisplay}</span>
            </div>
          )}
          {task.triggeredByTaskName && (
            <div className="flex items-center gap-2">
              <span className="font-medium text-primary-600">Triggered by:</span>
              <span className="bg-primary-50 rounded-full px-2 py-0.5 text-xs text-primary-600">
                {task.triggeredByTaskName}
              </span>
            </div>
          )}
        </div>

        <div className="mt-auto space-y-2">
          {task.status === 'active' && onExecute && (
            <Button
              onClick={() => onExecute(task)}
              className="w-full bg-accent px-3 py-2 text-sm text-white hover:bg-accent-700"
            >
              ▶ Run Now
            </Button>
          )}

          <div className="flex flex-wrap gap-2">
            {task.status === 'active' && onPause && (
              <Button
                onClick={() => onPause(task)}
                variant="ghost"
                className="flex-1 border border-warning px-2 py-1 text-xs text-warning hover:bg-warning/10"
              >
                Pause
              </Button>
            )}

            {task.status === 'paused' && onResume && (
              <Button
                onClick={() => onResume(task)}
                variant="ghost"
                className="flex-1 border border-accent px-2 py-1 text-xs text-accent hover:bg-accent/10"
              >
                Resume
              </Button>
            )}

            {onEdit && (
              <Button
                onClick={() => onEdit(task)}
                variant="ghost"
                className="hover:bg-primary-50 flex-1 border border-primary-300 px-2 py-1 text-xs text-primary-600"
              >
                Edit
              </Button>
            )}

            {onDuplicate && (
              <Button
                onClick={() => onDuplicate(task)}
                variant="ghost"
                className="flex-1 border border-blue-300 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
              >
                Duplicate
              </Button>
            )}

            {onShowHistory && (
              <Button
                onClick={() => onShowHistory(task)}
                variant="ghost"
                className="hover:bg-primary-50 flex-1 border border-primary-300 px-2 py-1 text-xs text-primary-600"
              >
                History
              </Button>
            )}

            {onDelete && (
              <Button
                onClick={() => onDelete(task.id)}
                variant="ghost"
                className="flex-1 border border-error px-2 py-1 text-xs text-error hover:bg-red-50"
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
