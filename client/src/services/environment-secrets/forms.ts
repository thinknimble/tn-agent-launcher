import { Form, FormField } from '@thinknimble/tn-forms'
import { IFormField } from '@thinknimble/tn-forms'
import { RequiredValidator } from '@thinknimble/tn-forms'

// Environment Secret Form (used for both create and update)
export type EnvironmentSecretFormInputs = {
  project: IFormField<string>
  key: IFormField<string>
  secretValue: IFormField<string>
  description: IFormField<string>
}

export class EnvironmentSecretForm extends Form<EnvironmentSecretFormInputs> {
  static project = FormField.create({
    label: 'Project',
    validators: [new RequiredValidator()],
  })

  static key = FormField.create({
    label: 'Variable Name',
    placeholder: 'e.g., API_KEY, DATABASE_URL',
    validators: [new RequiredValidator()],
  })

  static secretValue = FormField.create({
    label: 'Secret Value',
    placeholder: 'Enter the secret value...',
    validators: [new RequiredValidator()],
  })

  static description = FormField.create({
    label: 'Description (Optional)',
    placeholder: 'What is this secret used for?',
    validators: [],
  })

  get modelValue(){
    return {
      project: this.field.project.value!,
      key: this.field.key.value!,
      value: this.field.secretValue.value!,
      description: this.field.description.value || undefined,
    }
  }


}

export type TEnvironmentSecretForm = EnvironmentSecretFormInputs & EnvironmentSecretForm
