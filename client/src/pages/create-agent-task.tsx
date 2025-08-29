import { FormProvider, useTnForm } from '@thinknimble/tn-forms-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams, useParams } from 'react-router-dom'
import { useCallback, useMemo, useState, useEffect } from 'react'
import { Pagination } from '@thinknimble/tn-models'
import Select from 'react-dropdown-select'

import { Button } from 'src/components/button'
import { Input } from 'src/components/input'
import { ErrorsList } from 'src/components/errors'
import { InputSourceUploader } from 'src/components/input-source-uploader'
import {
  AgentTask,
  AgentTaskForm,
  TAgentTaskForm,
  agentTaskApi,
  agentTaskQueries,
  scheduleTypeLabelMap,
  scheduleTypeEnum,
  ScheduleTypeValues,
} from 'src/services/agent-task'
import { AgentInstance, agentInstanceQueries, agentTypeEnum } from 'src/services/agent-instance'
import { SelectOption } from 'src/services/base-model'

const CreateEditAgentTaskInner = ({
  onSuccess,
  onCancel,
  preselectedAgentId,
  initialData,
  duplicateFrom,
  isEditing = false,
}: {
  onSuccess: (task: AgentTask) => void
  onCancel?: () => void
  preselectedAgentId?: string
  initialData?: AgentTask
  duplicateFrom?: AgentTask
  isEditing?: boolean
}) => {
  const { form, createFormFieldChangeHandler, overrideForm } = useTnForm<TAgentTaskForm>()
  const queryClient = useQueryClient()

  const { data: agentInstances } = useQuery(
    agentInstanceQueries.list(new Pagination(), {
      projects: [],
      agentType: agentTypeEnum.ONE_SHOT as string,
    }),
  )

  const { mutate: create, isPending: isCreating } = useMutation({
    mutationFn: agentTaskApi.create,
    onSuccess(data) {
      onSuccess(data)
      queryClient.invalidateQueries({ queryKey: ['agent-tasks'] })
    },
  })

  const { mutate: update, isPending: isUpdating } = useMutation({
    mutationFn: agentTaskApi.update,
    onSuccess(data) {
      onSuccess(data)
      queryClient.invalidateQueries({ queryKey: ['agent-tasks'] })
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

  // Pre-populate form for editing
  useEffect(() => {
    if (initialData && isEditing) {
      const updatedForm = new AgentTaskForm() as TAgentTaskForm
      updatedForm._name.value = initialData.name
      updatedForm.description.value = initialData.description || ''
      updatedForm.instruction.value = initialData.instruction
      updatedForm.inputUrls.value = initialData.inputUrls || []
      updatedForm.scheduledAt.value = initialData.scheduledAt || ''
      updatedForm.intervalMinutes.value = initialData.intervalMinutes
      updatedForm.maxExecutions.value = initialData.maxExecutions

      // Set agent instance
      const agentOption = agentOptions.find((opt) => opt.value === initialData.agentInstance)
      if (agentOption) {
        updatedForm.agentInstance.value = agentOption
      }

      // Set schedule type
      const scheduleOption = scheduleTypeOptions.find(
        (opt) => opt.value === initialData.scheduleType,
      )
      if (scheduleOption) {
        updatedForm.scheduleType.value = scheduleOption
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
      updatedForm.inputUrls.value = duplicateFrom.inputUrls || []
      updatedForm.scheduledAt.value = duplicateFrom.scheduledAt || ''
      updatedForm.intervalMinutes.value = duplicateFrom.intervalMinutes
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

      overrideForm(updatedForm)
    }
  }, [duplicateFrom, agentOptions, scheduleTypeOptions, overrideForm, isEditing])

  // Pre-select agent for new tasks (only if not duplicating)
  useEffect(() => {
    if (preselectedAgentId && agentOptions.length > 0 && !isEditing && !duplicateFrom) {
      const selectedAgent = agentOptions.find((option) => option.value === preselectedAgentId)
      if (selectedAgent) {
        const updatedForm = new AgentTaskForm() as TAgentTaskForm
        updatedForm.agentInstance.value = selectedAgent
        overrideForm(updatedForm)
      }
    }
  }, [preselectedAgentId, agentOptions, overrideForm, isEditing, duplicateFrom])

  const isScheduleTypeOnce = form.scheduleType.value?.value === scheduleTypeEnum.ONCE
  const isScheduleTypeCustom = form.scheduleType.value?.value === scheduleTypeEnum.CUSTOM_INTERVAL

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (form.isValid) {
      const formValue = form.value
      const data = {
        name: formValue._name || '',
        description: formValue.description || '',
        agentInstance: formValue.agentInstance?.value || '',
        instruction: formValue.instruction || '',
        inputUrls: (formValue.inputUrls || []).filter((url) => url.trim() !== ''),
        scheduleType: (formValue.scheduleType?.value || '') as ScheduleTypeValues,
        scheduledAt: formValue.scheduledAt || undefined,
        intervalMinutes: formValue.intervalMinutes || undefined,
        maxExecutions: formValue.maxExecutions || undefined,
      }

      if (isEditing && initialData) {
        update({ ...data, id: initialData.id })
      } else {
        create(data)
      }
    }
  }

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
              ? `Creating a copy of "${duplicateFrom.name}"`
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
              disabled={!!preselectedAgentId || isEditing}
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
          <textarea
            placeholder="Write the prompt/instruction for the agent..."
            className="bg-primary-50 resize-vertical h-32 w-full rounded-md border border-primary-200 p-3 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            value={form.instruction.value}
            onChange={(e) => createFormFieldChangeHandler(form.instruction)(e.target.value)}
          />
          <ErrorsList errors={form.instruction.errors} />
        </div>

        <div>
          <label className="mb-3 block text-sm font-medium text-primary-600">Input Sources</label>
          
          {/* File Upload Section */}
          <div className="mb-4">
            <InputSourceUploader
              onFilesSelected={(urls) => {
                const currentUrls = form.inputUrls.value || []
                createFormFieldChangeHandler(form.inputUrls)([...currentUrls, ...urls])
              }}
              maxFiles={5}
              maxSize={50}
            />
          </div>

          {/* URL Input Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-px bg-primary-200 flex-1"></div>
              <span className="text-xs text-primary-400 px-2">Or add URLs manually</span>
              <div className="h-px bg-primary-200 flex-1"></div>
            </div>
            
            <div className="space-y-2">
              {(form.inputUrls.value || []).map((url, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    type="url"
                    placeholder="https://example.com/document.pdf"
                    value={url}
                    onChange={(e) => {
                      const currentUrls = form.inputUrls.value || []
                      const newUrls = [...currentUrls]
                      newUrls[index] = e.target.value
                      createFormFieldChangeHandler(form.inputUrls)(newUrls)
                    }}
                    className="bg-primary-50 flex-1 border-primary-200 focus:border-primary-500"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      const currentUrls = form.inputUrls.value || []
                      const newUrls = currentUrls.filter((_, i) => i !== index)
                      createFormFieldChangeHandler(form.inputUrls)(newUrls)
                    }}
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  const currentUrls = form.inputUrls.value || []
                  createFormFieldChangeHandler(form.inputUrls)([...currentUrls, ''])
                }}
                className="hover:bg-primary-50 text-primary-600 hover:text-primary-700"
              >
                Add URL
              </Button>
            </div>
          </div>
          
          <ErrorsList errors={form.inputUrls.errors} />
          <p className="mt-2 text-xs text-primary-400">
            Upload files or add URLs to documents, images, or other resources for the agent to process
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
    </div>
  )
}

export const CreateAgentTask = ({
  task,
  agent,
  duplicateFrom,
  onSuccess,
  onCancel,
}: {
  task?: AgentTask
  agent?: AgentInstance
  duplicateFrom?: AgentTask
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
            preselectedAgentId={agent?.id || undefined}
            initialData={task}
            duplicateFrom={duplicateFrom}
            isEditing={isEditing}
          />
        </FormProvider>
      </div>
    </div>
  )
}
