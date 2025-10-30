import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormProvider, useTnForm } from '@thinknimble/tn-forms-react'
import { Pagination } from '@thinknimble/tn-models'
import { createContext, useContext, useState } from 'react'
import { Modal, StepperModal } from 'src/components'
import { Button } from 'src/components/button'
import { Input } from 'src/components/input'
import {
  getIntegrationIcon,
  GoogleDriveIcon,
  S3Icon,
  WebhookIcon,
} from 'src/components/integration-icons'
import { PasswordInput } from 'src/components/password-input'
import {
  CustomS3Form,
  integrationApi,
  integrationQueries,
  integrationTypeEnum,
  TCustomS3Form,
  type Integration,
  type IntegrationTypeValues,
} from 'src/services/integration'


const S3IntegrationModal = ({
  isOpen,
  onClose,
  isLoading,
}: {
  isOpen: boolean
  onClose: () => void
  isLoading: boolean
}) => {
  const [step, setStep] = useState(1)
  const { form, createFormFieldChangeHandler } = useTnForm<TCustomS3Form>()
  const {mutate: createIntegration} = useMutation({
    mutationFn: integrationApi.create,
    onSuccess: () => {
      onClose()
    },
  })

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <section className="p-6">
        <h2 className="mb-4 text-2xl font-bold">Custom S3 Integration</h2>
        <div className="space-y-4">
          <form onSubmit={(e) => {
            e.preventDefault()
            createIntegration({
              name: 'Custom S3 Integration',
              integrationType: integrationTypeEnum.AWS_S3,
              isSystemProvided: false,
              awsAccessKeyId: form.awsAccessKeyId.value || '',
              awsSecretAccessKey: form.awsSecretAccessKey.value || '',
              bucketName: form.bucketName.value || '',
              region: form.region.value || '',
              location: form.location.value || '',
            })
          }}>
            <Input
              type="text"
              name={form.field.bucketName.name}
              label={form.field.bucketName.label}
              onChange={(e) => createFormFieldChangeHandler(form.bucketName)(e.target.value)}
            />
            <Input
              type="text"
              name={form.field.region.name}
              label={form.field.region.label}
              onChange={(e) => createFormFieldChangeHandler(form.region)(e.target.value)}
            />
            <Input
              type="text"
              name={form.field.location.name}
              label={form.field.location.label}
              onChange={(e) => createFormFieldChangeHandler(form.location)(e.target.value)}
            />
            <Input
              type="text"
              name={form.field.awsAccessKeyId.name}
              label={form.field.awsAccessKeyId.label}
              onChange={(e) => createFormFieldChangeHandler(form.awsAccessKeyId)(e.target.value)}
            />
            <PasswordInput
              type="password"
              name={form.field.awsSecretAccessKey.name}
              label={form.field.awsSecretAccessKey.label}
              onChange={(e) =>
                createFormFieldChangeHandler(form.awsSecretAccessKey)(e.target.value)
              }
            
            />
            <Button type="submit" variant="primary" isLoading={isLoading}>
              Save
            </Button>
          </form>
        </div>
      </section>
    </Modal>
  )
}

const GoogleDriveIntegrationModal = (type: 'custom' | 'system') => {

  return type === 'custom' && (
    <div>Custom implementation not available at this time</div>
  ) 

  
}

const WebhookIntegrationModal = () => {
  return <div>Webhook Integration Modal (to be implemented)</div>
}


const IntegrationTypeCard = ({
  type,
  title,
  description,
  icon,
  onCreateSystem,
  onCreateUser,
}: {
  type: IntegrationTypeValues
  title: string
  description: string
  icon: React.ReactNode
  onCreateSystem?: () => void
  onCreateUser?: () => void
}) => {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">{icon}</div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          </div>
        </div>
      </div>
      <div className="mt-4 flex space-x-3">
        {onCreateSystem && (
          <Button variant="secondary" onClick={onCreateSystem} className="flex-1">
            Use System Credentials
          </Button>
        )}

        {onCreateUser && (
          <Button onClick={onCreateUser} className="flex-1">
            Use My Credentials
          </Button>
        )}
      </div>
    </div>
  )
}

