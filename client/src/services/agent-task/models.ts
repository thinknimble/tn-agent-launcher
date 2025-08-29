import { GetInferredFromRaw } from '@thinknimble/tn-models'
import { z } from 'zod'

export const sourceTypeEnum = {
  PUBLIC_URL: 'public_url',
  OUR_S3: 'our_s3',
  USER_S3: 'user_s3',
  GOOGLE_DRIVE_PUBLIC: 'google_drive_public',
  GOOGLE_DRIVE_PRIVATE: 'google_drive_private',
  DROPBOX_PUBLIC: 'dropbox_public',
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
  [sourceTypeEnum.UNKNOWN]: 'Unknown',
}

export const inputSourceShape = {
  url: z.string().url(),
  sourceType: z.nativeEnum(sourceTypeEnum),
  filename: z.string().optional(),
  size: z.number().optional(),
  contentType: z.string().optional(),
}

export const scheduleTypeEnum = {
  ONCE: 'once',
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  HOURLY: 'hourly',
  CUSTOM_INTERVAL: 'custom_interval',
} as const

export type ScheduleTypeValues = (typeof scheduleTypeEnum)[keyof typeof scheduleTypeEnum]

export const scheduleTypeLabelMap = {
  [scheduleTypeEnum.ONCE]: 'Run Once',
  [scheduleTypeEnum.DAILY]: 'Daily',
  [scheduleTypeEnum.WEEKLY]: 'Weekly',
  [scheduleTypeEnum.MONTHLY]: 'Monthly',
  [scheduleTypeEnum.HOURLY]: 'Hourly',
  [scheduleTypeEnum.CUSTOM_INTERVAL]: 'Custom Interval',
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
  agentInstanceName: z.string().optional(),
  instruction: z.string(),
  inputSources: z.array(z.object(inputSourceShape)).optional().nullable(),
  scheduleType: z.nativeEnum(scheduleTypeEnum),
  scheduledAt: z.string().datetime().optional().nullable(),
  intervalMinutes: z.number().positive().optional().nullable(),
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
  inputSources: agentTaskShape.inputSources,
  scheduleType: agentTaskShape.scheduleType,
  scheduledAt: agentTaskShape.scheduledAt,
  intervalMinutes: agentTaskShape.intervalMinutes,
  maxExecutions: agentTaskShape.maxExecutions,
}

export const agentTaskFilterShape = {
  agentInstance: z.string(),
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
