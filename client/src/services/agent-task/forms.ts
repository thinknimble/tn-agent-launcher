import {
  Form,
  IFormField,
  FormField,
  PatternValidator,
  notNullOrUndefined,
} from '@thinknimble/tn-forms'
import { SelectOption } from '../base-model'
import { InputSource } from './models'

export class InputSourceValidator extends PatternValidator {
  constructor({
    message = 'Please provide valid input sources',
    code = 'invalidInputSource',
    isRequired = false,
  } = {}) {
    // URL pattern for validating URLs within input source objects
    const pattern =
      /^(ftp|http|https|agent-output):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-/]))?$/
    super({ message, code, isRequired, pattern })
  }

  call(value: any) {
    // Allow empty arrays
    if (!value || (Array.isArray(value) && value.length === 0)) {
      if (this.isRequired) {
        throw new Error(
          JSON.stringify({ code: this.code, message: 'At least one input source is required' }),
        )
      }
      return
    }

    if (!Array.isArray(value)) {
      throw new Error(
        JSON.stringify({ code: this.code, message: 'Input sources must be an array' }),
      )
    }

    for (const source of value) {
      // Validate each input source object
      if (typeof source !== 'object' || source === null) {
        throw new Error(
          JSON.stringify({ code: this.code, message: 'Each input source must be an object' }),
        )
      }

      // Check required fields
      if (!source.url || typeof source.url !== 'string') {
        throw new Error(
          JSON.stringify({ code: this.code, message: 'Each input source must have a valid URL' }),
        )
      }

      // Validate URL format
      if (!this.pattern.test(source.url)) {
        throw new Error(
          JSON.stringify({ code: this.code, message: `Invalid URL format: ${source.url}` }),
        )
      }

      // Validate sourceType if present
      if (source.sourceType && typeof source.sourceType !== 'string') {
        throw new Error(
          JSON.stringify({ code: this.code, message: 'Source type must be a string' }),
        )
      }

      // Validate optional fields
      if (source.filename && typeof source.filename !== 'string') {
        throw new Error(JSON.stringify({ code: this.code, message: 'Filename must be a string' }))
      }

      if (source.size && (typeof source.size !== 'number' || source.size < 0)) {
        throw new Error(
          JSON.stringify({ code: this.code, message: 'File size must be a positive number' }),
        )
      }

      if (source.contentType && typeof source.contentType !== 'string') {
        throw new Error(
          JSON.stringify({ code: this.code, message: 'Content type must be a string' }),
        )
      }
    }
  }
}

export type AgentTaskFormInputs = {
  _name: IFormField<string>
  description: IFormField<string>
  agentInstance: IFormField<SelectOption | null>
  instruction: IFormField<string>
  appendAgentInstruction: IFormField<boolean>
  inputSources: IFormField<InputSource[]>
  scheduleType: IFormField<SelectOption | null>
  scheduledAt: IFormField<string>
  intervalMinutes: IFormField<number | null>
  triggeredByTask: IFormField<SelectOption | null>
  webhookValidateSignature: IFormField<boolean>
  maxExecutions: IFormField<number | null>
  sinks: IFormField<SelectOption[]>
  funnels: IFormField<SelectOption[]>
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

  static appendAgentInstruction = FormField.create({
    label: 'Append Agent Instruction',
    type: 'checkbox',
    value: true,
  })

  static inputSources = FormField.create({
    label: 'Input Sources',
    placeholder: 'Add files or URLs as input sources...',
    type: 'array',
    value: [],
    validators: [new InputSourceValidator({ isRequired: false })],
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

  static triggeredByTask = FormField.create({
    label: 'Triggered By Task',
    placeholder: 'Select task that will trigger this task',
    type: 'select',
    value: null,
  })

  static webhookValidateSignature = FormField.create({
    label: 'Validate Webhook Signature',
    type: 'checkbox',
    value: true,
  })

  static maxExecutions = FormField.create({
    label: 'Max Executions',
    placeholder: 'Leave blank for unlimited',
    type: 'number',
    value: null,
  })

  static sinks = FormField.create({
    label: 'Sinks',
    placeholder: 'Select sinks for this task',
    type: 'array',
    value: [],
  })
  static funnels = FormField.create({
    label: 'Funnels',
    placeholder: 'Select funnels for this task',
    type: 'array',
    value: [],
  })
}

export type TAgentTaskForm = AgentTaskForm & AgentTaskFormInputs
