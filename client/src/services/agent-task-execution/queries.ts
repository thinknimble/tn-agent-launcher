import { Pagination } from '@thinknimble/tn-models'
import { agentTaskExecutionApi } from './api'

export const agentTaskExecutionQueries = {
  list: ({ filters, pagination }: { filters?: any; pagination: Pagination }) => ({
    queryKey: ['agentTaskExecutions', 'list', filters, pagination],
    queryFn: () => agentTaskExecutionApi.list({ filters, pagination }),
  }),

  retrieve: (id: string) => ({
    queryKey: ['agentTaskExecutions', 'retrieve', id],
    queryFn: () => agentTaskExecutionApi.retrieve(id),
  }),
}
