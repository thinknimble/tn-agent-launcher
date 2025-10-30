import { createApi, createCustomServiceCall } from '@thinknimble/tn-models'
import { axiosInstance } from 'src/services/axios-instance'
import {
  integrationShape,
  createIntegrationShape,
  googleOAuthUrlShape,
  googleOAuthCallbackShape,
  googleOAuthResponseShape,
} from './models'
import { z } from 'zod'

export const getGoogleOAuthUrl = createCustomServiceCall({
  inputShape: { integrationId: z.string() },
  outputShape: googleOAuthUrlShape,
  cb: async ({ client, slashEndingBaseUri, input }) => {
    const response = await client.get(`${slashEndingBaseUri}${input.integrationId}/google-oauth-url/`)
    return response.data
  },
})

export const handleGoogleOAuthCallback = createCustomServiceCall({
  inputShape: googleOAuthCallbackShape,
  outputShape: googleOAuthResponseShape,
  cb: async ({ client, slashEndingBaseUri, input, utils: { toApi } }) => {
    const response = await client.post(`${slashEndingBaseUri}google-oauth-callback/`, toApi(input))
    return response.data
  },
})

export const revokeGoogleOAuth = createCustomServiceCall({
  inputShape: { integrationId: z.string() },
  outputShape: googleOAuthResponseShape,
  cb: async ({ client, slashEndingBaseUri, input }) => {
    const response = await client.delete(`${slashEndingBaseUri}${input.integrationId}/google-oauth-revoke/`)
    return response.data
  },
})

export const integrationApi = createApi({
  client: axiosInstance,
  baseUri: '/integrations/',
  models: {
    entity: integrationShape,
    create: createIntegrationShape,
  },
  customCalls: {
    getGoogleOAuthUrl,
    handleGoogleOAuthCallback,
    revokeGoogleOAuth,
  },
})