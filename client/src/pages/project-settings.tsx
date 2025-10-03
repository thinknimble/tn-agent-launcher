import { FormProvider, useTnForm } from '@thinknimble/tn-forms-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { Pagination } from '@thinknimble/tn-models'
import { useNavigate, useParams } from 'react-router-dom'

import { Button } from 'src/components/button'
import { Input } from 'src/components/input'
import { ErrorsList } from 'src/components/errors'
import { Textarea } from 'src/components/textarea'
import { AgentProject, agentProjectQueries } from 'src/services/agent-project'
import {
  ProjectEnvironmentSecret,
  EnvironmentSecretForm,
  TEnvironmentSecretForm,
  EnvironmentSecretFormInputs,
  environmentSecretApi,
  environmentSecretQueries,
} from 'src/services/environment-secrets'

const EnvironmentSecretCard = ({
  secret,
  onEdit,
  onDelete,
}: {
  secret: ProjectEnvironmentSecret
  onEdit: (secret: ProjectEnvironmentSecret) => void
  onDelete: (id: string) => void
}) => (
  <div className="rounded-lg border border-primary-200 bg-white p-4 shadow-sm">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <h3 className="font-semibold text-primary-600">{secret.key}</h3>
        <p className="mt-1 font-mono text-sm text-primary-400">{secret.maskedValue}</p>
        {secret.description && <p className="mt-2 text-sm text-gray-600">{secret.description}</p>}
        <p className="mt-2 text-xs text-gray-400">
          Created: {new Date(secret.created).toLocaleDateString()}
        </p>
      </div>
      <div className="flex space-x-2">
        <Button
          onClick={() => onEdit(secret)}
          variant="ghost"
          className="hover:bg-primary-50 border-primary-300 px-2 py-1 text-xs text-primary-600"
        >
          Edit
        </Button>
        <Button
          onClick={() => onDelete(secret.id)}
          variant="ghost"
          className="border-error px-2 py-1 text-xs text-error hover:bg-red-50"
        >
          Delete
        </Button>
      </div>
    </div>
  </div>
)

