import { FormProvider, useTnForm } from '@thinknimble/tn-forms-react'
import {
  AgentProject,
  AgentProjectForm,
  TAgentProjectForm,
  agentProjectApi,
  agentProjectQueries,
} from 'src/services/agent-project'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState, useEffect } from 'react'
import { Pagination } from '@thinknimble/tn-models'

import { Button } from 'src/components/button'
import { Input } from 'src/components/input'
import { ErrorsList } from 'src/components/errors'
import { PromptBuilder } from 'src/components/prompt-builder'
import {
  AgentInstanceForm,
  TAgentInstanceForm,
  agentInstanceApi,
  agentTypeLabelMap,
  agentTypeEnum,
  providerLabelMap,
  providerKeysEnum,
} from 'src/services/agent-instance'
import { AgentInstance } from 'src/services/agent-instance/models'
import { SelectOption } from 'src/services/base-model'
import { useNavigate, useParams, Link } from 'react-router-dom'
import Select from 'react-dropdown-select'
import { agentInstanceQueries } from 'src/services/agent-instance'
import {
  CreatePromptTemplate,
  PromptTemplate,
  promptTemplateApi,
} from 'src/services/prompt-template'

const ProjectDetailsSection = ({
  agentProject,
  isEditing,
  onEdit,
}: {
  agentProject: AgentProject
  isEditing: boolean
  onEdit: () => void
}) => (
  <div className="rounded-lg border border-primary-200 bg-white p-6 shadow-sm">
    <div className="flex items-start justify-between">
      <div>
        <h1 className="text-3xl font-bold text-primary-600">{agentProject.title}</h1>
        <p className="mt-2 text-primary-400">{agentProject.description}</p>
      </div>
      <div className="flex space-x-3">
        <Link
          to={`/projects/${agentProject.id}/settings`}
          className="hover:bg-primary-50 inline-flex items-center rounded-md border border-primary-300 bg-white px-3 py-2 text-sm font-medium text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          Settings
        </Link>
        <Button onClick={onEdit} variant="secondary">
          Edit Project
        </Button>
      </div>
    </div>
  </div>
)

const CreateAgentProjectForm = ({
  onSuccess,
  onCancel,
  initialData,
  isEditing = false,
}: {
  onSuccess: (agentProject: AgentProject) => void
  onCancel?: () => void
  initialData?: AgentProject
  isEditing?: boolean
}) => {
  const { form, createFormFieldChangeHandler, overrideForm } = useTnForm<TAgentProjectForm>()

  useEffect(() => {
    if (initialData && isEditing) {
      const updatedForm = new AgentProjectForm() as TAgentProjectForm
      updatedForm.title.value = initialData.title
      updatedForm.description.value = initialData.description
      overrideForm(updatedForm)
    }
  }, [initialData, isEditing, overrideForm])

  const { mutate: create, isPending: isCreating } = useMutation({
    mutationFn: agentProjectApi.create,
    onSuccess(data) {
      onSuccess(data)
    },
  })

  const { mutate: update, isPending: isUpdating } = useMutation({
    mutationFn: agentProjectApi.update,
    onSuccess(data) {
      onSuccess(data)
    },
  })

  const isPending = isCreating || isUpdating

  return (
    <div className="rounded-lg border border-primary-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-primary-600">
          {isEditing ? 'Edit Project Details' : 'Create New Agent Project'}
        </h2>
        <p className="mt-2 text-sm text-primary-400">
          {isEditing ? 'Update your project information' : 'Set up your new AI agent project'}
        </p>
      </div>
      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault()
          if (form.isValid) {
            const formData = {
              title: form.title.value ?? '',
              description: form.description.value ?? '',
            }

            if (isEditing && initialData) {
              update({ ...formData, id: initialData.id })
            } else {
              create(formData)
            }
          }
        }}
      >
        <div className="grid gap-6 md:grid-cols-1">
          <div>
            <Input
              label={form.title.label}
              placeholder={form.title.placeholder}
              value={form.title.value ?? ''}
              onChange={(e) => createFormFieldChangeHandler(form.title)(e.target.value)}
              className="bg-primary-50 border-primary-200 focus:border-primary-500"
            />
            <ErrorsList errors={form.title.errors} />
          </div>
          <div>
            <Input
              label={form.description.label}
              placeholder={form.description.placeholder}
              value={form.description.value ?? ''}
              onChange={(e) => createFormFieldChangeHandler(form.description)(e.target.value)}
              className="bg-primary-50 border-primary-200 focus:border-primary-500"
            />
            <ErrorsList errors={form.description.errors} />
          </div>
        </div>
        <div className="flex justify-end space-x-3">
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
            {isPending ? 'Saving...' : isEditing ? 'Update Project' : 'Create Project'}
          </Button>
        </div>
      </form>
    </div>
  )
}

