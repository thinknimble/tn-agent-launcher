import { Form, FormField, IFormField, RequiredValidator } from '@thinknimble/tn-forms'

export type AgentProjectFormInputs = {
  title: IFormField<string>
  description: IFormField<string | null>
}

export class AgentProjectForm extends Form<AgentProjectFormInputs> {
  static title = FormField.create({
    validators: [new RequiredValidator()],
    label: 'Title',
    placeholder: 'My Agent Project',
    value: '',
  })
  static description = FormField.create({
    validators: [],
    label: 'Description',
    placeholder: 'A brief description of your agent project.',
    value: null,
  })
}

export type TAgentProjectForm = AgentProjectForm & AgentProjectFormInputs
