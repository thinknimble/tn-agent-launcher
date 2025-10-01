import { z } from 'zod'

export const appConfigShape = {
  enableDocPreprocessing: z.boolean(),
}

export type AppConfig = z.infer<typeof z.object(appConfigShape)>