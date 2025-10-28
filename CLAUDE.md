## 🔒 IMPORTANT SECURITY NOTICE - OPEN SOURCE PROJECT

**THIS IS AN OPEN SOURCE PROJECT** - All code is publicly visible on GitHub.

### Security Guidelines for Contributors:

1. **NEVER commit sensitive information:**
   - API keys (OpenAI, Anthropic, AWS, Google, etc.)
   - Passwords or authentication tokens
   - AWS credentials or secret keys
   - Database passwords
   - Private URLs or internal endpoints
   - Personal identifying information

2. **Always use environment variables:**
   - Store secrets in `.env` files (already gitignored)
   - Use `.env.example` for documentation with dummy values
   - Never use real-looking values in example files

3. **Before committing, always check:**
   - No hardcoded API keys or secrets
   - No accidental `.env` file commits
   - No logs containing sensitive data
   - No test files with real credentials

4. **Current security measures in place:**
   - `.env` files are properly gitignored
   - Django settings use `config()` for all sensitive values
   - AWS credentials are loaded conditionally
   - Lambda uses IAM roles, not hardcoded credentials

5. **When adding new features:**
   - Always use environment variables for configuration
   - Document required env vars in `.env.example` with fake values
   - Never log sensitive information
   - Sanitize error messages before displaying

---

When finishing writing code:
You do not need to push to github do not ask me.

When building components:
 always reference the tailwind.colors.js as the main source for the branding
 always use tailwind classes
 always try looking for existing components first

When building out API Services :
    always place them inside the services folder
    always use tn-models with zods
    always use tanstack

# LLM API Services Layer Instructions

Services

Always use tn-models with zods to create the api, model layers

With tn-models: 

Models/Shapes

- Uses pure zod shapes (not zod objects) as the main layer
- Use custom native enums (provide example)
- Filters only use: strings, numbers, arrays, boolean
- All Filters are optional by default

API

- typically the axios client already has the `api` prefix added to its route
- Use the main createApi to create the base api - typically this maps to the model `viewsets` on django
- Use `customCalls` to generate additional views such as actions
- `customCalls` are added at the end as `customCalls` and are called using the modifier `.csc`
- The base api class needs a base entity to be declared this will automatically be used for create, list and update methods
- a `remove` method already exists as well
- the `create` shape can also be customized
- the `update` method does not take a custom shape so there is no reason to define it

```tsx
// api.ts

import { createApi, createCustomServiceCall } from '@thinknimble/tn-models'
import { axiosInstance } from 'src/services/axios-instance'
import {
  agentTaskShape,
  createAgentTaskShape,
  agentTaskFilterShape,
} from './models'
import { z } from 'zod'
import { agentTaskExecutionShape } from '../agent-task-execution'

const executeNowCall = createCustomServiceCall({
  inputShape: z.string().uuid(),
  outputShape: agentTaskExecutionShape,
  cb: async ({ client, slashEndingBaseUri, input, utils: { fromApi } }) => {
    const response = await client.post(`${slashEndingBaseUri}${input}/execute_now/`)
    return fromApi(response.data)
  },
})

export const agentTaskApi = createApi({
  client: axiosInstance,
  baseUri: '/agents/tasks/',
  models: {
    entity: agentTaskShape,
    create: createAgentTaskShape,
    extraFilters: agentTaskFilterShape,
  },
  customCalls: {
    executeNow: executeNowCall,
  },
})

// models.ts

import { GetInferredFromRaw } from '@thinknimble/tn-models'
import { z } from 'zod'
import { agentInstanceShape } from '../agent-instance'

//custom native enums
export const sourceTypeEnum = {
  PUBLIC_URL: 'public_url',
  OUR_S3: 'our_s3',
  USER_S3: 'user_s3',
} as const

export type SourceTypeValues = (typeof sourceTypeEnum)[keyof typeof sourceTypeEnum]

export const sourceTypeLabelMap = {
  [sourceTypeEnum.PUBLIC_URL]: 'Public URL',
  [sourceTypeEnum.OUR_S3]: 'Our Storage',
  [sourceTypeEnum.USER_S3]: 'Your S3',
}

export const inputSourceShape = {
  url: z.string().url(),
  sourceType: z.nativeEnum(sourceTypeEnum),
  filename: z.string(), // Make filename required to match backend expectations
  size: z.number().optional(),
  contentType: z.string().optional(),
  // Document processing configuration
  skipPreprocessing: z.boolean().optional(),
  // Image processing options (when skipPreprocessing is false)
  preprocessImage: z.boolean().optional(),
  isDocumentWithText: z.boolean().optional(),
  replaceImagesWithDescriptions: z.boolean().optional(),
  // PDF processing options (when skipPreprocessing is false)
  containsImages: z.boolean().optional(),
  extractImagesAsText: z.boolean().optional(),
}

export const agentTaskShape = {
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional().nullable(),
  agentInstance: z.string().uuid(),
  agentInstanceRef: z.object(agentInstanceShape).optional().nullable(), // Expanded agent instance when included
  instruction: z.string(),
  variables: z.record(z.any()).optional(),

export const createAgentTaskShape = {
  name: agentTaskShape.name,
  description: agentTaskShape.description,
  agentInstance: agentTaskShape.agentInstance,
  instruction: agentTaskShape.instruction,
  variables: agentTaskShape.variables,
}

export const agentTaskFilterShape = {
  agentInstance: z.string(),
}

export type InputSource = GetInferredFromRaw<typeof inputSourceShape>
export type AgentTask = GetInferredFromRaw<typeof agentTaskShape>
export type CreateAgentTask = GetInferredFromRaw<typeof createAgentTaskShape>
export type AgentTaskFilter = GetInferredFromRaw<typeof agentTaskFilterShape>

export const presignedUrlRequestShape = {
  filename: z.string(),
  contentType: z.string().optional(),
}

```

