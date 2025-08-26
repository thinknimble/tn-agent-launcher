import { queryOptions } from '@tanstack/react-query'
import { agentProjectApi } from './api'
import { Pagination } from '@thinknimble/tn-models'

export const agentProjectQueries = {
  all: () => ['agent-instances'],
  list: (pagination: Pagination, filters: any = {}) =>
    queryOptions({
      queryKey: [...agentProjectQueries.all(), { pagination, filters }],
      queryFn: () => agentProjectApi.list({ ...pagination, ...filters }),
      enabled: true,
    }),
}
