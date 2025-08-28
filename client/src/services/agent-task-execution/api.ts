import { createApi, createCustomServiceCall } from '@thinknimble/tn-models'
import { axiosInstance } from 'src/services/axios-instance'
import { agentTaskExecutionShape, agentTaskExecutionFilterShape } from './models'

const cancelCall = createCustomServiceCall({
  inputShape: {},
  outputShape: agentTaskExecutionShape,
  cb: async ({ client, slashEndingBaseUri, input, utils: { fromApi } }) => {
    const response = await client.post(`${slashEndingBaseUri}cancel/`, input)
    return fromApi(response.data)
  },
})

export const agentTaskExecutionApi = createApi({
  client: axiosInstance,
  baseUri: '/agents/executions/',
  models: {
    entity: agentTaskExecutionShape,
    extraFilters: agentTaskExecutionFilterShape,
  },
  customCalls: {
    cancel: cancelCall,
  },
})
