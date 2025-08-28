import { GetInferredFromRaw } from '@thinknimble/tn-models'
import { z } from 'zod'

export const agentProjectShape = {
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  user: z.string().uuid(),
}

export const createAgentProjectShape = {
  title: agentProjectShape.title,
  description: agentProjectShape.description,
}

export type AgentProject = GetInferredFromRaw<typeof agentProjectShape>
export type CreateAgentProject = GetInferredFromRaw<typeof createAgentProjectShape>
