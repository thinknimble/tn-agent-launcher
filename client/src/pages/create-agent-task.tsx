import { FormProvider, useTnForm } from '@thinknimble/tn-forms-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams, useParams } from 'react-router-dom'
import { useMemo, useState, useEffect } from 'react'
import { Pagination } from '@thinknimble/tn-models'
import Select from 'react-dropdown-select'

import { Button } from 'src/components/button'
import { Input } from 'src/components/input'
import { PasswordInput } from 'src/components/password-input'
import { ErrorsList } from 'src/components/errors'
import { InputSourceUploader } from 'src/components/input-source-uploader'
import { DocumentProcessingConfigModal } from 'src/components/document-processing-config'
import { VariableBinding, Variable } from 'src/components/variable-binding'
import { WebhookHelp } from 'src/components/webhook-help'
import {
  AgentTask,
  AgentTaskForm,
  TAgentTaskForm,
  agentTaskApi,
  agentTaskQueries,
  scheduleTypeLabelMap,
  scheduleTypeEnum,
  ScheduleTypeValues,
  InputSource,
  sourceTypeEnum,
} from 'src/services/agent-task'
import { AgentInstance, agentInstanceQueries, agentTypeEnum } from 'src/services/agent-instance'
import { SelectOption } from 'src/services/base-model'
import { environmentSecretQueries } from 'src/services/environment-secrets'

