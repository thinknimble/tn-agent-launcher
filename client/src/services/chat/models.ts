import { GetInferredFromRaw } from '@thinknimble/tn-models'
import { z } from 'zod'

export const chatShape = {
  id: z.string(),
  name: z.string(),
  completed: z.boolean(),
  created: z.string(),
}
export const createChatShape = {
  name: chatShape.name,
  agentInstance: z.string().uuid().nullable().optional(),
}

export const chatFilterShape = {
  agentInstance: z.string(),
}

export type Chat = GetInferredFromRaw<typeof chatShape>
export type CreateChat = GetInferredFromRaw<typeof createChatShape>
export type ChatFilter = GetInferredFromRaw<typeof chatFilterShape>
