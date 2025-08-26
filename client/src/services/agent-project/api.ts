import { createApi } from '@thinknimble/tn-models'
import { axiosInstance } from 'src/services/axios-instance'
import { agentProjectShape, createAgentProjectShape } from './models'

export const agentProjectApi = createApi({
  client: axiosInstance,
  baseUri: '/agents/projects/',
  models: {
    entity: agentProjectShape,
    create: createAgentProjectShape,
  },
})