const IntegrationListCard = ({ integration, children }: { integration: Integration, children?: React.ReactNode }) => {
  const queryClient = useQueryClient()

  const deleteIntegration = useMutation({
    mutationFn: (id: string) => integrationApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] })
    },
  })

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {getIntegrationIcon(integration.integrationType, 'h-8 w-8')}
          <div>
            <h4 className="font-medium text-gray-900">{integration.name}</h4>
            <p className="text-sm text-gray-500">
              {integration.isSystemProvided ? 'System' : 'User'} • {integration.integrationType}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {integration.hasOauthCredentials && (
            <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">
              Connected
            </span>
          )}
          <Button
            variant="secondary"
            onClick={() => deleteIntegration.mutate(integration.id)}
            disabled={deleteIntegration.isPending}
          >
            {deleteIntegration.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>
      {children}
    </div>
  )
}

export const Integrations = () => {
  const queryClient = useQueryClient()
  const [showCustomS3Modal, setShowCustomS3Modal] = useState(false)

  // Fetch existing integrations
  const { data: integrationResponse } = useQuery(integrationQueries.list(new Pagination(), {}))

  const integrations = integrationResponse?.results || []

  // Create integration mutation
  const { mutate: createIntegration, isPending: isCreatingIntegration } = useMutation({
    mutationFn: integrationApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] })
    },
  })

  const handleCreateIntegration = (type: IntegrationTypeValues, isSystemProvided: boolean) => {
    const name = `${isSystemProvided ? 'System' : 'My'} ${
      type === integrationTypeEnum.GOOGLE_DRIVE
        ? 'Google Drive'
        : type === integrationTypeEnum.AWS_S3
          ? 'S3'
          : 'Webhook'
    }`
    createIntegration({
      name,
      integrationType: type,
      isSystemProvided,
    })
  }

  type integrationListItems = {
    type: IntegrationTypeValues
    title: string
    description: string
    systemOption?: () => void
    customOption?: () => void
    icon: React.ReactNode
    formClass: any
    children?: React.ReactNode
  }
  const integrationTypes: integrationListItems[] = [
    {
      type: integrationTypeEnum.GOOGLE_DRIVE,
      title: 'Google Drive',
      description: 'Access and manage files in Google Drive',
      systemOption: undefined,
      customOption: undefined,
      icon: <GoogleDriveIcon />,
      formClass: CustomS3Form,
      children: <GoogleDriveIntegrationModal />,
    },
    {
      type: integrationTypeEnum.AWS_S3,
      title: 'AWS S3',
      systemOption: () => handleCreateIntegration(integrationTypeEnum.AWS_S3, true),
      customOption: () => setShowCustomS3Modal(true),
      description: 'Store and retrieve files from Amazon S3',
      icon: <S3Icon />,
      formClass: CustomS3Form,
      children: <S3IntegrationModal isOpen={showCustomS3Modal} onClose={() => setShowCustomS3Modal(false)} isLoading={isCreatingIntegration} />,
    },
    {
      type: integrationTypeEnum.WEBHOOK,
      title: 'Webhook',
      description: 'Send HTTP requests to external services',
      systemOption: undefined,
      customOption: undefined,
      icon: <WebhookIcon />,
      formClass: CustomS3Form,
      children: <WebhookIntegrationModal />,
    },
  ]

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-gradient-to-br from-primary to-primaryLight">
      <header className="relative mx-auto flex w-full flex-col justify-center px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <h1 className="mb-3 text-left text-4xl font-extrabold text-white drop-shadow-lg sm:text-5xl">
            Integrations
          </h1>
          <p className="text-lg text-white/80">
            Connect external services to enhance your AI agents
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl flex-1 px-4 pb-12 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Existing Integrations */}
          {integrations.length > 0 && (
            <div>
              <h2 className="mb-4 text-2xl font-bold text-white">Your Integrations</h2>
              <div className="space-y-4">
                {integrations.map((integration) => (
                  <IntegrationListCard key={integration.id} integration={integration} />
                ))}
              </div>
            </div>
          )}

          {/* Available Integration Types */}
          <div>
            <h2 className="mb-4 text-2xl font-bold text-white">Available Integrations</h2>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {integrationTypes.map((integrationType) => (
                <FormProvider key={integrationType.type} formClass={integrationType.formClass}>
                  
                  <IntegrationTypeCard
                    key={integrationType.type}
                    type={integrationType.type}
                    title={integrationType.title}
                    description={integrationType.description}
                    icon={integrationType.icon}
                    onCreateSystem={
                      integrationType.systemOption != undefined
                        ? () => {
                            integrationType?.systemOption?.()
                          }
                        : undefined
                    }
                    onCreateUser={
                       integrationType.customOption != undefined
                        ? () => {
                            integrationType?.customOption?.()
                          }
                        : undefined
                    }
                  />
                  {integrationType.children}
                  </FormProvider>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
