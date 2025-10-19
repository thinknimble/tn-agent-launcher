import { AgentTaskExecution, executionStatusLabelMap } from 'src/services/agent-task-execution'
import { Button } from './button'
import { MarkdownRenderer } from './markdown-renderer'
import { ApiSecuritySummary } from './api-security-summary'

interface AgentTaskExecutionCardProps {
  execution: AgentTaskExecution
  onCancel?: (execution: AgentTaskExecution) => void
}

export const AgentTaskExecutionCard = ({ execution, onCancel }: AgentTaskExecutionCardProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-warning-100 text-warning-800'
      case 'running':
        return 'bg-accent-100 text-accent-800'
      case 'completed':
        return 'bg-success-100 text-success-800'
      case 'failed':
        return 'bg-error-100 text-error-800'
      default:
        return 'bg-primary-100 text-primary-800'
    }
  }

  const canCancel = execution.status === 'pending' || execution.status === 'running'

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-primary-200 bg-white shadow-lg transition-all hover:shadow-xl">
      <div className={`p-4 ${getStatusColor(execution.status)}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-white/50 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
              {executionStatusLabelMap[execution.status]}
            </span>
            {execution.durationDisplay && (
              <span className="text-sm font-medium text-primary-600">⏱️ {execution.durationDisplay}</span>
            )}
          </div>
          {canCancel && onCancel && (
            <Button
              onClick={() => onCancel(execution)}
              variant="ghost"
              className="border border-error px-3 py-1 text-xs text-error hover:bg-red-50"
            >
              Cancel
            </Button>
          )}
        </div>
      </div>

      <div className="p-4">
        <div className="mb-3 space-y-2 text-sm">
          {execution.agentTaskName && (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-primary-600">Task:</span>
              <span className="text-primary-500">{execution.agentTaskName}</span>
            </div>
          )}
          {execution.startedDisplay && (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-primary-600">Started:</span>
              <span className="text-primary-400">{execution.startedDisplay}</span>
            </div>
          )}
          {execution.completedDisplay && (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-primary-600">Completed:</span>
              <span className="text-primary-400">{execution.completedDisplay}</span>
            </div>
          )}
        </div>

        {execution.errorMessage && (
          <div className="mb-3 rounded-xl border-2 border-error/20 bg-error/5 p-3 text-sm">
            <span className="font-semibold text-error">Error:</span>
            <p className="mt-1 text-error-700">{execution.errorMessage}</p>
          </div>
        )}

        {execution.apiSecuritySummary && (
          <div className="mb-3">
            <ApiSecuritySummary summary={execution.apiSecuritySummary} />
          </div>
        )}

        {execution.outputData && (
          <details className="rounded-xl border border-primary-200 bg-primary-50/50 text-left">
            <summary className="cursor-pointer p-3 font-semibold text-primary-600 hover:bg-primary-100/50">
              📄 View Output
            </summary>
            <div className="border-t border-primary-200 p-4 text-sm">
              <MarkdownRenderer content={execution.outputData?.result || ''} />
            </div>
          </details>
        )}
      </div>
    </div>
  )
}
