import { Pagination } from '@thinknimble/tn-models'
import { agentTaskApi } from './api'
import { AgentTaskFilter } from './models'

export const agentTaskQueries = {
  list: ({
    filters,
    pagination,
  }: {
    filters?: Partial<AgentTaskFilter>
    pagination: Pagination
  }) => ({
    queryKey: ['agent-tasks', filters, pagination],
    queryFn: () => agentTaskApi.list({ filters, pagination }),
  }),

  retrieve: (id: string) => ({
    queryKey: ['agent-tasks', id],
    queryFn: () => agentTaskApi.retrieve(id),
  }),
}
