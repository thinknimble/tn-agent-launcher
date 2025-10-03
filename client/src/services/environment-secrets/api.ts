import { createApi } from '@thinknimble/tn-models'
import { axiosInstance } from '../axios-instance'
import {
  projectEnvironmentSecretShape,
  createProjectEnvironmentSecretShape,
  environmentSecretFiltersShape,
 
} from './models'

export const environmentSecretApi = createApi({
  client: axiosInstance,
  baseUri: '/agents/environment-secrets/',
  models: {
    entity: projectEnvironmentSecretShape,
    create: createProjectEnvironmentSecretShape,
    extraFilters: environmentSecretFiltersShape
    
  },
})

export type EnvironmentSecretApi = typeof environmentSecretApi