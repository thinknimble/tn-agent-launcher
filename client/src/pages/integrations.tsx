import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormProvider, useTnForm } from '@thinknimble/tn-forms-react'
import { Pagination } from '@thinknimble/tn-models'
import { createContext, useContext, useState, useEffect } from 'react'
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
  WebHookForm,
  TWebHookForm,
  type Integration,
  type IntegrationTypeValues,
} from 'src/services/integration'
import { useOAuthStore } from 'src/stores/oauth-state'


const S3IntegrationModal = ({
  isOpen,
  onClose,
  isLoading,
}: {
  isOpen: boolean
  onClose: () => void
  isLoading: boolean
}) => {
  // const [step, setStep] = useState(1)
  // const { form, createFormFieldChangeHandler } = useTnForm<TCustomS3Form>()
  // const {mutate: createIntegration} = useMutation({
  //   mutationFn: integrationApi.create,
  //   onSuccess: () => {
  //     onClose()
  //   },
  // })

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <section className="p-6">
        <h2 className="mb-4 text-2xl font-bold">Custom S3 Integration</h2>
        <div className="text-center py-8">
          <p className="text-gray-500 text-lg">Custom S3 integration not implemented yet</p>
        </div>
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
        
        {/* <div className="space-y-4">
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
        </div> */}
      </section>
    </Modal>
  )
}

const GoogleDriveIntegrationModal = ({
  isOpen,
  onClose,
  type,
  isLoading,
}: {
  isOpen: boolean
  onClose: () => void
  type: 'custom' | 'system'
  isLoading: boolean
}) => {
  const [credentialsFile, setCredentialsFile] = useState<File | null>(null)
  const [oauthProcessing, setOauthProcessing] = useState(false)
  const { oauthState, oauthWindow, setOauthState, setOauthWindow, setOauthCompleted } = useOAuthStore()
  const queryClient = useQueryClient()
  
  const { mutate: getOAuthUrl } = useMutation({
    mutationFn: integrationApi.csc.getGoogleOAuthUrl,
    onSuccess: (response) => {
      // Store OAuth state
      setOauthState({
        isSystem: type === 'system',
        credentialsData: type === 'custom' ? credentialsFile : undefined,
        timestamp: Date.now(),
        integrationType: integrationTypeEnum.GOOGLE_DRIVE,
      })
      
      // Open OAuth window
      const popup = window.open(response.authUrl, 'oauth', 'width=500,height=600,scrollbars=yes,resizable=yes')
      setOauthWindow(popup)
    },
  })

  // Mutation to handle OAuth callback
  const { mutate: handleOAuthCallback, isPending: isHandlingOAuth } = useMutation({
    mutationFn: integrationApi.csc.handleGoogleOAuthCallback,
    onSuccess: (data) => {
      // Refresh integrations list
      queryClient.invalidateQueries({ queryKey: ['integrations'] })
      
      // Show success and close modal
      alert('Google Drive integration created successfully!')
      onClose()
      
      // Clean up
      setOauthState(null)
      setOauthWindow(null)
      setOauthCompleted(null)
      setOauthProcessing(false)
    },
    onError: (error: any) => {
      alert(`OAuth error: ${error?.response?.data?.error || 'OAuth callback failed'}`)
      
      // Clean up
      setOauthState(null)
      setOauthWindow(null)
      setOauthCompleted(null)
      setOauthProcessing(false)
    }
  })

  // Listen for OAuth completion
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_CALLBACK') {
        // Prevent duplicate processing
        if (oauthProcessing || !oauthState) {
          return
        }
        
        setOauthProcessing(true)
        
        // Combine OAuth callback data with stored state
        handleOAuthCallback({
          code: event.data.data.code,
          state: event.data.data.state,
          isSystem: oauthState.isSystem,
          credentialsFile: oauthState.credentialsData,
        })
      } else if (event.data?.type === 'OAUTH_ERROR') {
        if (oauthProcessing) {
          return
        }
        
        alert(`OAuth error: ${event.data.error}`)
        
        // Clean up
        setOauthState(null)
        setOauthWindow(null)
        setOauthCompleted(null)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [oauthState, handleOAuthCallback, oauthProcessing, setOauthState, setOauthWindow, setOauthCompleted])

  // Check if OAuth window is closed
  useEffect(() => {
    if (oauthWindow) {
      const checkClosed = setInterval(() => {
        if (oauthWindow.closed) {
          // Window was closed without completion
          setOauthWindow(null)
          setOauthState(null)
          clearInterval(checkClosed)
        }
      }, 1000)

      return () => clearInterval(checkClosed)
    }
  }, [oauthWindow, setOauthWindow, setOauthState])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (type === 'custom') {
      alert('Custom Google Drive integration not implemented yet')
      return
    }
    
    // if (type === 'custom' && !credentialsFile) {
    //   alert('Please upload your Google credentials JSON file')
    //   return
    // }
    
    getOAuthUrl({
      isSystem: type === 'system',
      // credentialsFile: type === 'custom' ? credentialsFile : undefined,
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <section className="p-6">
        <h2 className="mb-4 text-2xl font-bold">
          {type === 'system' ? 'System' : 'Custom'} Google Drive Integration
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {type === 'custom' ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-lg">Custom Google Drive integration not implemented yet</p>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-700">You will be redirected to Google to authorize access to your Google Drive.</p>
              {oauthWindow && (
                <p className="text-sm text-blue-600 mt-2">
                  OAuth window opened. Please complete authorization in the popup window.
                </p>
              )}
            </div>
          )}
          
          {/* {type === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Google Credentials JSON
              </label>
              <input
                type="file"
                accept=".json"
                onChange={(e) => setCredentialsFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                required
              />
            </div>
          )} */}
          
          <div className="flex space-x-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            {type === 'system' && (
              <Button type="submit" variant="primary" isLoading={isLoading || !!oauthWindow || isHandlingOAuth}>
                {oauthWindow ? 'Waiting for Authorization...' : 'Connect to Google Drive'}
              </Button>
            )}
          </div>
        </form>
      </section>
    </Modal>
  )
}