const AgentInstanceCard = ({
  instance,
  onEdit,
  onDelete,
  onChat,
  onTasks,
}: {
  instance: AgentInstance
  onEdit: (instance: AgentInstance) => void
  onDelete: (id: string) => void
  onChat: (instance: AgentInstance) => void
  onTasks: (instance: AgentInstance) => void
}) => (
  <div className="rounded-lg border border-primary-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <h3 className="font-semibold text-primary-600">{instance.friendlyName}</h3>
        <div className="mt-2 space-y-1 text-sm text-primary-400">
          <p>
            <span className="font-medium">Provider:</span> {providerLabelMap[instance.provider]}
          </p>
          <p>
            <span className="font-medium">Model:</span> {instance.modelName}
          </p>
          <p>
            <span className="font-medium">Type:</span> {agentTypeLabelMap[instance.agentType]}
          </p>
          {instance.targetUrl && (
            <p>
              <span className="font-medium">URL:</span> {instance.targetUrl}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-col space-y-2">
        {instance.agentType === agentTypeEnum.CHAT && (
          <Button
            onClick={() => onChat(instance)}
            className="bg-accent-600 px-3 py-1 text-xs text-white hover:bg-accent-700"
          >
            💬 Chat
          </Button>
        )}
        {instance.agentType === agentTypeEnum.ONE_SHOT && (
          <Button
            onClick={() => onTasks(instance)}
            className="bg-accent-600 px-3 py-1 text-xs text-white hover:bg-accent-700"
          >
            ⏰ Tasks
          </Button>
        )}
        <div className="flex space-x-2">
          <Button
            onClick={() => onEdit(instance)}
            variant="ghost"
            className="hover:bg-primary-50 border-primary-300 px-2 py-1 text-xs text-primary-600"
          >
            Edit
          </Button>
          <Button
            onClick={() => onDelete(instance.id)}
            variant="ghost"
            className="border-error px-2 py-1 text-xs text-error hover:bg-red-50"
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  </div>
)

const AgentInstanceInner = ({
  agentProject,
  onInstanceSaved,
  onCancel,
  editingInstance,
}: {
  agentProject: AgentProject
  onInstanceSaved: (instance: AgentInstance) => void
  onCancel: () => void
  editingInstance?: AgentInstance
}) => {
  const { form, createFormFieldChangeHandler, overrideForm } = useTnForm<TAgentInstanceForm>()
  const isEditing = Boolean(editingInstance)
  const [promptTemplateContent, setPromptTemplateContent] = useState<string | null>(null)
  const [showApiKeyValue, setShowApiKeyValue] = useState(false)
  const [apiKeyJustCreated, setApiKeyJustCreated] = useState<string | null>(null)
  const queryClient = useQueryClient()
  useEffect(() => {
    if (editingInstance) {
      const updatedForm = new AgentInstanceForm() as TAgentInstanceForm
      updatedForm.friendlyName.value = editingInstance.friendlyName
      updatedForm.provider.value = {
        label: providerLabelMap[editingInstance.provider],
        value: editingInstance.provider,
      }
      updatedForm.modelName.value = editingInstance.modelName
      updatedForm.apiKey.value = '' // Don't prefill API key for security
      updatedForm.targetUrl.value = editingInstance.targetUrl || ''
      updatedForm.agentType.value = {
        label: agentTypeLabelMap[editingInstance.agentType],
        value: editingInstance.agentType,
      }
      overrideForm(updatedForm)
      setPromptTemplateContent(editingInstance.promptTemplate?.content || null)
    }
  }, [editingInstance, overrideForm])

  const { mutate: createPrompt, isPending: isCreatingPrompt } = useMutation({
    mutationFn: (data: CreatePromptTemplate) => promptTemplateApi.create(data),
    onSuccess: (newPrompt) => {
      queryClient.invalidateQueries({ queryKey: ['agent-instances'] })
    },
  })

  const { mutate: updatePrompt, isPending: isUpdatingPrompt } = useMutation({
    mutationFn: (data: PromptTemplate) => promptTemplateApi.update(data),
    onSuccess: (newPrompt) => {
      queryClient.invalidateQueries({ queryKey: ['agent-instances'] })
    },
  })

  const { mutate: create, isPending: isCreating } = useMutation({
    mutationFn: (data: any) => agentInstanceApi.create(data),
    onSuccess: (newInstance) => {
      // Show the API key for a brief moment after creation if it was provided
      if (form.apiKey.value && form.apiKey.value.trim()) {
        setApiKeyJustCreated(form.apiKey.value)
        setShowApiKeyValue(true)
        setTimeout(() => {
          setShowApiKeyValue(false)
          setApiKeyJustCreated(null)
          onInstanceSaved(newInstance)
          overrideForm(new AgentInstanceForm() as TAgentInstanceForm)
        }, 10000) // Show for 10 seconds
      } else {
        onInstanceSaved(newInstance)
        overrideForm(new AgentInstanceForm() as TAgentInstanceForm)
      }

      if (editingInstance?.promptTemplate?.id) {
        updatePrompt({
          id: editingInstance.promptTemplate.id,
          name: editingInstance.promptTemplate.name,
          content: promptTemplateContent ?? '',
          agentInstance: newInstance.id,
        })
      } else {
        createPrompt({
          name: form.friendlyName.value ?? 'Default Prompt',
          content: promptTemplateContent ?? '',
          agentInstance: newInstance.id,
        })
      }
    },
  })

  const { mutate: update, isPending: isUpdating } = useMutation({
    mutationFn: (data: any) => agentInstanceApi.update(data),
    onSuccess: (updatedInstance) => {
      onInstanceSaved(updatedInstance)
      if (editingInstance?.promptTemplate?.id) {
        updatePrompt({
          id: editingInstance.promptTemplate.id,
          name: editingInstance.promptTemplate.name,
          content: promptTemplateContent ?? '',
          agentInstance: updatedInstance.id,
        })
      } else {
        createPrompt({
          name: form.friendlyName.value ?? 'Default Prompt',
          content: promptTemplateContent ?? '',
          agentInstance: updatedInstance.id,
        })
      }
    },
  })

  const isPending = isCreating || isUpdating || isCreatingPrompt || isUpdatingPrompt

  const modelOptions = useMemo(() => {
    if (!form.provider.value) return []
    switch (form.provider.value.value) {
      case providerKeysEnum.OPENAI:
        return [
          { label: 'gpt-4', value: 'gpt-4' },
          { label: 'gpt-3.5-turbo', value: 'gpt-3.5-turbo' },
        ]
      case providerKeysEnum.ANTHROPIC:
        return [
          { label: 'Sonnet 3.7', value: 'claude-3-7-sonnet-20250219' },
          { label: 'Sonnet 4.2', value: 'claude-sonnet-4-20250514' },
          { label: 'Sonnet 4.5', value: 'claude-sonnet-4-5-20250929' },
          { label: 'Opus 4.1', value: 'claude-opus-4-1-20250805' },
          { label: 'Opus 4.2', value: 'claude-opus-4-20250514' },
        ]
      case providerKeysEnum.GEMINI:
        return [
          { label: 'gemini-1.5', value: 'gemini-1.5' },
          { label: 'gemini-1.5-pro', value: 'gemini-1.5-pro' },
          { label: 'gemini-2.0-flash', value: 'gemini-2.0-flash' },
        ]
      case providerKeysEnum.OLLAMA:
        return [
          { label: 'llama2', value: 'llama2' },
          { label: 'llama3', value: 'llama3' },
          { label: 'qwen3:30b', value: 'qwen3:30b' },
        ]

      default:
        return []
    }
  }, [form.provider.value])

  const providerOptions: SelectOption[] = useMemo(() => {
    return Object.entries(providerLabelMap).map(([value, label]) => ({ label, value }))
  }, [])

  const agentTypeOptions: SelectOption[] = useMemo(() => {
    return Object.entries(agentTypeLabelMap).map(([value, label]) => ({ label, value }))
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (form.isValid) {
      const formValue = form.value
      const data: any = {
        friendlyName: formValue.friendlyName,
        modelName: formValue.modelName,
        targetUrl: formValue.targetUrl,
        projects: [agentProject.id],
        provider: formValue.provider?.value,
        agentType: formValue.agentType?.value,
      }

      // Only include API key if it was provided
      if (formValue.apiKey && formValue.apiKey.trim()) {
        data.apiKey = formValue.apiKey
      }

      if (isEditing && editingInstance) {
        update({ ...data, id: editingInstance.id })
      } else {
        create(data)
      }
    }
  }

  if (apiKeyJustCreated && showApiKeyValue) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6 shadow-sm">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-green-800">Agent Created Successfully!</h3>
          <p className="mt-1 text-sm text-green-600">
            This is the only time you&apos;ll see the full API key. Please copy it now.
          </p>
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-green-700">
            API Key (copy this now):
          </label>
          <div className="rounded border border-green-300 bg-white p-3 font-mono text-sm">
            {apiKeyJustCreated}
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <Button
            onClick={() => {
              setShowApiKeyValue(false)
              setApiKeyJustCreated(null)
              onInstanceSaved(form.value as any)
              overrideForm(new AgentInstanceForm() as TAgentInstanceForm)
            }}
            className="bg-green-600 hover:bg-green-700"
          >
            I&apos;ve Copied It
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-primary-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-primary-600">
          {isEditing ? 'Edit Agent Instance' : 'Add New Agent Instance'}
        </h3>
        <p className="mt-2 text-sm text-primary-400">
          {isEditing
            ? 'Update your agent configuration'
            : 'Configure a new AI agent for your project'}
        </p>
      </div>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <Input
              label={form.friendlyName.label}
              placeholder={form.friendlyName.placeholder}
              value={form.friendlyName.value}
              onChange={(e) => createFormFieldChangeHandler(form.friendlyName)(e.target.value)}
              className="bg-primary-50 border-primary-200 focus:border-primary-500"
            />
            <ErrorsList errors={form.friendlyName.errors} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-primary-600">Provider</label>
            <Select
              options={providerOptions}
              values={form.provider.value ? [form.provider.value] : []}
              onChange={(values) =>
                createFormFieldChangeHandler(form.provider)(values ? values[0] : null)
              }
              placeholder="Select Provider"
              className="bg-primary-50 border-primary-200"
            />
            <ErrorsList errors={form.provider.errors} />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-primary-600">Model</label>
            <Select
              options={modelOptions}
              values={
                form.modelName.value
                  ? [{ label: form.modelName.value, value: form.modelName.value }]
                  : []
              }
              onChange={(values) =>
                createFormFieldChangeHandler(form.modelName)(
                  values.length > 0 ? values[0].value : '',
                )
              }
              placeholder="Select Model"
              className="bg-primary-50 border-primary-200"
            />
            <ErrorsList errors={form.modelName.errors} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-primary-600">Agent Type</label>
            <Select
              options={agentTypeOptions}
              values={form.agentType.value ? [form.agentType.value] : []}
              onChange={(values) =>
                createFormFieldChangeHandler(form.agentType)(values ? values[0] : null)
              }
              placeholder="Select Agent Type"
              className="bg-primary-50 border-primary-200"
            />
            <ErrorsList errors={form.agentType.errors} />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <Input
              label={isEditing ? 'API Key (leave empty to keep current)' : form.apiKey.label}
              placeholder={
                isEditing ? 'Enter new API key to replace current...' : form.apiKey.placeholder
              }
              value={form.apiKey.value ?? ''}
              onChange={(e) => createFormFieldChangeHandler(form.apiKey)(e.target.value)}
              type="password"
              className="bg-primary-50 border-primary-200 focus:border-primary-500"
            />
            <ErrorsList errors={form.apiKey.errors} />
            {isEditing && editingInstance?.maskedApiKey && (
              <p className="mt-1 text-xs text-gray-500">
                Current API key: {editingInstance.maskedApiKey}
              </p>
            )}
          </div>

          <div>
            <Input
              label={form.targetUrl.label}
              placeholder={form.targetUrl.placeholder}
              value={form.targetUrl.value}
              onChange={(e) => createFormFieldChangeHandler(form.targetUrl)(e.target.value)}
              className="bg-primary-50 border-primary-200 focus:border-primary-500"
            />
            <ErrorsList errors={form.targetUrl.errors} />
          </div>
        </div>

        <PromptBuilder
          value={promptTemplateContent ?? ''}
          onChange={setPromptTemplateContent}
          placeholder="Enter the system prompt for this agent..."
          projectId={agentProject.id}
          enableVariableBinding={true}
        />

        <div className="flex justify-end space-x-3 border-t border-primary-200 pt-4">
          <Button
            type="button"
            onClick={onCancel}
            variant="ghost"
            className="hover:bg-primary-50 border-primary-300 text-primary-600"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isPending || !form.isValid}
            className="bg-primary-600 hover:bg-primary-700"
          >
            {isPending ? 'Saving...' : isEditing ? 'Update Agent' : 'Create Agent'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export const CreateAgentProject = () => {
  const { id } = useParams<{ id: string }>()
  const [agentProject, setAgentProject] = useState<AgentProject | null>(null)
  const [instances, setInstances] = useState<AgentInstance[]>([])
  const [editingProject, setEditingProject] = useState(false)
  const [editingInstance, setEditingInstance] = useState<AgentInstance | null>(null)
  const [showInstanceForm, setShowInstanceForm] = useState(false)
  const navigate = useNavigate()
  const isEditing = Boolean(id)

  const { data: existingProject, isLoading: loadingProject } = useQuery(
    agentProjectQueries.retrieve(id!),
  )

  const { data: projectInstances, isLoading: loadingInstances } = useQuery(
    agentInstanceQueries.list(new Pagination(), { projects: [id ?? ''] }),
  )

  useEffect(() => {
    if (existingProject) {
      setAgentProject(existingProject)
    }
  }, [existingProject])

  useEffect(() => {
    if (projectInstances?.results) {
      setInstances(projectInstances.results)
    }
  }, [projectInstances])

  const handleInstanceSaved = (instance: AgentInstance) => {
    if (editingInstance) {
      setInstances((prev) => prev.map((inst) => (inst.id === instance.id ? instance : inst)))
    } else {
      setInstances((prev) => [...prev, instance])
    }
    setShowInstanceForm(false)
    setEditingInstance(null)
  }

  const handleEditInstance = (instance: AgentInstance) => {
    setEditingInstance(instance)
    setShowInstanceForm(true)
  }

  const handleDeleteInstance = (instanceId: string) => {
    // TODO: Add delete mutation
    setInstances((prev) => prev.filter((inst) => inst.id !== instanceId))
  }

  const handleChatWithAgent = (instance: AgentInstance) => {
    navigate(`/chat/agent/${instance.id}`)
  }

  const handleTasksWithAgent = (instance: AgentInstance) => {
    navigate(`/tasks/agent/${instance.id}`)
  }

  const isLoading = loadingProject || loadingInstances

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent"></div>
              <p className="mt-4 text-primary-600">Loading project details...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8">
          <Button
            onClick={() => navigate('/dashboard')}
            variant="ghost"
            className="mb-4 border-primary-300 text-primary-600 hover:bg-primary-100"
          >
            ← Back to Dashboard
          </Button>
        </div>

        <div className="space-y-8">
          {/* Project Details Section */}
          {!agentProject || editingProject ? (
            <FormProvider formClass={AgentProjectForm}>
              <CreateAgentProjectForm
                onSuccess={(project) => {
                  setAgentProject(project)
                  setEditingProject(false)
                }}
                onCancel={agentProject ? () => setEditingProject(false) : undefined}
                initialData={agentProject || existingProject}
                isEditing={Boolean(agentProject) || isEditing}
              />
            </FormProvider>
          ) : (
            <ProjectDetailsSection
              agentProject={agentProject}
              isEditing={editingProject}
              onEdit={() => setEditingProject(true)}
            />
          )}

          {/* Agent Instances Section */}
          {agentProject && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-primary-600">Agent Instances</h2>
                  <p className="mt-1 text-sm text-primary-400">
                    Manage your AI agents and their configurations
                  </p>
                </div>
                {!showInstanceForm && (
                  <Button
                    onClick={() => setShowInstanceForm(true)}
                    className="bg-primary-600 hover:bg-primary-700"
                  >
                    + Add New Agent
                  </Button>
                )}
              </div>

              {/* Agent Instance Cards */}
              {instances.length > 0 && (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {instances.map((instance) => (
                    <AgentInstanceCard
                      key={instance.id}
                      instance={instance}
                      onEdit={handleEditInstance}
                      onDelete={handleDeleteInstance}
                      onChat={handleChatWithAgent}
                      onTasks={handleTasksWithAgent}
                    />
                  ))}
                </div>
              )}

              {instances.length === 0 && !showInstanceForm && (
                <div className="rounded-lg border-2 border-dashed border-primary-200 bg-white p-12 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
                    <span className="text-2xl text-primary-600">🤖</span>
                  </div>
                  <h3 className="mb-2 text-lg font-medium text-primary-600">No agents yet</h3>
                  <p className="mb-6 text-primary-400">Create your first AI agent to get started</p>
                  <Button
                    onClick={() => setShowInstanceForm(true)}
                    className="bg-primary-600 hover:bg-primary-700"
                  >
                    Create First Agent
                  </Button>
                </div>
              )}

              {/* Agent Instance Form */}
              {showInstanceForm && (
                <FormProvider formClass={AgentInstanceForm}>
                  <AgentInstanceInner
                    agentProject={agentProject}
                    onInstanceSaved={handleInstanceSaved}
                    onCancel={() => {
                      setShowInstanceForm(false)
                      setEditingInstance(null)
                    }}
                    editingInstance={editingInstance ?? undefined}
                  />
                </FormProvider>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
