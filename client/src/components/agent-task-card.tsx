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
    <div className="rounded-lg border border-primary-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-primary-600">{task.name}</h3>
            <span
              className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(task.status)}`}
            >
              {taskStatusLabelMap[task.status]}
            </span>
          </div>

          {task.description && (
            <p className="mt-1 line-clamp-2 text-sm text-primary-400">{task.description}</p>
          )}

          <div className="mt-2 space-y-1 text-xs text-primary-400">
            <p>
              <span className="font-medium">Agent:</span> {task.agentInstanceRef?.friendlyName || task.agentInstance}
            </p>
            <p>
              <span className="font-medium">Schedule:</span>{' '}
              {scheduleTypeLabelMap[task.scheduleType]}
            </p>
            <p>
              <span className="font-medium">Executions:</span> {task.executionCount}
              {task.maxExecutions && ` / ${task.maxExecutions}`}
            </p>
            {task.nextExecutionDisplay && (
              <p>
                <span className="font-medium">Next:</span> {task.nextExecutionDisplay}
              </p>
            )}
            {task.lastExecutionDisplay && (
              <p>
                <span className="font-medium">Last:</span> {task.lastExecutionDisplay}
              </p>
            )}
            {task.triggeredByTaskName && (
              <p>
                <span className="font-medium">Triggered by:</span> {task.triggeredByTaskName}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col space-y-2">
          {task.status === 'active' && onExecute && (
            <Button
              onClick={() => onExecute(task)}
              className="bg-accent-600 px-3 py-1 text-xs text-white hover:bg-accent-700"
            >
              ▶Run Now
            </Button>
          )}

          <div className="flex space-x-1">
            {task.status === 'active' && onPause && (
              <Button
                onClick={() => onPause(task)}
                variant="ghost"
                className="hover:bg-warning-50 border-warning px-2 py-1 text-xs text-warning"
              >
                Pause
              </Button>
            )}

            {task.status === 'paused' && onResume && (
              <Button
                onClick={() => onResume(task)}
                variant="ghost"
                className="hover:bg-accent-50 border-accent px-2 py-1 text-xs text-accent"
              >
                Resume
              </Button>
            )}

            {onEdit && (
              <Button
                onClick={() => onEdit(task)}
                variant="ghost"
                className="hover:bg-primary-50 border-primary-300 px-2 py-1 text-xs text-primary-600"
              >
                Edit
              </Button>
            )}

            {onDuplicate && (
              <Button
                onClick={() => onDuplicate(task)}
                variant="ghost"
                className="border-blue-300 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
              >
                Duplicate
              </Button>
            )}

            {onShowHistory && (
              <Button
                onClick={() => onShowHistory(task)}
                variant="ghost"
                className="hover:bg-primary-50 border-primary-300 px-2 py-1 text-xs text-primary-600"
              >
                History
              </Button>
            )}

            {onDelete && (
              <Button
                onClick={() => onDelete(task.id)}
                variant="ghost"
                className="border-error px-2 py-1 text-xs text-error hover:bg-red-50"
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
