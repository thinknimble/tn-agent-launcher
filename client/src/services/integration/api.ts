import { createApi, createCustomServiceCall } from '@thinknimble/tn-models'
import { axiosInstance } from 'src/services/axios-instance'
import {
  integrationShape,
  createIntegrationShape,
  integrationFilterShape,
  googleOAuthUrlShape,
  googleOAuthCallbackShape,
  googleOAuthResponseShape,
} from './models'
import { util, z } from 'zod'

export const getGoogleOAuthUrl = createCustomServiceCall({
  inputShape: {
    isSystem: z.boolean(),
    credentialsFile: z.instanceof(File).optional(),
  },
  outputShape: googleOAuthUrlShape,
  cb: async ({ client, slashEndingBaseUri, input, utils: { toApi, fromApi } }) => {
    const formData = new FormData()
    formData.append('is_system', input.isSystem.toString())
    if (input.credentialsFile) {
      formData.append('credentials', input.credentialsFile)
    }

    const response = await client.post(
      `${slashEndingBaseUri}google-oauth-redirect-url/`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    )
    return fromApi(response.data)
  },
})

export const handleGoogleOAuthCallback = createCustomServiceCall({
  inputShape: googleOAuthCallbackShape,
  outputShape: googleOAuthResponseShape,
  cb: async ({ client, slashEndingBaseUri, input, utils: { toApi, fromApi } }) => {
    const formData = new FormData()
    formData.append('code', input.code)
    formData.append('state', input.state)
    formData.append('is_system', input.isSystem.toString())
    if (input.credentialsFile) {
      formData.append('credentials', input.credentialsFile)
    }

    const response = await client.post(`${slashEndingBaseUri}google-oauth-callback/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return fromApi(response.data)
  },
})

export const revokeGoogleOAuth = createCustomServiceCall({
  inputShape: { integrationId: z.string() },

  cb: async ({ client, slashEndingBaseUri, input }) => {
    return await client.delete(`${slashEndingBaseUri}${input.integrationId}/google-oauth-revoke/`)
  },
})

export const integrationApi = createApi({
  client: axiosInstance,
  baseUri: '/integrations/',
  models: {
    entity: integrationShape,
    create: createIntegrationShape,
    extraFilters: integrationFilterShape,
  },
  customCalls: {
    getGoogleOAuthUrl,
    handleGoogleOAuthCallback,
    revokeGoogleOAuth,
  },
})
