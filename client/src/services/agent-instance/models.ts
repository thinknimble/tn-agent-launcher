import { GetInferredFromRaw } from '@thinknimble/tn-models'
import { z } from 'zod'
import { promptTemplateShape } from '../prompt-template'

export const providerKeysEnum = {
  OPENAI: 'OPENAI',
  ANTHROPIC: 'ANTHROPIC',
  OLLAMA: 'OLLAMA',
  GEMINI: 'GEMINI',
} as const
export type ProviderKeyValues = (typeof providerKeysEnum)[keyof typeof providerKeysEnum]
export const providerLabelMap = {
  [providerKeysEnum.OPENAI]: 'OpenAI',
  [providerKeysEnum.ANTHROPIC]: 'Anthropic',
  [providerKeysEnum.OLLAMA]: 'Ollama',
  [providerKeysEnum.GEMINI]: 'Google Gemini',
}

export const agentTypeEnum = {
  CHAT: 'chat',
  ONE_SHOT: 'one-shot',
} as const
export type AgentTypeValues = (typeof agentTypeEnum)[keyof typeof agentTypeEnum]
export const agentTypeLabelMap = {
  [agentTypeEnum.CHAT]: 'Chat',
  [agentTypeEnum.ONE_SHOT]: 'One-Shot',
}

export const agentInstanceShape = {
  id: z.string().uuid(),
  friendlyName: z.string(),
  provider: z.nativeEnum(providerKeysEnum),
  modelName: z.string(),
  apiKey: z.string(),
  targetUrl: z.string().optional().nullable(),
  agentType: z.nativeEnum(agentTypeEnum),
  user: z.string().uuid(),
  promptTemplate: z.object(promptTemplateShape).nullable().optional(),
  maskedApiKey: z.string().optional(),
}

export const createAgentInstanceShape = {
  friendlyName: agentInstanceShape.friendlyName,
  provider: agentInstanceShape.provider,
  modelName: agentInstanceShape.modelName,
  apiKey: agentInstanceShape.apiKey,
  targetUrl: agentInstanceShape.targetUrl,
  agentType: agentInstanceShape.agentType,
}

export type AgentInstance = GetInferredFromRaw<typeof agentInstanceShape>
export type CreateAgentInstance = GetInferredFromRaw<typeof createAgentInstanceShape>
