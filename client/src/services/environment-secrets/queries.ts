import { Pagination } from '@thinknimble/tn-models'
import { environmentSecretApi } from './api'
import { EnvironmentSecretFilters } from './models';

// Query factory for environment secrets
export const environmentSecretQueries = {
  // List all environment secrets with pagination
  list: ({ pagination, filters }: { pagination?: Pagination, filters: EnvironmentSecretFilters }) => ({
    queryKey: ['environment-secrets', 'list', pagination],
    queryFn: () => environmentSecretApi.list({ pagination, filters }),
  }),

  // Get a single environment secret by ID
  retrieve: (id: string) => ({
    queryKey: ['environment-secrets', 'detail', id],
    queryFn: () => environmentSecretApi.retrieve(id),
  }),
}

export type EnvironmentSecretQueries = typeof environmentSecretQueries