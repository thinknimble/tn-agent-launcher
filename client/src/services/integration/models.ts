import { GetInferredFromRaw } from '@thinknimble/tn-models'
import { z } from 'zod'

export const integrationTypeEnum = {
  AWS_S3: 'aws_s3',
  GOOGLE_DRIVE: 'google_drive',
  WEBHOOK: 'webhook',
} as const

export type IntegrationTypeValues = (typeof integrationTypeEnum)[keyof typeof integrationTypeEnum]

export const integrationTypeEnumLabelMap = {
  [integrationTypeEnum.AWS_S3]: 'AWS S3',
  [integrationTypeEnum.GOOGLE_DRIVE]: 'Google Drive',
  [integrationTypeEnum.WEBHOOK]: 'Webhook',
}

export const integrationShape = {
  id: z.string().uuid(),
  name: z.string(),
  integrationType: z.nativeEnum(integrationTypeEnum),
  isSystemProvided: z.boolean(),
  webhookUrl: z.string().nullable(),
  webhookSecret: z.string().nullable().readonly(),
  agentTasks: z.array(z.string().uuid()).default([]),
  created: z.string().datetime(),
  lastEdited: z.string().datetime(),
  hasAppCredentials: z.boolean().readonly(),
  hasOauthCredentials: z.boolean().readonly(),
  oauthStatus: z.string().nullable().readonly(),
}

export const createIntegrationShape = {
  name: integrationShape.name,
  integrationType: integrationShape.integrationType,
  isSystemProvided: integrationShape.isSystemProvided,
  webhookUrl: integrationShape.webhookUrl.optional(),
  webhookSecret: z.string().optional(),
  agentTasks: integrationShape.agentTasks.optional(),
  // S3 credential fields
  awsAccessKeyId: z.string().optional(),
  awsSecretAccessKey: z.string().optional(),
  bucketName: z.string().optional(),
  region: z.string().optional(),
  location: z.string().optional(),
  // Google Drive credential file
  credentialsFile: z.instanceof(File).optional(),
}

export const updateIntegrationShape = {
  name: integrationShape.name.optional(),
  webhookUrl: integrationShape.webhookUrl.optional(),
  agentTasks: integrationShape.agentTasks.optional(),
}

export const googleOAuthUrlShape = {
  authUrl: z.string(),
}

export const googleOAuthCallbackShape = {
  code: z.string(),
  state: z.string(),
  isSystem: z.boolean(),
  credentialsFile: z.instanceof(File).optional(),
}

export const googleOAuthResponseShape = {
  message: z.string(),
  integrationId: z.string(),
}

export const integrationTypeOptionShape = {
  type: z.nativeEnum(integrationTypeEnum),
  label: z.string(),
  isSystem: z.boolean(),
  description: z.string(),
}

export type Integration = GetInferredFromRaw<typeof integrationShape>
export type CreateIntegration = GetInferredFromRaw<typeof createIntegrationShape>
export type UpdateIntegration = GetInferredFromRaw<typeof updateIntegrationShape>
export type GoogleOAuthUrl = GetInferredFromRaw<typeof googleOAuthUrlShape>
export type GoogleOAuthCallback = GetInferredFromRaw<typeof googleOAuthCallbackShape>
export type GoogleOAuthResponse = GetInferredFromRaw<typeof googleOAuthResponseShape>
export type IntegrationTypeOption = GetInferredFromRaw<typeof integrationTypeOptionShape>

/***
 * S3
 * System Provided Integration Credentials
 * just create
 * User Provided Integration Credentials
 * fill in creds form
 *
 * Google Drive
 * System Provided Integration Credentials
 * redirect to google oauth
 * User Provided Integration Credentials
 * redirect to google oauth
 *
 * Webhook
 * System Provided Integration Credentials
 * N/A
 * User Provided Integration Credentials
 * fill in webhook url
 */
