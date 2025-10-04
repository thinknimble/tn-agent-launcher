import { GetInferredFromRaw } from '@thinknimble/tn-models'
import { z } from 'zod'

export const chatRoleKeysEnum = {
  assistant: 'assistant',
  user: 'user',
  tool: 'tool',
} as const

export type chatRoleKeyValues = (typeof chatRoleKeysEnum)[keyof typeof chatRoleKeysEnum]
export const chatRoleLabelMap = {
  [chatRoleKeysEnum.assistant]: 'Assistant',
  [chatRoleKeysEnum.user]: 'User',
  [chatRoleKeysEnum.tool]: 'Tool',
}

export const chatMessageShape = {
  id: z.string(),
  content: z.string(),
  role: z.nativeEnum(chatRoleKeysEnum),
  created: z.string(),
  parsedContent: z
    .object({
      type: z.enum(['user_message', 'agent_response', 'tool_call', 'tool_result', 'message']),
      content: z.string().optional(),
      function: z.string().optional(),
      arguments: z.any().optional(),
      toolName: z.string().optional(),
      result: z.any().optional(),
      raw: z.string().optional(),
      error: z.string().optional(),
    })
    .optional(),
}

export const chatMessageFilterShape = {
  chat: z.string(),
}

export type Chat = GetInferredFromRaw<typeof chatMessageShape>
export type ChatFilter = GetInferredFromRaw<typeof chatMessageFilterShape>
