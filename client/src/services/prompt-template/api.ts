import { createApi } from '@thinknimble/tn-models'
import { axiosInstance } from 'src/services/axios-instance'
import { createPromptTemplateShape, promptTemplateShape } from './models';


export const promptTemplateApi = createApi({
  client: axiosInstance,
  baseUri: '/chat/prompt-templates/',
  models: {
    entity: promptTemplateShape,
    create: createPromptTemplateShape,
  },
})
