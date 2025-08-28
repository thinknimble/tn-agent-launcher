import { queryOptions } from '@tanstack/react-query'
import { chatApi } from './api'
import { Pagination } from '@thinknimble/tn-models'
import { ChatFilter } from './models'

export const chatQueries = {
  all: () => ['chat'],
  retrieve: (id: string) =>
    queryOptions({
      queryKey: [...chatQueries.all(), id],
      queryFn: () => chatApi.retrieve(id),
      enabled: Boolean(id),
    }),
  list: ({ filters, pagination }: { filters?: ChatFilter; pagination: Pagination }) =>
    queryOptions({
      queryKey: [...chatQueries.all(), { filters, pagination }],
      queryFn: () => chatApi.list({ filters, pagination }),
      enabled: true,
    }),
}
