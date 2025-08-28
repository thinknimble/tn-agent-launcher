import { GetInferredFromRaw } from '@thinknimble/tn-models'
import { z } from 'zod'

export const chatRoleKeysEnum = {
  assistant: 'assistant',
  user: 'user',
} as const

export type chatRoleKeyValues = (typeof chatRoleKeysEnum)[keyof typeof chatRoleKeysEnum]
export const chatRoleLabelMap = {
  [chatRoleKeysEnum.assistant]: 'Assistant',
  [chatRoleKeysEnum.user]: 'User',
}

export const chatMessageShape = {
  id: z.string(),
  content: z.string(),
  role: z.nativeEnum(chatRoleKeysEnum),
  created: z.string(),
}

export const chatMessageFilterShape = {
  chat: z.string(),
}

export type Chat = GetInferredFromRaw<typeof chatMessageShape>
export type ChatFilter = GetInferredFromRaw<typeof chatMessageFilterShape>
