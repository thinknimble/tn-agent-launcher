import { Form, IFormField, FormField, UrlValidator, PatternValidator, notNullOrUndefined} from '@thinknimble/tn-forms'
import { SelectOption } from '../base-model'


export class UrlValidatorList extends PatternValidator {
  constructor({
    message = 'Please enter a valid url',
    code = 'invalidUrl',
    isRequired = true,
  } = {}) {
    let pattern =
      /^(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-/]))?$/
    super({ message, code, isRequired, pattern })
  }
    call(value: any) {
    if (!notNullOrUndefined(value)) {
      throw new Error(JSON.stringify({ code: this.code, message: this.message }))
    } 
    if (!Array.isArray(value)) {
      throw new Error(JSON.stringify({ code: this.code, message: this.message }))
    }
    for (let url of value) {
      if (typeof url !== 'string' || !this.pattern.test(url)) {
        throw new Error(JSON.stringify({ code: this.code, message: this.message }))
      }
    }
  }
}

export type AgentTaskFormInputs = {
  _name: IFormField<string>
  description: IFormField<string>
  agentInstance: IFormField<SelectOption | null>
  instruction: IFormField<string>
  inputUrls: IFormField<string[]>
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

  static inputUrls = FormField.create({
    label: 'Input URLs',
    placeholder: 'Add URLs to include as input sources...',
    type: 'array',
    value: [],
    validators: [new UrlValidatorList({isRequired: false})],
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
