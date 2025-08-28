import { GetInferredFromRaw } from '@thinknimble/tn-models'
import { z } from 'zod'

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

export const agentTaskExecutionShape = {
  id: z.string().uuid(),
  agentTask: z.string().uuid(),
  agentTaskName: z.string().optional(),
  status: z.nativeEnum(executionStatusEnum),
  startedAt: z.string().datetime().optional().nullable(),
  startedDisplay: z.string().optional().nullable(),
  completedAt: z.string().datetime().optional().nullable(),
  completedDisplay: z.string().optional().nullable(),
  inputData: z.record(z.any()).optional().nullable(),
  outputData: z.record(z.any()).optional().nullable(),
  errorMessage: z.string().optional().nullable(),
  executionTimeSeconds: z.number().optional().nullable(),
  durationDisplay: z.string().optional().nullable(),
  backgroundTaskId: z.string().optional().nullable(),
  created: z.string().datetime(),
}

export const agentTaskExecutionFilterShape = {
  agentTask: z.string(),
  status: z.string(),
  agentTask__agentInstance: z.string(),
}
export type AgentTaskExecution = GetInferredFromRaw<typeof agentTaskExecutionShape>
export type AgentTaskExecutionFilter = GetInferredFromRaw<typeof agentTaskExecutionFilterShape>
