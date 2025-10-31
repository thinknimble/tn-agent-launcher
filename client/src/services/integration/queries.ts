import { queryOptions } from '@tanstack/react-query'
import { integrationApi } from './api'
import { Pagination } from '@thinknimble/tn-models'
import type { IntegrationFilter } from './models'

export const integrationQueries = {
  all: () => ['integrations'],
  list: ({
    pagination,
    filters,
  }: {
    pagination: Pagination
    filters?: Partial<IntegrationFilter>
  }) =>
    queryOptions({
      queryKey: [...integrationQueries.all(), { pagination, filters }],
      queryFn: () => integrationApi.list({ pagination, filters }),
      enabled: true,
    }),
  retrieve: (id: string) =>
    queryOptions({
      queryKey: [...integrationQueries.all(), id],
      queryFn: () => integrationApi.retrieve(id),
      enabled: Boolean(id),
    }),
}
