import { createCustomServiceCall } from '@thinknimble/tn-models'
import { axiosInstance } from '../axios-instance'
import { appConfigShape } from './models'

export const getAppConfig = createCustomServiceCall.standAlone({
  client: axiosInstance,
  models: {
    outputShape: appConfigShape,
  },
  name: "getAppConfig",
  cb: async ({ client, utils }) => {
    const res = await client.get("/api/config/")
    return utils.fromApi(res.data)
  },
})