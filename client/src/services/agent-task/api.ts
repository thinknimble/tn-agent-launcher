import { createApi, createCustomServiceCall } from '@thinknimble/tn-models'
import { axiosInstance } from 'src/services/axios-instance'
import {
  agentTaskShape,
  createAgentTaskShape,
  agentTaskFilterShape,
  agentTaskSinkShape,
  agentTaskFunnelShape,
  createAgentTaskSinkShape,
  createAgentTaskFunnelShape,
  presignedUrlRequestShape,
  presignedUrlResponseShape,
  agentTaskSinkFilterShape,
  agentTaskFunnelFilterShape,
} from './models'
import { z } from 'zod'
import { agentTaskExecutionShape } from '../agent-task-execution'

const executeNowCall = createCustomServiceCall({
  inputShape: z.string().uuid(),
  outputShape: agentTaskExecutionShape,
  cb: async ({ client, slashEndingBaseUri, input, utils: { fromApi } }) => {
    const response = await client.post(`${slashEndingBaseUri}${input}/execute_now/`)
    return fromApi(response.data)
  },
})

const pauseCall = createCustomServiceCall({
  inputShape: {},
  outputShape: agentTaskShape,
  cb: async ({ client, slashEndingBaseUri, input, utils: { fromApi } }) => {
    const response = await client.post(`${slashEndingBaseUri}pause/`, input)
    return fromApi(response.data)
  },
})

const resumeCall = createCustomServiceCall({
  inputShape: {},
  outputShape: agentTaskShape,
  cb: async ({ client, slashEndingBaseUri, input, utils: { fromApi } }) => {
    const response = await client.post(`${slashEndingBaseUri}resume/`, input)
    return fromApi(response.data)
  },
})

const generatePresignedUrlCall = createCustomServiceCall({
  inputShape: presignedUrlRequestShape,
  outputShape: presignedUrlResponseShape,
  cb: async ({ client, slashEndingBaseUri, input, utils: { toApi, fromApi } }) => {
    const response = await client.post(`${slashEndingBaseUri}generate_presigned_url/`, toApi(input))
    return fromApi(response.data)
  },
})

const regenerateWebhookSecretCall = createCustomServiceCall({
  inputShape: z.string().uuid(),
  outputShape: agentTaskShape,
  cb: async ({ client, slashEndingBaseUri, input, utils: { fromApi } }) => {
    const response = await client.post(`${slashEndingBaseUri}${input}/regenerate_webhook_secret/`)
    return fromApi(response.data)
  },
})

export const agentTaskApi = createApi({
  client: axiosInstance,
  baseUri: '/agents/tasks/',
  models: {
    entity: agentTaskShape,
    create: createAgentTaskShape,
    extraFilters: agentTaskFilterShape,
  },
  customCalls: {
    executeNow: executeNowCall,
    pause: pauseCall,
    resume: resumeCall,
    generatePresignedUrl: generatePresignedUrlCall,
    regenerateWebhookSecret: regenerateWebhookSecretCall,
  },
})

// Through model APIs for managing sinks and funnels
export const agentTaskSinkApi = createApi({
  client: axiosInstance,
  baseUri: '/agents/task-sinks/',
  models: {
    entity: agentTaskSinkShape,
    create: createAgentTaskSinkShape,
    extraFilters: agentTaskSinkFilterShape,
  },
})

export const agentTaskFunnelApi = createApi({
  client: axiosInstance,
  baseUri: '/agents/task-funnels/',
  models: {
    entity: agentTaskFunnelShape,
    create: createAgentTaskFunnelShape,
    extraFilters: agentTaskFunnelFilterShape,
  },
})
