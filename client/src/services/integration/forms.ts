import { Form, FormField, IFormField, RequiredValidator, EmailValidator } from '@thinknimble/tn-forms'
import { integrationTypeEnum, type IntegrationTypeValues } from './models'

type CreateIntegrationFormInputs = {
  _name: IFormField<string>
  integrationType: IFormField<IntegrationTypeValues>
  isSystemProvided: IFormField<boolean>
  webhookUrl: IFormField<string>
  agentTasks: IFormField<string[]>
  // S3 fields
  awsAccessKeyId: IFormField<string>
  awsSecretAccessKey: IFormField<string>
  bucketName: IFormField<string>
  region: IFormField<string>
  location: IFormField<string>
  // Google Drive field
  credentialsFile: IFormField<File | null>
}

export class CreateIntegrationForm extends Form<CreateIntegrationFormInputs> {
  static _name = FormField.create({
    validators: [new RequiredValidator()],
  })
  
  static integrationType = FormField.create({
    value: integrationTypeEnum.AWS_S3,
    validators: [new RequiredValidator()],
  })
  
  static isSystemProvided = FormField.create({
    value: true,
  })
  
  static webhookUrl = FormField.create({
    value: '',
  })
  
  static agentTasks = FormField.create({
    value: [],
  })
  
  // S3 fields
  static awsAccessKeyId = FormField.create({
    value: '',
  })
  
  static awsSecretAccessKey = FormField.create({
    value: '',
  })
  
  static bucketName = FormField.create({
    value: '',
  })
  
  static region = FormField.create({
    value: 'us-east-1',
  })
  
  static location = FormField.create({
    value: '',
  })
  
  // Google Drive field
  static credentialsFile = FormField.create({
    value: null,
  })
}

export type TCreateIntegrationForm = CreateIntegrationFormInputs & CreateIntegrationForm



export type CustomS3FormInputs = {
  awsAccessKeyId: IFormField<string>
  awsSecretAccessKey: IFormField<string>
  bucketName: IFormField<string>
  region: IFormField<string>
  location: IFormField<string>

}

export class CustomS3Form extends Form<CustomS3FormInputs> {
  static awsAccessKeyId = FormField.create({
    validators: [new RequiredValidator()],
    label: 'AWS Access Key ID',
  })
  
  static awsSecretAccessKey = FormField.create({
    validators: [new RequiredValidator()],
    label: 'AWS Secret Access Key',
  })
  
  static bucketName = FormField.create({
    validators: [new RequiredValidator()],
    label: 'Bucket Name',
  })
  
  static region = FormField.create({
    validators: [new RequiredValidator()],
    label: 'Region',
  })
  
  static location = FormField.create({
    value: '',
    label: 'Location',
  })
}

export type TCustomS3Form = CustomS3FormInputs & CustomS3Form


export type CustomGoogleDriveFormInputs = {
  credentialsFile: IFormField<File | null>
}

export class CustomGoogleDriveForm extends Form<CustomGoogleDriveFormInputs> {
  static credentialsFile = FormField.create<File | null>({
    validators: [new RequiredValidator()],
  })
}

export type TCustomGoogleDriveForm = CustomGoogleDriveFormInputs & CustomGoogleDriveForm

export type WebHookFormInputs = {
  _name: IFormField<string>
  webhookUrl: IFormField<string>
}

export class WebHookForm extends Form<WebHookFormInputs> {
  static _name = FormField.create({
    validators: [new RequiredValidator()],
  })
  static webhookUrl = FormField.create({
    validators: [new RequiredValidator()],
  })
}

export type TWebHookForm = WebHookFormInputs & WebHookForm