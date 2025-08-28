import { Pagination } from '@thinknimble/tn-models'
import { agentTaskApi } from './api'

export const agentTaskQueries = {
  list: ({ filters, pagination }: { filters?: any; pagination: Pagination }) => ({
    queryKey: ['agentTasks', 'list', filters, pagination],
    queryFn: () => agentTaskApi.list({ filters, pagination }),
  }),

  retrieve: (id: string) => ({
    queryKey: ['agentTasks', 'retrieve', id],
    queryFn: () => agentTaskApi.retrieve(id),
  }),
}
