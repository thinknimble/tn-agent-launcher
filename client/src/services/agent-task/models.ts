import { GetInferredFromRaw } from '@thinknimble/tn-models'
import { z } from 'zod'
import { agentInstanceShape } from '../agent-instance'

export const sourceTypeEnum = {
  PUBLIC_URL: 'public_url',
  OUR_S3: 'our_s3',
  USER_S3: 'user_s3',
  GOOGLE_DRIVE_PUBLIC: 'google_drive_public',
  GOOGLE_DRIVE_PRIVATE: 'google_drive_private',
  DROPBOX_PUBLIC: 'dropbox_public',
  AGENT_OUTPUT: 'agent_output',
  UNKNOWN: 'unknown',
} as const

export type SourceTypeValues = (typeof sourceTypeEnum)[keyof typeof sourceTypeEnum]

export const sourceTypeLabelMap = {
  [sourceTypeEnum.PUBLIC_URL]: 'Public URL',
  [sourceTypeEnum.OUR_S3]: 'Our Storage',
  [sourceTypeEnum.USER_S3]: 'Your S3',
  [sourceTypeEnum.GOOGLE_DRIVE_PUBLIC]: 'Google Drive (Public)',
  [sourceTypeEnum.GOOGLE_DRIVE_PRIVATE]: 'Google Drive (Private)',
  [sourceTypeEnum.DROPBOX_PUBLIC]: 'Dropbox (Public)',
  [sourceTypeEnum.AGENT_OUTPUT]: 'Agent Output',
  [sourceTypeEnum.UNKNOWN]: 'Unknown',
}

export const inputSourceShape = {
  url: z.string().url(),
  sourceType: z.nativeEnum(sourceTypeEnum),
  filename: z.string(), // Make filename required to match backend expectations
  size: z.number().optional(),
  contentType: z.string().optional(),
  // Document processing configuration
  skipPreprocessing: z.boolean().optional(),
  // Image processing options (when skipPreprocessing is false)
  preprocessImage: z.boolean().optional(),
  isDocumentWithText: z.boolean().optional(),
  replaceImagesWithDescriptions: z.boolean().optional(),
  // PDF processing options (when skipPreprocessing is false)
  containsImages: z.boolean().optional(),
  extractImagesAsText: z.boolean().optional(),
}

export const scheduleTypeEnum = {
  ONCE: 'once', // Deprecated, use MANUAL instead
  MANUAL: 'manual',
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  HOURLY: 'hourly',
  CUSTOM_INTERVAL: 'custom_interval',
  AGENT: 'agent',
  WEBHOOK: 'webhook',
} as const

export type ScheduleTypeValues = (typeof scheduleTypeEnum)[keyof typeof scheduleTypeEnum]

export const scheduleTypeLabelMap = {
  [scheduleTypeEnum.ONCE]: 'Run Once (Deprecated)',
  [scheduleTypeEnum.MANUAL]: 'Manual',
  [scheduleTypeEnum.DAILY]: 'Daily',
  [scheduleTypeEnum.WEEKLY]: 'Weekly',
  [scheduleTypeEnum.MONTHLY]: 'Monthly',
  [scheduleTypeEnum.HOURLY]: 'Hourly',
  [scheduleTypeEnum.CUSTOM_INTERVAL]: 'Custom Interval',
  [scheduleTypeEnum.AGENT]: 'Triggered by Another Task',
  [scheduleTypeEnum.WEBHOOK]: 'Webhook Trigger',
}

export const taskStatusEnum = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const

export type TaskStatusValues = (typeof taskStatusEnum)[keyof typeof taskStatusEnum]

export const taskStatusLabelMap = {
  [taskStatusEnum.ACTIVE]: 'Active',
  [taskStatusEnum.PAUSED]: 'Paused',
  [taskStatusEnum.COMPLETED]: 'Completed',
  [taskStatusEnum.FAILED]: 'Failed',
}

export const executionStatusEnum = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const

export type ExecutionStatusValues = (typeof executionStatusEnum)[keyof typeof executionStatusEnum]

export const executionStatusLabelMap = {
  [executionStatusEnum.PENDING]: 'Pending',
  [executionStatusEnum.RUNNING]: 'Running',
  [executionStatusEnum.COMPLETED]: 'Completed',
  [executionStatusEnum.FAILED]: 'Failed',
}

export const agentTaskShape = {
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional().nullable(),
  agentInstance: z.string().uuid(),
  agentInstanceRef: z.object(agentInstanceShape).optional().nullable(), // Expanded agent instance when included
  instruction: z.string(),
  variables: z.record(z.any()).optional(),
  inputSources: z.array(z.object(inputSourceShape)).optional().nullable(),
  scheduleType: z.nativeEnum(scheduleTypeEnum),
  scheduledAt: z.string().datetime().or(z.string()).optional().nullable(),
  intervalMinutes: z.number().positive().optional().nullable(),
  triggeredByTask: z.string().uuid().optional().nullable(),
  triggeredByTaskName: z.string().optional().nullable(),
  webhookSecret: z.string().optional().nullable(),
  webhookValidateSignature: z.boolean().default(true),
  webhookUrl: z.string().optional().nullable(),
  status: z.nativeEnum(taskStatusEnum),
  lastExecutedAt: z.string().datetime().optional().nullable(),
  lastExecutionDisplay: z.string().optional().nullable(),
  nextExecutionAt: z.string().datetime().optional().nullable(),
  nextExecutionDisplay: z.string().optional().nullable(),
  maxExecutions: z.number().positive().optional().nullable(),
  executionCount: z.number().nonnegative(),
  created: z.string().datetime(),
  updated: z.string().datetime(),
}

export const createAgentTaskShape = {
  name: agentTaskShape.name,
  description: agentTaskShape.description,
  agentInstance: agentTaskShape.agentInstance,
  instruction: agentTaskShape.instruction,
  variables: agentTaskShape.variables,
  inputSources: agentTaskShape.inputSources,
  scheduleType: agentTaskShape.scheduleType,
  scheduledAt: agentTaskShape.scheduledAt,
  intervalMinutes: agentTaskShape.intervalMinutes,
  triggeredByTask: agentTaskShape.triggeredByTask,
  webhookValidateSignature: agentTaskShape.webhookValidateSignature,
  maxExecutions: agentTaskShape.maxExecutions,
}

export const agentTaskFilterShape = {
  agentInstance: z.string(),
  agentInstance__projects: z.string().array(),
}

export type InputSource = GetInferredFromRaw<typeof inputSourceShape>
export type AgentTask = GetInferredFromRaw<typeof agentTaskShape>
export type CreateAgentTask = GetInferredFromRaw<typeof createAgentTaskShape>
export type AgentTaskFilter = GetInferredFromRaw<typeof agentTaskFilterShape>

export const presignedUrlRequestShape = {
  filename: z.string(),
  contentType: z.string().optional(),
}

export const presignedUrlResponseShape = {
  presignedPost: z.object({
    url: z.string(),
    fields: z.record(z.string()),
  }),
  publicUrl: z.string(),
  filename: z.string(),
  key: z.string(),
}

export type PresignedUrlRequest = GetInferredFromRaw<typeof presignedUrlRequestShape>
export type PresignedUrlResponse = GetInferredFromRaw<typeof presignedUrlResponseShape>
