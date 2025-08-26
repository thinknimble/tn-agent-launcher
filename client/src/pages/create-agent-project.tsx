import { FormProvider, useTnForm } from '@thinknimble/tn-forms-react'
import {
  AgentProject,
  AgentProjectForm,
  TAgentProjectForm,
  agentProjectApi,
} from 'src/services/agent-project'
import { useMutation } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'

import { Button } from 'src/components/button'
import { Input } from 'src/components/input'
import { ErrorsList } from 'src/components/errors'
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
import { SelectOption } from 'src/services/base-model' // Assuming a Select component exists
import { useNavigate } from 'react-router-dom'
import Select from 'react-dropdown-select'

const CreateAgentProjectForm = ({
  onSuccess,
}: {
  onSuccess: (agentProject: AgentProject) => void
}) => {
  const { form, createFormFieldChangeHandler } = useTnForm<TAgentProjectForm>()

  const { mutate: create, isPending } = useMutation({
    mutationFn: agentProjectApi.create,
    onSuccess(data) {
      onSuccess(data)
    },
  })

  return (
    <div className="mx-auto mt-10 max-w-md">
      <h1 className="mb-4 text-2xl font-bold">Create New Agent Project</h1>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (form.isValid) {
            create({
              title: form.title.value ?? '',
              description: form.description.value ?? '',
            })
          }
        }}
      >
        <div>
          <Input
            label={form.title.label}
            placeholder={form.title.placeholder}
            value={form.title.value ?? ''}
            onChange={(e) => createFormFieldChangeHandler(form.title)(e.target.value)}
          />
          <ErrorsList errors={form.title.errors} />
        </div>
        <div>
          <Input
            label={form.description.label}
            placeholder={form.description.placeholder}
            value={form.description.value ?? ''}
            onChange={(e) => createFormFieldChangeHandler(form.description)(e.target.value)}
          />
          <ErrorsList errors={form.description.errors} />
        </div>
        <Button type="submit" disabled={isPending || !form.isValid}>
          Create Project
        </Button>
      </form>
    </div>
  )
}

const AddAgentInstanceForm = ({
  agentProject,
  onInstanceAdded,
}: {
  agentProject: AgentProject
  onInstanceAdded: (instance: AgentInstance) => void
}) => {
  const { form, createFormFieldChangeHandler, overrideForm } = useTnForm<TAgentInstanceForm>()

  const { mutate: create, isPending } = useMutation({
    mutationFn: (data: any) => agentInstanceApi.create(data),
    onSuccess: (newInstance) => {
      onInstanceAdded(newInstance)
      overrideForm(new AgentInstanceForm() as TAgentInstanceForm)
    },
  })

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
          { label: 'claude-2', value: 'claude-2' },
          { label: 'claude-instant-100k', value: 'claude-instant-100k' },
        ]
      case providerKeysEnum.GEMINI:
        return [
          { label: 'gemini-1.5', value: 'gemini-1.5' },
          { label: 'gemini-1.5-pro', value: 'gemini-1.5-pro' },
        ]
      case providerKeysEnum.OLLAMA:
        return [
          { label: 'llama2', value: 'llama2' },
          { label: 'llama3', value: 'llama3' },
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
      console.log('formValue', formValue)
      create({
        ...formValue,
        agentProject: agentProject.id,
        provider: formValue.provider?.value,
        agentType: formValue.agentType?.value,
      })
    }
  }

  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold">Add Agent Instance</h2>
      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <Input
          label={form.friendlyName.label}
          placeholder={form.friendlyName.placeholder}
          value={form.friendlyName.value}
          onChange={(e) => createFormFieldChangeHandler(form.friendlyName)(e.target.value)}
        />
        <ErrorsList errors={form.friendlyName.errors} />

        <Select
          options={providerOptions}
          values={form.provider.value ? [form.provider.value] : []}
          onChange={(values) =>
            createFormFieldChangeHandler(form.provider)(values ? values[0] : null)
          }
        />
        <ErrorsList errors={form.provider.errors} />

        <Select
          options={modelOptions}
          values={
            form.modelName.value
              ? [{ label: form.modelName.value, value: form.modelName.value }]
              : []
          }
          onChange={(values) =>
            createFormFieldChangeHandler(form.modelName)(values.length > 0 ? values[0].value : '')
          }
        />
        <ErrorsList errors={form.modelName.errors} />

        <Input
          label={form.apiKey.label}
          placeholder={form.apiKey.placeholder}
          value={form.apiKey.value ?? ''}
          onChange={(e) => createFormFieldChangeHandler(form.apiKey)(e.target.value)}
          type="password"
        />
        <ErrorsList errors={form.apiKey.errors} />

        <Input
          label={form.targetUrl.label}
          placeholder={form.targetUrl.placeholder}
          value={form.targetUrl.value}
          onChange={() => createFormFieldChangeHandler(form.targetUrl)}
        />
        <ErrorsList errors={form.targetUrl.errors} />

        <Select
          options={agentTypeOptions}
          values={form.agentType.value ? [form.agentType.value] : []}
          onChange={(values) =>
            createFormFieldChangeHandler(form.agentType)(values ? values[0] : null)
          }
        />
        <ErrorsList errors={form.agentType.errors} />

        <Button type="submit" disabled={isPending || !form.isValid}>
          Add Instance
        </Button>
      </form>
    </div>
  )
}

export const CreateAgentProject = () => {
  const [agentProject, setAgentProject] = useState<AgentProject | null>(null)
  const [instances, setInstances] = useState<AgentInstance[]>([])
  const navigate = useNavigate()

  const handleInstanceAdded = (instance: AgentInstance) => {
    setInstances((prev) => [...prev, instance])
  }

  return (
    <div className="mx-auto mt-10 max-w-2xl p-4">
      {!agentProject ? (
        <FormProvider formClass={AgentProjectForm}>
          <CreateAgentProjectForm onSuccess={setAgentProject} />
        </FormProvider>
      ) : (
        <div>
          <h1 className="text-3xl font-bold">{agentProject.title}</h1>
          <p className="text-gray-600">{agentProject.description}</p>
          <div className="my-6">
            <h2 className="text-2xl font-semibold">Instances</h2>
            {instances.length === 0 ? (
              <p className="mt-2 text-gray-500">No instances added yet.</p>
            ) : (
              <ul className="mt-2 list-disc pl-5">
                {instances.map((inst) => (
                  <li key={inst.id}>{inst.friendlyName}</li>
                ))}
              </ul>
            )}
          </div>
          <FormProvider formClass={AgentInstanceForm}>
            <AddAgentInstanceForm
              agentProject={agentProject}
              onInstanceAdded={handleInstanceAdded}
            />
          </FormProvider>
          <div className="mt-8 flex justify-end">
            <Button onClick={() => navigate('/dashboard')} variant="primary">
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