const CreateEditAgentTaskInner = ({
  onSuccess,
  onCancel,
  preselectedAgent,
  initialData,
  duplicateFrom,
  projectId,
  isEditing = false,
}: {
  onSuccess: (task: AgentTask) => void
  onCancel?: () => void
  preselectedAgent?: AgentInstance
  initialData?: AgentTask
  duplicateFrom?: AgentTask
  projectId?: string
  isEditing?: boolean
}) => {
  const { form, createFormFieldChangeHandler, overrideForm } = useTnForm<TAgentTaskForm>()
  const queryClient = useQueryClient()
  const [urlConfigModalOpen, setUrlConfigModalOpen] = useState(false)
  const [currentUrlIndex, setCurrentUrlIndex] = useState<number | null>(null)
  const [instructionVariables, setInstructionVariables] = useState<Record<string, any>>({})
  const [createdWebhookData, setCreatedWebhookData] = useState<{
    webhookUrl?: string
    webhookSecret?: string
  } | null>(null)

  const { data: agentInstances } = useQuery({
    ...agentInstanceQueries.list(new Pagination(), {
      projects: projectId ? [projectId] : [],
      agentType: agentTypeEnum.ONE_SHOT,
    }),
    enabled: !!projectId,
  })

  // Fetch environment secrets for the project
  const { data: secretsData } = useQuery({
    ...environmentSecretQueries.list({
      pagination: new Pagination({ page: 1, size: 100 }),
      filters: { project: projectId ?? '', search: '' },
    }),
    enabled: !!projectId,
  })

  // Transform environment secrets into variables for binding component
  const variables = useMemo<Variable[]>(() => {
    if (!secretsData?.results) return []

    return secretsData.results.map((secret) => ({
      label: secret.key,
      value: secret.key,
      description: secret.description || `Environment secret: ${secret.key}`,
      category: 'Environment Variables',
    }))
  }, [secretsData?.results])

  // Get all agent tasks for trigger selection filtered by current project
  const { data: agentTasks } = useQuery({
    ...agentTaskQueries.list({
      filters: { agentInstance__projects: projectId ? [projectId] : [] },
      pagination: new Pagination(),
    }),
    enabled: !!projectId,
  })

  const { mutate: create, isPending: isCreating } = useMutation({
    mutationFn: agentTaskApi.create,
    async onSuccess(data) {
      // Store webhook data if this is a webhook task
      if (data.webhookUrl && data.webhookSecret) {
        setCreatedWebhookData({
          webhookUrl: data.webhookUrl,
          webhookSecret: data.webhookSecret,
        })
      }

      // Invalidate all agent-tasks queries with prefix matching
      await queryClient.invalidateQueries({
        queryKey: ['agent-tasks'],
        exact: false,
      })
      onSuccess(data)
    },
  })

  const { mutate: update, isPending: isUpdating } = useMutation({
    mutationFn: agentTaskApi.update,
    async onSuccess(data) {
      // Store webhook data if this is a webhook task and we have new data
      if (data.webhookUrl && data.webhookSecret) {
        setCreatedWebhookData({
          webhookUrl: data.webhookUrl,
          webhookSecret: data.webhookSecret,
        })
      }

      // Invalidate all agent-tasks queries with prefix matching
      await queryClient.invalidateQueries({
        queryKey: ['agent-tasks'],
        exact: false,
      })
      onSuccess(data)
    },
  })

  const { mutate: regenerateWebhookSecret, isPending: isRegenerating } = useMutation({
    mutationFn: agentTaskApi.csc.regenerateWebhookSecret,
    async onSuccess(data) {
      // Update both initial data and created webhook data
      if (initialData) {
        // Update the initial data reference
        Object.assign(initialData, data)
      }
      setCreatedWebhookData({
        webhookUrl: (data as any).webhookUrl,
        webhookSecret: (data as any).webhookSecret,
      })

      // Invalidate queries
      await queryClient.invalidateQueries({
        queryKey: ['agent-tasks'],
        exact: false,
      })
    },
  })

  const isPending = isCreating || isUpdating

  const agentOptions: SelectOption[] = useMemo(() => {
    return (
      agentInstances?.results?.map((agent) => ({
        label: agent.friendlyName,
        value: agent.id,
      })) || []
    )
  }, [agentInstances])

  const scheduleTypeOptions: SelectOption[] = useMemo(() => {
    return Object.entries(scheduleTypeLabelMap).map(([value, label]) => ({ label, value }))
  }, [])

  const agentTaskOptions: SelectOption[] = useMemo(() => {
    return (
      agentTasks?.results
        ?.filter((task) => task.id !== initialData?.id) // Don't allow self-reference
        ?.map((task) => ({
          label: task.name,
          value: task.id,
        })) || []
    )
  }, [agentTasks, initialData?.id])

  // Pre-populate form for editing
  useEffect(() => {
    if (initialData && isEditing) {
      const updatedForm = new AgentTaskForm() as TAgentTaskForm
      updatedForm._name.value = initialData.name
      updatedForm.description.value = initialData.description || ''
      updatedForm.instruction.value = initialData.instruction
      updatedForm.inputSources.value = initialData.inputSources || []
      updatedForm.scheduledAt.value = initialData.scheduledAt || ''
      updatedForm.intervalMinutes.value = initialData.intervalMinutes
      updatedForm.webhookValidateSignature.value = initialData.webhookValidateSignature ?? true
      updatedForm.maxExecutions.value = initialData.maxExecutions

      // Set agent instance

      if (initialData.agentInstance) {
        updatedForm.agentInstance.value = {
          label: initialData.agentInstanceRef?.friendlyName || 'Agent',
          value: initialData.agentInstance,
        }
      }

      // Set schedule type
      const scheduleOption = scheduleTypeOptions.find(
        (opt) => opt.value === initialData.scheduleType,
      )
      if (scheduleOption) {
        updatedForm.scheduleType.value = scheduleOption
      }

      // Set triggered by task
      if (initialData.triggeredByTask) {
        updatedForm.triggeredByTask.value = {
          label: initialData.triggeredByTaskName || 'Agent Task',
          value: initialData.triggeredByTask,
        }
      }

      overrideForm(updatedForm)
    }
  }, [initialData, isEditing, agentOptions, scheduleTypeOptions, overrideForm])

  // Pre-populate form for duplication
  useEffect(() => {
    if (duplicateFrom && !isEditing && agentOptions.length > 0) {
      const updatedForm = new AgentTaskForm() as TAgentTaskForm
      updatedForm._name.value = `${duplicateFrom.name} (Copy)`
      updatedForm.description.value = duplicateFrom.description || ''
      updatedForm.instruction.value = duplicateFrom.instruction
      updatedForm.inputSources.value = duplicateFrom.inputSources || []
      updatedForm.scheduledAt.value = duplicateFrom.scheduledAt || ''
      updatedForm.intervalMinutes.value = duplicateFrom.intervalMinutes
      updatedForm.webhookValidateSignature.value = duplicateFrom.webhookValidateSignature ?? true
      updatedForm.maxExecutions.value = duplicateFrom.maxExecutions

      // Set agent instance
      const agentOption = agentOptions.find((opt) => opt.value === duplicateFrom.agentInstance)
      if (agentOption) {
        updatedForm.agentInstance.value = agentOption
      }

      // Set schedule type
      const scheduleOption = scheduleTypeOptions.find(
        (opt) => opt.value === duplicateFrom.scheduleType,
      )
      if (scheduleOption) {
        updatedForm.scheduleType.value = scheduleOption
      }

      // Set triggered by task
      if (duplicateFrom.triggeredByTask) {
        const triggerOption = agentTaskOptions.find(
          (opt) => opt.value === duplicateFrom.triggeredByTask,
        )
        if (triggerOption) {
          updatedForm.triggeredByTask.value = triggerOption
        }
      }

      overrideForm(updatedForm)
    }
  }, [duplicateFrom, agentOptions, scheduleTypeOptions, agentTaskOptions, overrideForm, isEditing])

  // Pre-select agent for new tasks (only if not duplicating)
  useEffect(() => {
    if (preselectedAgent && !isEditing && !duplicateFrom) {
      const selectedAgent = { label: preselectedAgent.friendlyName, value: preselectedAgent.id }

      if (selectedAgent) {
        const updatedForm = new AgentTaskForm() as TAgentTaskForm
        updatedForm.agentInstance.value = selectedAgent
        overrideForm(updatedForm)
      }
    }
  }, [preselectedAgent, overrideForm, isEditing, duplicateFrom])

  const { isScheduleTypeOnce, isScheduleTypeCustom, isScheduleTypeAgent, isScheduleTypeWebhook } =
    useMemo(() => {
      const scheduleValue = form.scheduleType.value?.value
      return {
        isScheduleTypeOnce: scheduleValue === scheduleTypeEnum.ONCE,
        isScheduleTypeCustom: scheduleValue === scheduleTypeEnum.CUSTOM_INTERVAL,
        isScheduleTypeAgent: scheduleValue === scheduleTypeEnum.AGENT,
        isScheduleTypeWebhook: scheduleValue === scheduleTypeEnum.WEBHOOK,
      }
    }, [form.scheduleType.value?.value])

  // Helper function to create InputSource object from URL
  const createInputSourceFromUrl = (url: string): InputSource => {
    const filename = url.split('/').pop() || 'unknown_file'
    return {
      url,
      sourceType: sourceTypeEnum.PUBLIC_URL,
      filename,
      skipPreprocessing: true, // Default to skip preprocessing for multimodal models
    }
  }

  const openUrlConfigModal = (index: number) => {
    setCurrentUrlIndex(index)
    setUrlConfigModalOpen(true)
  }

  const handleUrlConfigSave = (config: any) => {
    if (currentUrlIndex !== null) {
      const currentSources = form.inputSources.value || []
      const newSources = [...currentSources]
      newSources[currentUrlIndex] = {
        ...newSources[currentUrlIndex],
        skipPreprocessing: config.skipPreprocessing,
        preprocessImage: config.preprocessImage,
        isDocumentWithText: config.isDocumentWithText,
        replaceImagesWithDescriptions: config.replaceImagesWithDescriptions,
        containsImages: config.containsImages,
        extractImagesAsText: config.extractImagesAsText,
      }
      createFormFieldChangeHandler(form.inputSources)(newSources)
    }
    setCurrentUrlIndex(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (form.isValid) {
      const formValue = form.value
      const data = {
        name: formValue._name || '',
        description: formValue.description || '',
        agentInstance: formValue.agentInstance?.value || '',
        instruction: formValue.instruction || '',
        variables: instructionVariables,
        inputSources: (formValue.inputSources || []).filter((source) => source.url.trim() !== ''),
        scheduleType: (formValue.scheduleType?.value || '') as ScheduleTypeValues,
        scheduledAt: formValue.scheduledAt || undefined,
        intervalMinutes: formValue.intervalMinutes || undefined,
        triggeredByTask: formValue.triggeredByTask?.value || undefined,
        webhookValidateSignature: formValue.webhookValidateSignature ?? true,
        maxExecutions: formValue.maxExecutions || undefined,
      }

      if (isEditing && initialData) {
        update({ ...data, id: initialData.id })
      } else {
        create(data)
      }
    }
  }
  console.log(form.errors)

  return (
    <div className="rounded-lg border border-primary-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-primary-600">
          {isEditing
            ? 'Edit Agent Task'
            : duplicateFrom
              ? 'Duplicate Agent Task'
              : 'Create New Agent Task'}
        </h2>
        <p className="mt-2 text-sm text-primary-400">
          {isEditing
            ? 'Update your scheduled task configuration'
            : duplicateFrom
              ? `Creating a copy of &ldquo;${duplicateFrom.name}&rdquo;`
              : 'Schedule automated tasks for your one-shot agents'}
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <Input
              label={form._name.label}
              placeholder={form._name.placeholder}
              value={form._name.value}
              onChange={(e) => createFormFieldChangeHandler(form._name)(e.target.value)}
              className="bg-primary-50 border-primary-200 focus:border-primary-500"
            />
            <ErrorsList errors={form._name.errors} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-primary-600">
              Agent Instance
            </label>
            <Select
              options={agentOptions}
              values={form.agentInstance.value ? [form.agentInstance.value] : []}
              onChange={(values) =>
                createFormFieldChangeHandler(form.agentInstance)(values ? values[0] : null)
              }
              placeholder="Select an agent instance"
              className="bg-primary-50 border-primary-200"
              disabled={!!preselectedAgent || isEditing}
            />
            <ErrorsList errors={form.agentInstance.errors} />
          </div>
        </div>

        <div>
          <Input
            label={form.description.label}
            placeholder={form.description.placeholder}
            value={form.description.value}
            onChange={(e) => createFormFieldChangeHandler(form.description)(e.target.value)}
            className="bg-primary-50 border-primary-200 focus:border-primary-500"
          />
          <ErrorsList errors={form.description.errors} />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-primary-600">Instruction</label>
          <VariableBinding
            value={form.instruction.value || ''}
            onChange={(value) => {
              createFormFieldChangeHandler(form.instruction)(value)
              // Extract variables from the instruction content

              // setInstructionVariables()
            }}
            variables={variables}
            placeholder="Write the prompt/instruction for the agent..."
          >
            {({ value, onChange, onKeyDown, textareaRef }) => (
              <textarea
                ref={textareaRef}
                value={value}
                onChange={onChange}
                onKeyDown={onKeyDown}
                placeholder="Write the prompt/instruction for the agent..."
                className="bg-primary-50 resize-vertical min-h-[128px] w-full rounded-md border border-primary-200 p-3 font-mono text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
            )}
          </VariableBinding>
          <ErrorsList errors={form.instruction.errors} />
          {variables.length > 0 && (
            <p className="mt-1 text-xs text-gray-500">
              Type <code className="rounded bg-gray-100 px-1">{'{{'}</code> to insert environment
              variables ({variables.length} available)
            </p>
          )}
          {projectId && variables.length === 0 && (
            <p className="mt-1 text-xs text-gray-400">
              No environment variables available for this agent&apos;s project. You can add them in
              project settings.
            </p>
          )}
        </div>

        <div>
          <label className="mb-3 block text-sm font-medium text-primary-600">Input Sources</label>

          {/* File Upload Section */}
          <div className="mb-4">
            <InputSourceUploader
              onFilesSelected={(inputSources) => {
                const currentSources = form.inputSources.value || []
                createFormFieldChangeHandler(form.inputSources)([
                  ...currentSources,
                  ...inputSources,
                ])
              }}
              maxFiles={5}
              maxSize={50}
            />
          </div>

          {/* URL Input Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-primary-200"></div>
              <span className="px-2 text-xs text-primary-400">Or add URLs manually</span>
              <div className="h-px flex-1 bg-primary-200"></div>
            </div>

            <div className="space-y-2">
              {(form.inputSources.value || []).map((source, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="flex-1">
                    <Input
                      type="url"
                      placeholder="https://example.com/document.pdf"
                      value={source.url || ''}
                      onChange={(e) => {
                        const currentSources = form.inputSources.value || []
                        const newSources = [...currentSources]
                        if (e.target.value.trim()) {
                          newSources[index] = createInputSourceFromUrl(e.target.value.trim())
                        } else {
                          newSources[index] = {
                            ...source,
                            url: e.target.value,
                            filename: e.target.value || 'unknown_file', // Ensure filename is always present
                          }
                        }
                        createFormFieldChangeHandler(form.inputSources)(newSources)
                      }}
                      className="bg-primary-50 border-primary-200 focus:border-primary-500"
                    />
                    <div className="mt-1 flex gap-2">
                      <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">
                        {source.sourceType === sourceTypeEnum.OUR_S3 ? '📁' : '🌐'}
                        {source.sourceType === sourceTypeEnum.OUR_S3
                          ? 'Uploaded File'
                          : 'Public URL'}
                      </span>
                      {source.filename && (
                        <span className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-600">
                          📄 {source.filename}
                        </span>
                      )}
                      <span className="rounded bg-green-50 px-2 py-1 text-xs text-green-600">
                        {source.skipPreprocessing !== undefined ||
                        source.preprocessImage !== undefined ||
                        source.containsImages !== undefined ? (
                          <>
                            ✓ Configured
                            {source.skipPreprocessing && ' (Direct to agent)'}
                            {source.skipPreprocessing === false && ' (Preprocessing enabled)'}
                          </>
                        ) : (
                          '→ Will be sent directly to agent (default)'
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {source.sourceType === sourceTypeEnum.PUBLIC_URL && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => openUrlConfigModal(index)}
                        className="hover:bg-primary-50 text-primary-600 hover:text-primary-700"
                      >
                        Configure
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        const currentSources = form.inputSources.value || []
                        const newSources = currentSources.filter((_, i) => i !== index)
                        createFormFieldChangeHandler(form.inputSources)(newSources)

                        // Handle configuration modal state when removing URL
                        if (currentUrlIndex === index) {
                          setUrlConfigModalOpen(false)
                          setCurrentUrlIndex(null)
                        } else if (currentUrlIndex !== null && currentUrlIndex > index) {
                          setCurrentUrlIndex(currentUrlIndex - 1)
                        }
                      }}
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  const currentSources = form.inputSources.value || []
                  const newInputSource: InputSource = {
                    url: '',
                    sourceType: sourceTypeEnum.PUBLIC_URL,
                    filename: 'unknown_file', // Provide default filename
                    skipPreprocessing: true, // Default to skip preprocessing
                  }
                  createFormFieldChangeHandler(form.inputSources)([
                    ...currentSources,
                    newInputSource,
                  ])
                }}
                className="hover:bg-primary-50 text-primary-600 hover:text-primary-700"
              >
                Add URL
              </Button>
            </div>
          </div>

          <ErrorsList errors={form.inputSources.errors} />
          <p className="mt-2 text-xs text-primary-400">
            Upload files or add URLs to documents, images, or other resources for the agent to
            process
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-primary-600">Schedule Type</label>
            <Select
              options={scheduleTypeOptions}
              values={form.scheduleType.value ? [form.scheduleType.value] : []}
              onChange={(values) =>
                createFormFieldChangeHandler(form.scheduleType)(values ? values[0] : null)
              }
              placeholder="Select schedule type"
              className="bg-primary-50 border-primary-200"
            />
            <ErrorsList errors={form.scheduleType.errors} />
          </div>

          {isScheduleTypeOnce && (
            <div>
              <Input
                label="Scheduled At"
                type="datetime-local"
                value={form.scheduledAt.value}
                onChange={(e) => createFormFieldChangeHandler(form.scheduledAt)(e.target.value)}
                className="bg-primary-50 border-primary-200 focus:border-primary-500"
              />
              <ErrorsList errors={form.scheduledAt.errors} />
            </div>
          )}

          {isScheduleTypeCustom && (
            <div>
              <Input
                label="Interval (Minutes)"
                type="number"
                placeholder="e.g., 60 for hourly"
                value={form.intervalMinutes.value?.toString() || ''}
                onChange={(e) =>
                  createFormFieldChangeHandler(form.intervalMinutes)(
                    e.target.value ? parseInt(e.target.value) : null,
                  )
                }
                className="bg-primary-50 border-primary-200 focus:border-primary-500"
              />
              <ErrorsList errors={form.intervalMinutes.errors} />
            </div>
          )}

          {isScheduleTypeAgent && (
            <div>
              <label className="mb-2 block text-sm font-medium text-primary-600">
                Triggered By Task
              </label>
              <Select
                options={agentTaskOptions}
                values={form.triggeredByTask.value ? [form.triggeredByTask.value] : []}
                onChange={(values) =>
                  createFormFieldChangeHandler(form.triggeredByTask)(values ? values[0] : null)
                }
                placeholder="Select task that will trigger this task"
                className="bg-primary-50 border-primary-200"
              />
              <ErrorsList errors={form.triggeredByTask.errors} />
              <p className="mt-1 text-xs text-primary-400">
                This task will be executed when the selected task completes successfully
              </p>
            </div>
          )}

          {isScheduleTypeWebhook && (
            <div className="col-span-2 space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="webhookValidateSignature"
                  checked={form.webhookValidateSignature.value}
                  onChange={(e) =>
                    createFormFieldChangeHandler(form.webhookValidateSignature)(e.target.checked)
                  }
                  className="h-4 w-4 rounded border-primary-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="webhookValidateSignature" className="text-sm text-primary-600">
                  Validate webhook signature (recommended for security)
                </label>
              </div>

              {(initialData?.webhookUrl || createdWebhookData?.webhookUrl) && (
                <div className="space-y-3">
                  <div>
                    <div className="flex gap-2">
                      <Input
                        label="Webhook URL"
                        type="text"
                        disabled
                        value={createdWebhookData?.webhookUrl || initialData?.webhookUrl || ''}
                        className="bg-primary-50 flex-1 border-primary-200 font-mono text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            createdWebhookData?.webhookUrl || initialData?.webhookUrl || '',
                          )
                        }}
                        className="mt-6 rounded-md bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  {form.webhookValidateSignature.value &&
                    (initialData?.webhookSecret || createdWebhookData?.webhookSecret) && (
                      <div>
                        <div className="flex items-center justify-between">
                          {initialData?.id && (
                            <button
                              type="button"
                              onClick={() => regenerateWebhookSecret(initialData.id)}
                              disabled={isRegenerating}
                              className="mb-2 rounded-md bg-yellow-600 px-3 py-1 text-xs text-white hover:bg-yellow-700 disabled:opacity-50"
                            >
                              {isRegenerating ? 'Regenerating...' : 'Regenerate Secret'}
                            </button>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <PasswordInput
                            label="Webhook Secret"
                            disabled={true}
                            value={
                              createdWebhookData?.webhookSecret || initialData?.webhookSecret || ''
                            }
                            className="bg-primary-50 flex-1 border-primary-200 font-mono text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(
                                createdWebhookData?.webhookSecret ||
                                  initialData?.webhookSecret ||
                                  '',
                              )
                            }}
                            className="mt-6 rounded-md bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700"
                          >
                            Copy
                          </button>
                        </div>
                        {form.webhookValidateSignature.value && (
                          <p className="mt-1 text-xs text-primary-400">
                            Use this secret to sign your webhook requests. Keep this secure!
                          </p>
                        )}
                      </div>
                    )}
                </div>
              )}

              {!initialData && !createdWebhookData && (
                <p className="text-sm text-primary-500">
                  Webhook URL and secret will be generated after creating the task.
                </p>
              )}

              <WebhookHelp />
            </div>
          )}
        </div>

        <div>
          <Input
            label="Max Executions (Optional)"
            type="number"
            placeholder="Leave blank for unlimited"
            value={form.maxExecutions.value?.toString() || ''}
            onChange={(e) =>
              createFormFieldChangeHandler(form.maxExecutions)(
                e.target.value ? parseInt(e.target.value) : null,
              )
            }
            className="bg-primary-50 border-primary-200 focus:border-primary-500"
          />
          <ErrorsList errors={form.maxExecutions.errors} />
          <p className="mt-1 text-xs text-primary-400">
            Maximum number of times this task should execute
          </p>
        </div>

        <div className="flex justify-end space-x-3 border-t border-primary-200 pt-4">
          {onCancel && (
            <Button
              type="button"
              onClick={onCancel}
              variant="ghost"
              className="hover:bg-primary-50 border-primary-300 text-primary-600"
            >
              Cancel
            </Button>
          )}

          <Button
            type="submit"
            disabled={isPending || !form.isValid}
            className="bg-primary-600 hover:bg-primary-700"
          >
            {isPending ? 'Saving...' : isEditing ? 'Update Task' : 'Create Task'}
          </Button>
        </div>
      </form>

      {/* URL Processing Configuration Modal */}
      {currentUrlIndex !== null && (
        <DocumentProcessingConfigModal
          isOpen={urlConfigModalOpen}
          onClose={() => {
            setUrlConfigModalOpen(false)
            setCurrentUrlIndex(null)
          }}
          onConfirm={handleUrlConfigSave}
          filename={form.inputSources.value?.[currentUrlIndex]?.filename || 'URL'}
          contentType={undefined} // We don't know content type for URLs until download
        />
      )}
    </div>
  )
}

export const CreateAgentTask = ({
  task,
  agent,
  duplicateFrom,
  projectId,
  onSuccess,
  onCancel,
}: {
  task?: AgentTask
  agent?: AgentInstance
  duplicateFrom?: AgentTask
  projectId?: string
  onSuccess?: () => void
  onCancel?: () => void
}) => {
  const isEditing = useMemo(() => !!task, [task])

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <FormProvider formClass={AgentTaskForm}>
          <CreateEditAgentTaskInner
            onSuccess={() => {
              onSuccess?.()
            }}
            onCancel={() => {
              onCancel?.()
            }}
            preselectedAgent={agent || undefined}
            initialData={task}
            duplicateFrom={duplicateFrom}
            projectId={projectId}
            isEditing={isEditing}
          />
        </FormProvider>
      </div>
    </div>
  )
}
