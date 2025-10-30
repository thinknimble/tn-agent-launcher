import { queryOptions } from '@tanstack/react-query'
import { integrationApi } from './api'
import { Pagination } from '@thinknimble/tn-models'

export const integrationQueries = {
  all: () => ['integrations'],
  list: (pagination: Pagination, filters: any = {}) =>
    queryOptions({
      queryKey: [...integrationQueries.all(), { pagination, filters }],
      queryFn: () => integrationApi.list({ ...pagination, ...filters }),
      enabled: true,
    }),
  retrieve: (id: string) =>
    queryOptions({
      queryKey: [...integrationQueries.all(), id],
      queryFn: () => integrationApi.retrieve(id),
      enabled: Boolean(id),
    }),
}
