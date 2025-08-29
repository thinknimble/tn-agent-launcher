import { createApi } from '@thinknimble/tn-models'
import { axiosInstance } from 'src/services/axios-instance'
import { agentInstanceFiltersShape, agentInstanceShape, createAgentInstanceShape } from './models'

export const agentInstanceApi = createApi({
  client: axiosInstance,
  baseUri: '/agents/instances/',
  models: {
    entity: agentInstanceShape,
    create: createAgentInstanceShape,
    extraFilters: agentInstanceFiltersShape
  },
})
