import { GetInferredFromRaw } from '@thinknimble/tn-models'
import { z } from 'zod'

export const projectEnvironmentSecretShape = {
  id: z.string().uuid(),
  project: z.string().uuid(),
  key: z.string(),
  value: z.string().optional(), // Only available on creation response
  maskedValue: z.string(),
  description: z.string().optional(),
  created: z.string().datetime(),
  lastEdited: z.string().datetime(),
}

export const createProjectEnvironmentSecretShape = {
  project: projectEnvironmentSecretShape.project,
  key: projectEnvironmentSecretShape.key,
  value: z.string().min(1, 'Secret value is required'),
  description: projectEnvironmentSecretShape.description,
}

export const environmentSecretFiltersShape = {
  project: z.string().uuid(),
  search: z.string(),
}

export const environmentVariableShape = {
  label: z.string(),
  value: z.string(),
  description: z.string().optional(),
}



export type ProjectEnvironmentSecret = GetInferredFromRaw<typeof projectEnvironmentSecretShape>
export type CreateProjectEnvironmentSecret = GetInferredFromRaw<typeof createProjectEnvironmentSecretShape>
export type EnvironmentSecretFilters = GetInferredFromRaw<typeof environmentSecretFiltersShape>
export type EnvironmentVariable = GetInferredFromRaw<typeof environmentVariableShape>