const EnvironmentSecretFormComponent = ({
  projectId,
  onSuccess,
  onCancel,
  editingSecret,
}: {
  projectId: string
  onSuccess: (secret: ProjectEnvironmentSecret) => void
  onCancel: () => void
  editingSecret?: ProjectEnvironmentSecret
}) => {
  const { form, createFormFieldChangeHandler, overrideForm } = useTnForm<TEnvironmentSecretForm>()
  const [showSecretValue, setShowSecretValue] = useState(false)
  const [secretJustCreated, setSecretJustCreated] = useState<string | null>(null)
  const isEditing = Boolean(editingSecret)

  useEffect(() => {
    const newForm = new EnvironmentSecretForm({}) as TEnvironmentSecretForm
    newForm.project.value = projectId

    if (editingSecret) {
      newForm.key.value = editingSecret.key
      newForm.description.value = editingSecret.description || ''
      // Don't set value for editing - it will be empty to indicate "keep current"
    }

    overrideForm(newForm)
  }, [editingSecret, projectId, overrideForm])

  const { mutate: create, isPending: isCreating } = useMutation({
    mutationFn: environmentSecretApi.create,
    onSuccess: (data) => {
      // Show the secret value for a brief moment after creation
      if (data.value) {
        setSecretJustCreated(data.value)
        setShowSecretValue(true)
        setTimeout(() => {
          setShowSecretValue(false)
          setSecretJustCreated(null)
          onSuccess(data)
        }, 10000) // Show for 10 seconds
      } else {
        onSuccess(data)
      }
    },
  })

  const { mutate: update, isPending: isUpdating } = useMutation({
    mutationFn: environmentSecretApi.update,
    onSuccess: (data) => {
      onSuccess(data)
    },
  })

  const isPending = isCreating || isUpdating

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (form.isValid) {
      if (isEditing && editingSecret) {
        // For updates, only send fields that have values
        const updateData: any = {
          key: form.key.value,
          description: form.description.value || '',
        }

        // Only include value if it was changed
        if (form.secretValue.value) {
          updateData.value = form.secretValue.value
        }

        update({ id: editingSecret.id, ...updateData })
      } else {
        create({
          project: projectId,
          key: form.key.value!,
          value: form.secretValue.value!,
          description: form.description.value || '',
        })
      }
    }
  }

  if (secretJustCreated && showSecretValue) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6 shadow-sm">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-green-800">Secret Created Successfully!</h3>
          <p className="mt-1 text-sm text-green-600">
            This is the only time you&apos;ll see the full secret value. Please copy it now.
          </p>
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-green-700">
            Secret Value (copy this now):
          </label>
          <div className="rounded border border-green-300 bg-white p-3 font-mono text-sm">
            {secretJustCreated}
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <Button
            onClick={() => {
              setShowSecretValue(false)
              setSecretJustCreated(null)
              onSuccess({ ...form.modelValue } as ProjectEnvironmentSecret)
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
          {isEditing ? 'Edit Environment Secret' : 'Add New Environment Secret'}
        </h3>
        <p className="mt-2 text-sm text-primary-400">
          {isEditing
            ? 'Update your environment secret (leave value empty to keep current)'
            : 'Add a new environment secret that can be used in agent prompts'}
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div>
          <Input
            label="Variable Name"
            placeholder="e.g., API_KEY, DATABASE_URL"
            value={form.key.value ?? ''}
            onChange={(e) => createFormFieldChangeHandler(form.key)(e.target.value)}
            className="bg-primary-50 border-primary-200 focus:border-primary-500"
          />
          <ErrorsList errors={form.key.errors} />
          <p className="mt-1 text-xs text-gray-500">
            Use uppercase with underscores (e.g., MY_API_KEY)
          </p>
        </div>

        <div>
          <Input
            label={isEditing ? 'Secret Value (leave empty to keep current)' : 'Secret Value'}
            type="password"
            placeholder={
              isEditing ? 'Enter new value to replace current...' : 'Enter the secret value...'
            }
            value={form.secretValue.value ?? ''}
            onChange={(e) => createFormFieldChangeHandler(form.secretValue)(e.target.value)}
            className="bg-primary-50 border-primary-200 focus:border-primary-500"
          />
          <ErrorsList errors={form.secretValue.errors || []} />
          {isEditing && (
            <p className="mt-1 text-xs text-gray-500">
              Current value: {editingSecret?.maskedValue}
            </p>
          )}
        </div>

        <div>
          <Textarea
            label="Description (Optional)"
            placeholder="What is this secret used for?"
            value={form.description.value ?? ''}
            onChange={(e) => createFormFieldChangeHandler(form.description)(e.target.value)}
            className="bg-primary-50 border-primary-200 focus:border-primary-500"
            rows={3}
          />
          <ErrorsList errors={form.description.errors || []} />
        </div>

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
            {isPending ? 'Saving...' : isEditing ? 'Update Secret' : 'Create Secret'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export const ProjectSettings = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [secrets, setSecrets] = useState<ProjectEnvironmentSecret[]>([])
  const [showSecretForm, setShowSecretForm] = useState(false)
  const [editingSecret, setEditingSecret] = useState<ProjectEnvironmentSecret | null>(null)
  const queryClient = useQueryClient()

  const { data: project, isLoading: loadingProject } = useQuery(agentProjectQueries.retrieve(id!))

  const { data: secretsData, isLoading: loadingSecrets } = useQuery({
    ...environmentSecretQueries.list({
      pagination: new Pagination({ page: 1, size: 100 }),
      filters: { project: id!, search: '' },
    }),
    enabled: !!id,
  })

  useEffect(() => {
    if (secretsData?.results) {
      const filtered = secretsData.results.filter((secret: any) => secret.project === id)
      setSecrets(filtered)
    }
  }, [secretsData?.results, id])

  const { mutate: deleteSecret } = useMutation({
    mutationFn: (secretId: string) => environmentSecretApi.remove(secretId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environment-secrets'] })
    },
  })

  const handleSecretSaved = (secret: ProjectEnvironmentSecret) => {
    if (editingSecret) {
      setSecrets((prev) => prev.map((s) => (s.id === secret.id ? secret : s)))
    } else {
      setSecrets((prev) => [...prev, secret])
    }
    setShowSecretForm(false)
    setEditingSecret(null)
    queryClient.invalidateQueries({ queryKey: ['environment-secrets'] })
  }

  const handleEditSecret = (secret: ProjectEnvironmentSecret) => {
    setEditingSecret(secret)
    setShowSecretForm(true)
  }

  const handleDeleteSecret = (secretId: string) => {
    if (confirm('Are you sure you want to delete this environment secret?')) {
      deleteSecret(secretId)
      setSecrets((prev) => prev.filter((s) => s.id !== secretId))
    }
  }

  const isLoading = loadingProject || loadingSecrets

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent"></div>
              <p className="mt-4 text-primary-600">Loading project settings...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="py-20 text-center">
            <p className="text-error">Project not found</p>
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
            onClick={() => navigate(`/projects/${id}`)}
            variant="ghost"
            className="mb-4 border-primary-300 text-primary-600 hover:bg-primary-100"
          >
            ← Back to Project
          </Button>
        </div>

        <div className="space-y-8">
          {/* Project Header */}
          <div className="rounded-lg border border-primary-200 bg-white p-6 shadow-sm">
            <h1 className="text-3xl font-bold text-primary-600">{project.title} Settings</h1>
            <p className="mt-2 text-primary-400">Manage environment secrets for your project</p>
          </div>

          {/* Environment Secrets Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-primary-600">Environment Secrets</h2>
                <p className="mt-1 text-sm text-primary-400">
                  Secure variables that can be used in your agent prompts with{' '}
                  <code className="rounded bg-gray-100 px-1">{'{{VARIABLE_NAME}}'}</code> syntax
                </p>
              </div>
              {!showSecretForm && (
                <Button
                  onClick={() => setShowSecretForm(true)}
                  className="bg-primary-600 hover:bg-primary-700"
                >
                  + Add Secret
                </Button>
              )}
            </div>

            {/* Environment Secret Cards */}
            {secrets.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {secrets.map((secret) => (
                  <EnvironmentSecretCard
                    key={secret.id}
                    secret={secret}
                    onEdit={handleEditSecret}
                    onDelete={handleDeleteSecret}
                  />
                ))}
              </div>
            )}

            {secrets.length === 0 && !showSecretForm && (
              <div className="rounded-lg border-2 border-dashed border-primary-200 bg-white p-12 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
                  <span className="text-2xl text-primary-600">🔐</span>
                </div>
                <h3 className="mb-2 text-lg font-medium text-primary-600">No secrets yet</h3>
                <p className="mb-6 text-primary-400">
                  Add environment secrets to use in your agent prompts
                </p>
                <Button
                  onClick={() => setShowSecretForm(true)}
                  className="bg-primary-600 hover:bg-primary-700"
                >
                  Add First Secret
                </Button>
              </div>
            )}

            {/* Environment Secret Form */}
            {showSecretForm && (
              <FormProvider<EnvironmentSecretFormInputs> formClass={EnvironmentSecretForm}>
                <EnvironmentSecretFormComponent
                  projectId={id!}
                  onSuccess={handleSecretSaved}
                  onCancel={() => {
                    setShowSecretForm(false)
                    setEditingSecret(null)
                  }}
                  editingSecret={editingSecret ?? undefined}
                />
              </FormProvider>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
