import { queryOptions } from '@tanstack/react-query'
import { chatMessageApi } from './api'
import { Pagination } from '@thinknimble/tn-models'
import { ChatFilter } from './models'

export const chatMessageQueries = {
  all: () => ['chat-messages'],
  retrieve: (id: string) =>
    queryOptions({
      queryKey: [...chatMessageQueries.all(), id],
      queryFn: () => chatMessageApi.retrieve(id),
      enabled: Boolean(id),
    }),
  list: ({ filters, pagination }: { filters?: ChatFilter; pagination: Pagination }) =>
    queryOptions({
      queryKey: [...chatMessageQueries.all(), { filters, pagination }],
      queryFn: () => chatMessageApi.list({ filters, pagination }),
      enabled: Boolean(filters?.chat),
    }),
}
