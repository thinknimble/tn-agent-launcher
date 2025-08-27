import { createApi } from '@thinknimble/tn-models'
import { chatFilterShape, chatShape, createChatShape } from './models'
import { axiosInstance } from '../axios-instance'

export const chatApi = createApi({
  client: axiosInstance,
  baseUri: '/chat/conversations/',
  models: {
    entity: chatShape,
    create: createChatShape,
    extraFilters: chatFilterShape,
  },
})
