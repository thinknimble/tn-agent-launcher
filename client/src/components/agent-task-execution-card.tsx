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
    <div className="rounded-lg border border-primary-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(execution.status)}`}
            >
              {executionStatusLabelMap[execution.status]}
            </span>
            {execution.durationDisplay && (
              <span className="text-xs text-primary-400">{execution.durationDisplay}</span>
            )}
          </div>

          <div className="space-y-1 text-sm text-primary-600">
            {execution.startedDisplay && (
              <p>
                <span className="font-medium">Started:</span> {execution.startedDisplay}
              </p>
            )}
            {execution.completedDisplay && (
              <p>
                <span className="font-medium">Completed:</span> {execution.completedDisplay}
              </p>
            )}
            {execution.agentTaskName && (
              <p>
                <span className="font-medium">Task:</span> {execution.agentTaskName}
              </p>
            )}
          </div>

          {execution.errorMessage && (
            <div className="bg-error-50 text-error-700 mt-2 rounded p-2 text-sm">
              <span className="font-medium">Error:</span> {execution.errorMessage}
            </div>
          )}

          {execution.apiSecuritySummary && (
            <div className="mt-3">
              <ApiSecuritySummary summary={execution.apiSecuritySummary} />
            </div>
          )}

          {execution.outputData && (
            <div className="mt-2">
              <details className="rounded-md bg-secondary-400 p-4 text-left text-sm">
                <summary className="cursor-pointer font-medium text-primary-600">Output</summary>
                <MarkdownRenderer content={execution.outputData?.result || ''} />
                {/* {JSON.stringify(execution.outputData?.result, null, 2)} */}
              </details>
            </div>
          )}
        </div>

        <div className="flex flex-col space-y-2">
          {canCancel && onCancel && (
            <Button
              onClick={() => onCancel(execution)}
              variant="ghost"
              className="border-error px-2 py-1 text-xs text-error hover:bg-red-50"
            >
              Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
