import { Pagination } from '@thinknimble/tn-models'
import { agentTaskApi, agentTaskSinkApi, agentTaskFunnelApi } from './api'
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

export const agentTaskSinkQueries = {
  list: ({
    filters,
    pagination,
  }: {
    filters?: { agentTask?: string; integration?: string; isEnabled?: boolean }
    pagination: Pagination
  }) => ({
    queryKey: ['agent-task-sinks', filters, pagination],
    queryFn: () => agentTaskSinkApi.list({ filters, pagination }),
  }),

  retrieve: (id: string) => ({
    queryKey: ['agent-task-sinks', id],
    queryFn: () => agentTaskSinkApi.retrieve(id),
  }),
}

export const agentTaskFunnelQueries = {
  list: ({
    filters,
    pagination,
  }: {
    filters?: { agentTask?: string; integration?: string; isEnabled?: boolean }
    pagination: Pagination
  }) => ({
    queryKey: ['agent-task-funnels', filters, pagination],
    queryFn: () => agentTaskFunnelApi.list({ filters, pagination }),
  }),

  retrieve: (id: string) => ({
    queryKey: ['agent-task-funnels', id],
    queryFn: () => agentTaskFunnelApi.retrieve(id),
  }),
}
