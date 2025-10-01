import { useQuery } from '@tanstack/react-query'
import { getAppConfig } from './api'

export const useAppConfig = () => {
  return useQuery({
    queryKey: ['appConfig'],
    queryFn: getAppConfig,
    staleTime: 5 * 60 * 1000,
  })
}
