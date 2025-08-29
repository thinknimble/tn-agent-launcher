import { GetInferredFromRaw } from '@thinknimble/tn-models'
import { z } from 'zod'

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
  inputUrls: z.array(z.string().url()).optional().nullable(),
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
  inputUrls: agentTaskShape.inputUrls,
  scheduleType: agentTaskShape.scheduleType,
  scheduledAt: agentTaskShape.scheduledAt,
  intervalMinutes: agentTaskShape.intervalMinutes,
  maxExecutions: agentTaskShape.maxExecutions,
}

export const agentTaskFilterShape = {
  agentInstance: z.string(),
}

export type AgentTask = GetInferredFromRaw<typeof agentTaskShape>
export type CreateAgentTask = GetInferredFromRaw<typeof createAgentTaskShape>
export type AgentTaskFilter = GetInferredFromRaw<typeof agentTaskFilterShape>
