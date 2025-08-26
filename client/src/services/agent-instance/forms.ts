import { Form, IFormField, FormField } from '@thinknimble/tn-forms'
import { SelectOption } from '../base-model'

export type AgentInstanceFormInputs = {
  friendlyName: IFormField<string>
  provider: IFormField<SelectOption | null>
  modelName: IFormField<string>
  apiKey: IFormField<string | null>
  targetUrl: IFormField<string>
  agentType: IFormField<SelectOption | null>
}

export class AgentInstanceForm extends Form<AgentInstanceFormInputs> {
  static friendlyName = FormField.create({
    label: 'Friendly Name',
    placeholder: 'My Agent Instance',
    type: 'text',
    value: '',
  })
  static provider = FormField.create({
    label: 'Provider',
    placeholder: 'Select Provider',
    type: 'select',
    value: null,
  })
  static modelName = FormField.create({
    label: 'Model Name',
    placeholder: 'e.g., gpt-4, claude-2, etc.',
    type: 'select',
    value: '',
  })
  static apiKey = FormField.create({
    label: 'API Key',
    placeholder: 'Your API Key (if applicable)',
    type: 'password',
    value: null,
  })
  static targetUrl = FormField.create({
    label: 'Target URL',
    placeholder: 'https://api.yourprovider.com/v1',
    type: 'text',
    value: '',
  })
  static agentType = FormField.create({
    label: 'Agent Type',
    placeholder: 'Select Agent Type',
    type: 'select',
    value: null,
  })
}

export type TAgentInstanceForm = AgentInstanceForm & AgentInstanceFormInputs
