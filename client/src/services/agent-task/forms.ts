import { Form, IFormField, FormField } from '@thinknimble/tn-forms'
import { SelectOption } from '../base-model'

export type AgentTaskFormInputs = {
  _name: IFormField<string>
  description: IFormField<string>
  agentInstance: IFormField<SelectOption | null>
  instruction: IFormField<string>
  scheduleType: IFormField<SelectOption | null>
  scheduledAt: IFormField<string>
  intervalMinutes: IFormField<number | null>
  maxExecutions: IFormField<number | null>
}

export class AgentTaskForm extends Form<AgentTaskFormInputs> {
  static _name = FormField.create({
    label: 'Task Name',
    placeholder: 'Daily Report Generation',
    type: 'text',
    value: '',
  })

  static description = FormField.create({
    label: 'Description',
    placeholder: 'Describe what this task does...',
    type: 'textarea',
    value: '',
  })

  static agentInstance = FormField.create({
    label: 'Agent Instance',
    placeholder: 'Select an agent instance',
    type: 'select',
    value: null,
  })

  static instruction = FormField.create({
    label: 'Instruction',
    placeholder: 'Write the prompt/instruction for the agent...',
    type: 'textarea',
    value: '',
  })

  static scheduleType = FormField.create({
    label: 'Schedule Type',
    placeholder: 'Select schedule type',
    type: 'select',
    value: null,
  })

  static scheduledAt = FormField.create({
    label: 'Scheduled At',
    placeholder: '2024-01-01T12:00:00Z',
    type: 'datetime-local',
    value: '',
  })

  static intervalMinutes = FormField.create({
    label: 'Interval (Minutes)',
    placeholder: 'e.g., 60 for hourly',
    type: 'number',
    value: null,
  })

  static maxExecutions = FormField.create({
    label: 'Max Executions',
    placeholder: 'Leave blank for unlimited',
    type: 'number',
    value: null,
  })
}

export type TAgentTaskForm = AgentTaskForm & AgentTaskFormInputs