const WebhookIntegrationModal = ({
  isOpen,
  onClose,
  isLoading,
}: {
  isOpen: boolean
  onClose: () => void
  isLoading: boolean
}) => {
  const { form, createFormFieldChangeHandler } = useTnForm<TWebHookForm>()
  const [createdWebhook, setCreatedWebhook] = useState<{
    webhookUrl?: string
    webhookSecret?: string
    id?: string
  } | null>(null)
  const queryClient = useQueryClient()

  const { mutate: createIntegration, isPending } = useMutation({
    mutationFn: integrationApi.create,
    onSuccess: (data) => {
      // Invalidate integrations queries
      queryClient.invalidateQueries({ queryKey: ['integrations'] })
      
      // Store webhook data - assuming the API returns webhookUrl and webhookSecret
      setCreatedWebhook({
        webhookUrl: (data as any).webhookUrl,
        webhookSecret: (data as any).webhookSecret,
        id: data.id,
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form._name.value?.trim()) {
      alert('Please enter a name for the webhook')
      return
    }
    if (!form.webhookUrl.value?.trim()) {
      alert('Please enter a webhook URL')
      return
    }

    createIntegration({
      name: form._name.value,
      integrationType: integrationTypeEnum.WEBHOOK,
      isSystemProvided: false,
      webhookUrl: form.webhookUrl.value,
    })
  }

  const handleClose = () => {
    setCreatedWebhook(null)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <section className="p-6">
        <h2 className="mb-4 text-2xl font-bold">Create Webhook Integration</h2>
        
        {!createdWebhook ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="text"
              name={form.field._name.name}
              label="Integration Name"
              placeholder="My Webhook Integration"
              value={form._name.value || ''}
              onChange={(e) => createFormFieldChangeHandler(form._name)(e.target.value)}
              required
            />
            
            <Input
              type="url"
              name={form.field.webhookUrl.name}
              label="Webhook URL"
              placeholder="https://example.com/webhook"
              value={form.webhookUrl.value || ''}
              onChange={(e) => createFormFieldChangeHandler(form.webhookUrl)(e.target.value)}
              required
            />

            <div className="flex space-x-3">
              <Button type="button" variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isPending}>
                Create Webhook
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-50 border border-green-200 p-4">
              <h3 className="font-medium text-green-800 mb-2">✅ Webhook Created Successfully!</h3>
              <p className="text-sm text-green-600">Your webhook integration has been created.</p>
            </div>

            <div className="space-y-3">
              <div>
                <Input
                  label="Webhook URL"
                  type="text"
                  disabled
                  value={createdWebhook.webhookUrl || form.webhookUrl.value || ''}
                  className="bg-gray-50 border-gray-200 font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">This is your configured webhook URL</p>
              </div>

              {createdWebhook.webhookSecret && (
                <div>
                  <div className="flex gap-2">
                    <Input
                      label="Webhook Secret"
                      type="text"
                      disabled
                      value={createdWebhook.webhookSecret}
                      className="bg-gray-50 flex-1 border-gray-200 font-mono text-sm"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        navigator.clipboard.writeText(createdWebhook.webhookSecret || '')
                      }}
                      className="mt-6"
                    >
                      Copy Secret
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Use this secret to validate incoming webhooks. Keep this secure!
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button onClick={handleClose}>Done</Button>
            </div>
          </div>
        )}
      </section>
    </Modal>
  )
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
          <div className="flex">
            {integration.integrationType === integrationTypeEnum.GOOGLE_DRIVE && (
              <>
              {integration.hasOauthCredentials? <>Connected</>: <>Not Connected</>}
              </>
            )}
          </div>
          <Button
            variant="secondary"
            onClick={() => deleteIntegration.mutate(integration.id)}
            disabled={deleteIntegration.isPending}
          >
            {deleteIntegration.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>
      
      {/* Webhook details */}
      {integration.integrationType === integrationTypeEnum.WEBHOOK && integration.webhookUrl && (
        <div className="mt-4 space-y-3 border-t border-gray-200 pt-4">
          <div>
            <div className="flex gap-2">
              <input
                type="text"
                disabled
                value={integration.webhookUrl}
                className="bg-gray-50 flex-1 border border-gray-200 rounded-md px-3 py-2 font-mono text-sm"
                placeholder="Webhook URL"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  navigator.clipboard.writeText(integration.webhookUrl || '')
                }}
              >
                Copy URL
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Webhook endpoint URL</p>
          </div>

          {integration.webhookSecret && (
            <div>
              <div className="flex gap-2">
                <PasswordInput
                  label="Webhook Secret"
                  disabled
                  value={integration.webhookSecret}
                  className="bg-gray-50 flex-1 border-gray-200 font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(integration.webhookSecret || '')
                  }}
                  className="mt-6"
                >
                  Copy Secret
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Use this secret to validate webhook requests. Keep this secure!
              </p>
            </div>
          )}
        </div>
      )}
      
      {children}
    </div>
  )
}

