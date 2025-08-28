import { createApi } from '@thinknimble/tn-models'
import { chatMessageFilterShape, chatMessageShape } from './models'
import { axiosInstance } from '../axios-instance'

export const chatMessageApi = createApi({
  client: axiosInstance,
  baseUri: '/chat/chat-messages/',
  models: {
    entity: chatMessageShape,
    extraFilters: chatMessageFilterShape,
  },
})