Always use the `tn-forms` library to generate forms this library is also accompanied by the `tn-forms-react` to deal with some of the reactivity in react 

tn-forms

- declare a base type for the inputs to enable dot notation on the forms
- extend the base `Form` from `tn-forms`  that is typed by the base class
- declare the form fields using the `FormField` class and add `validators`

tn-forms-react

- Declare a wrapper function with the input types and form class in a provider
- Add a to the child function to get access to the form

```tsx
// forms.ts

import {
  Form,
  EmailValidator,
  FormField,
  IFormField,
  MinLengthValidator,
  RequiredValidator,
} from '@thinknimble/tn-forms'

export type AccountFormInputs = {
  firstName: IFormField<string>
  lastName: IFormField<string>
  email: IFormField<string>
  password: IFormField<string>
  confirmPassword: IFormField<string>
}

export class AccountForm extends Form<AccountFormInputs> {
  static firstName = FormField.create({
    label: 'First name',
    placeholder: 'First Name',
    type: 'text',
    validators: [new RequiredValidator({ message: 'Please enter your first' })],
    value: '',
  })

  static lastName = FormField.create({
    label: 'Last Name',
    placeholder: 'Last Name',
    type: 'text',
    validators: [new RequiredValidator({ message: 'Please enter your last name' })],
    value: '',
  })

  static email = FormField.create({
    label: 'Email',
    placeholder: 'Email',
    type: 'email',
    value: '',
    validators: [new EmailValidator({ message: 'Please enter a valid email' })],
  })

  static password = FormField.create({
    label: 'Password',
    placeholder: 'Password',
    type: 'password',

    validators: [
      new MinLengthValidator({
        minLength: 6,
        message: 'Please enter a password with a minimum of six characters',
      }),
    ],
    value: '',
  })

  static confirmPassword = FormField.create({
    label: 'Confirm Password',
    placeholder: 'Confirm Password',
    type: 'password',
    value: '',
    validators: [],
  })
}
export type TAccountForm = AccountForm & AccountFormInputs

// login.tsx

 
 export const logInInner() {
  // context
  const { createFormFieldChangeHandler, form } = useTnForm<TLoginForm>()
  return (
			  <>
				   <Input placeholder="Enter email..."
				     onChange={(e) => createFormFieldChangeHandler(form.email)(e.target.value)}
		         value={form.email.value ?? ''}
		         data-testid="email"
		         id="id"
		         label="Email address"
		         type="email"
		         autoComplete="email" />
			  </>
  
	  )
 
 }

export const LogIn = () => {
	// a wrapper 
  return (
    <FormProvider<LoginFormInputs> formClass={LoginForm}>
      <LogInInner />
    </FormProvider>
  )
}

```

Always use tanstack to build queries 

- use the api methods we create in api.ts
- use the pagination hook
- make filters optional/partials

```tsx
// queries.ts

import { queryOptions } from '@tanstack/react-query'
import { expenseApi } from './api'
import { ExpenseFilter } from './models'
import { Pagination } from '@thinknimble/tn-models'

export const expenseQueries = {
  all: () => ['expenses'],
  retrieve: (id: string) => {
    return queryOptions({
      queryKey: [...expenseQueries.all(), id],
      queryFn: () => expenseApi.retrieve(id),
      enabled: Boolean(id),
    })
  },
  list: ({
    filters,
    pagination,
    paginationCallback,
  }: {
    filters?: Partial<ExpenseFilter>
    pagination?: Pagination
    paginationCallback?: (pagination: Pagination) => void
  }) => {
    return queryOptions({
      queryKey: [...expenseQueries.all(), { filters, pagination }],
      queryFn: async () => {
        const res = await expenseApi.list({
          filters,
          pagination,
        })
        const serverPagination = new Pagination({ ...res, totalCount: res.count })
        paginationCallback?.(serverPagination)
        return res
      },
      enabled: true,
    })
  },

}

```



# Using the React Dropdown Select Component



Server provided data 

1. Data source for options
2. useMemo for casting to SeletOption 
3. Search ability 
4. Optional create new 

```tsx
export const SomeComponent(){
  const [selectedReport, setSelectedReport] = useState<SelectOption[]>([])
  const [newReportName, setNewReportName] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const { data: reports, isLoading } = useQuery(
      reportQueries.list({
        filters: { project: projectId, search: searchTerm },
        pagination: new Pagination(),
      }),
    )
  }

  return (

      <Select
                  options={reportOptions}
                  values={selectedReport}
                  onChange={(values) => setSelectedReport(values)}
                  placeholder="Select a report"
                  className="!bg-black text-left"
                  create={true}
                  createNewLabel="Create new report"
                  loading={isLoading}
                  searchFn={({ state }) => {
                    setSearchTerm(state.search)
                    return reportOptions
                  }}
                  onCreateNew={(item) => {
                    createReport({ name: item.label, project: projectId })
                  }}
                />
              
        )



```