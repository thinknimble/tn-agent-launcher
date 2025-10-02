import { Pagination } from '@thinknimble/tn-models'
import { agentTaskExecutionApi } from './api'
import { AgentTaskExecutionFilter } from './models'

export const agentTaskExecutionQueries = {
  list: ({
    filters,
    pagination,
  }: {
    filters?: Partial<AgentTaskExecutionFilter>
    pagination: Pagination
  }) => ({
    queryKey: ['agent-task-executions', 'list', filters, pagination],
    queryFn: () => agentTaskExecutionApi.list({ filters, pagination }),
    enabled: !!filters?.agentTask || !!filters?.agentTask__agentInstance,
  }),

  retrieve: (id: string) => ({
    queryKey: ['agent-task-executions', 'retrieve', id],
    queryFn: () => agentTaskExecutionApi.retrieve(id),
  }),
}
