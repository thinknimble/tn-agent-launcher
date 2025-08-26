import { queryOptions } from '@tanstack/react-query'
import { agentInstanceApi } from './api'
import { Pagination } from '@thinknimble/tn-models'

export const agentInstanceQueries = {
  all: () => ['agent-instances'],
  list: (pagination: Pagination, filters: any = {}) =>
    queryOptions({
      queryKey: [...agentInstanceQueries.all(), { pagination, filters }],
      queryFn: () => agentInstanceApi.list({ ...pagination, ...filters }),
      enabled: true,
    }),
}
