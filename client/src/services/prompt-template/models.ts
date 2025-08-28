import { GetInferredFromRaw } from '@thinknimble/tn-models'
import { z } from 'zod'

export const promptTemplateShape = {
  id: z.string().uuid(),
  name: z.string(),
  content: z.string().nullable(),
  agentInstance: z.string().uuid(),
}

export const createPromptTemplateShape = {
  name: promptTemplateShape.name,
  content: promptTemplateShape.content,
  agentInstance: promptTemplateShape.agentInstance,
}

export type PromptTemplate = GetInferredFromRaw<typeof promptTemplateShape>
export type CreatePromptTemplate = GetInferredFromRaw<typeof createPromptTemplateShape>
