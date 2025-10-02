import { queryOptions } from '@tanstack/react-query'
import { agentInstanceApi } from './api'
import { Pagination } from '@thinknimble/tn-models'
import { AgentInstanceFilters } from './models'

export const agentInstanceQueries = {
  all: () => ['agent-instances'],
  retrieve: (id: string) =>
    queryOptions({
      queryKey: [...agentInstanceQueries.all(), id],
      queryFn: () => agentInstanceApi.retrieve(id),
      enabled: Boolean(id),
    }),
  list: (pagination: Pagination, filters?: Partial<AgentInstanceFilters>) => {
    return queryOptions({
      queryKey: [...agentInstanceQueries.all(), { pagination, filters }],
      queryFn: () => agentInstanceApi.list({ pagination, filters }),
      enabled: filters?.projects?.length ? true : false,
    })
  },
}
