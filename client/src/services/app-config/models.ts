import { GetInferredFromRaw } from '@thinknimble/tn-models'
import { z } from 'zod'

export const appConfigShape = {
  enableDocPreprocessing: z.boolean(),
}

export type AppConfig = GetInferredFromRaw<typeof appConfigShape>