export const Integrations = () => {
  const queryClient = useQueryClient()
  const [showCustomS3Modal, setShowCustomS3Modal] = useState(false)
  const [showGoogleDriveModal, setShowGoogleDriveModal] = useState(false)
  const [googleDriveModalType, setGoogleDriveModalType] = useState<'custom' | 'system'>('system')
  const [showWebhookModal, setShowWebhookModal] = useState(false)

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
  const allIntegrationTypes: integrationListItems[] = [
    {
      type: integrationTypeEnum.GOOGLE_DRIVE,
      title: 'Google Drive',
      description: 'Access and manage files in Google Drive',
      systemOption: () => {
        setGoogleDriveModalType('system')
        setShowGoogleDriveModal(true)
      },
      customOption: () => {
        setGoogleDriveModalType('custom')
        setShowGoogleDriveModal(true)
      },
      icon: <GoogleDriveIcon />,
      formClass: CustomS3Form,
      children: (
        <GoogleDriveIntegrationModal
          isOpen={showGoogleDriveModal}
          onClose={() => setShowGoogleDriveModal(false)}
          type={googleDriveModalType}
          isLoading={isCreatingIntegration}
        />
      ),
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
      customOption: () => setShowWebhookModal(true),
      icon: <WebhookIcon />,
      formClass: WebHookForm,
      children: (
        <WebhookIntegrationModal
          isOpen={showWebhookModal}
          onClose={() => setShowWebhookModal(false)}
          isLoading={isCreatingIntegration}
        />
      ),
    },
  ]

  // Filter out integration types that already exist (for Google Drive and S3 only)
  const existingTypes = new Set(integrations.map(integration => integration.integrationType))
  const integrationTypes = allIntegrationTypes.filter(integrationType => {
    // Always show webhooks (users can have multiple)
    if (integrationType.type === integrationTypeEnum.WEBHOOK) {
      return true
    }
    // Hide Google Drive and S3 if they already exist
    return !existingTypes.has(integrationType.type)
  })

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
