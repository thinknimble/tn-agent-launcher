When finishing writing code:
You do not need to push to github do not ask me.

When building components:
 always reference the tailwind.colors.js as the main source for the branding
 always use tailwind classes
When building out API Services :
    always place them inside the services folder
    always use tn-models with zods
    always use tanstack







# TN-Models-FP Package Understanding Prompt

You are working with the `@thinknimble/tn-models` package, a functional programming approach to API management with TypeScript that uses Zod for schema validation and type inference.

## Key Concepts

### 1. **Core Philosophy**
- Functional paradigm instead of classes to avoid TypeScript type issues
- Prevents runtime field obfuscation by validating API responses against declared models
- Uses Zod schemas for both compile-time types and runtime validation
- Handles automatic camelCase ↔ snake_case conversion between frontend and API

### 2. **Main Components**

#### **createApi** - The primary function
```typescript
const api = createApi({
  client: axios.create(),           // Axios instance
  baseUri: "api/users/",           // Base endpoint URL
  models: {
    entity: userEntityShape,        // Main resource shape (enables built-in methods)
    create: createUserShape,        // Optional: custom creation input shape
  },
  customCalls: {                   // Optional: additional API methods
    login: loginCall,
    customUpdate: updateCall,
  }
})

Zod Shapes** (not schemas)
- Use raw Zod shapes (objects with Zod validators) instead of `z.object()`
- Allows key manipulation for case conversion
- Mark fields as readonly with `.readonly()` to exclude from create/update

```typescript
const userShape = {
  id: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
  fullName: z.string().readonly(),  // Excluded from create/update
}
```

#### **Built-in Methods** (when `entity` model is provided)
- `api.create()` - POST to create resource
- `api.retrieve(id)` - GET single resource by ID
- `api.list({ pagination })` - GET paginated list
- `api.update()` - PATCH/PUT to update resource

#### **Custom Service Calls**
```typescript
const customCall = createCustomServiceCall({
  inputShape: inputShape,
  outputShape: outputShape,
  filtersShape: filtersShape,      // Optional: for query parameters
  cb: async ({ client, slashEndingBaseUri, input, utils: { toApi, fromApi } }) => {
    // Your custom API logic here
    const response = await client.post(`${slashEndingBaseUri}custom/`, toApi(input))
    return fromApi(response.data)
  }
})
```

### 3. **Utilities**

#### **Type Inference**
```typescript
type User = GetInferredFromRaw<typeof userShape>
```

#### **Case Conversion**
- `toApi(data)` - Converts camelCase to snake_case for API requests
- `fromApi(data)` - Converts snake_case to camelCase for client use

#### **Pagination**
```typescript
const pagination = new Pagination({ page: 1, size: 20 })
```

### 4. **Usage Patterns**

#### **Basic CRUD**
```typescript
// Create
const newUser = await api.create({ firstName: "John", lastName: "Doe" })

// Read
const user = await api.retrieve("user-id")
const users = await api.list({ pagination: new Pagination() })

// Update
const updated = await api.update({ id: "user-id", firstName: "Jane" })
```

#### **Custom Calls**
```typescript
const loginResult = await api.csc.login({ email: "user@example.com", password: "password" })
// or
const loginResult = await api.customCalls.login({ email: "user@example.com", password: "password" })
```

### 5. **Integration with React Query**
```typescript
const { data: users } = useQuery({
  queryKey: ['users', pagination],
  queryFn: () => api.list({ pagination })
})

const { mutateAsync: createUser } = useMutation({
  mutationFn: api.create
})
```

## When helping with this package:
1. Always use Zod shapes (raw objects) instead of `z.object()` schemas
2. Remember automatic case conversion between camelCase and snake_case
3. Built-in methods are only available when `entity` model is declared
4. Custom calls require `createCustomServiceCall` for type safety
5. The `utils` object provides `toApi` and `fromApi` for case conversion
6. Readonly fields are automatically excluded from create/update operations

This package prioritizes type safety, functional programming principles, and seamless API integration with automatic data transformation.


When using tn-models and zods for enums you should use this syntax

export const connectionStatusKeyEnum = {
  pending: 0,
} as const

export type ConnectionStatusKeyValues =
  (typeof connectionStatusKeyEnum)[keyof typeof connectionStatusKeyEnum]

export const connectionStatusLabelMap = {
  [connectionStatusKeyEnum.pending]: 'Pending',
  [connectionStatusKeyEnum.accepted]: 'Accepted',
}


export const someModel = {
 connectionStatus: z.nativeEnum(connectionStatusKeyEnum)
}

# TN-FORMS
TN Forms Library Reference**

You are working with the TN Forms library (@thinknimble/tn-forms), a TypeScript form management library designed for consistent form creation in web applications.

## Core Concepts

**Form Structure:**
- Forms extend the base `Form<T>` class where T is the form inputs type
- Form inputs are defined as interfaces with `IFormField<Type>` properties
- Static properties on form classes define the actual form fields
- Union types enable dot notation access to fields

**Basic Pattern:**
```typescript
// 1. Define form inputs type
type LoginFormInputs = {
  email: IFormField<string>
  password: IFormField<string>
}

// 2. Create form class
class LoginForm extends Form<LoginFormInputs> {
  static email = FormField.create({
    validators: [new EmailValidator()]
  })
  static password = FormField.create({
    validators: [new RequiredValidator()]
  })
}

// 3. Create union type for dot notation
type TLoginForm = LoginFormInputs & LoginForm

// 4. Create instance and cast to union type
const form = new LoginForm() as TLoginForm
```

## Key Components

**FormField:** Individual form inputs with validation
- `value` - current field value
- `validators` - array of validator instances
- `isValid` - boolean validity check
- `validate()` - trigger validation
- `errors` - validation error messages

**FormArray:** Collections of sub-forms for dynamic content
- `groups` - array of form instances
- Used for repeatable form sections

**Validators:** Built-in validation rules
- `RequiredValidator()` - field is required
- `EmailValidator()` - valid email format
- `MinLengthValidator({minLength: n})` - minimum length
- `MaxLengthValidator({maxLength: n})` - maximum length
- `PatternValidator({pattern: regex})` - regex pattern matching
- `UrlValidator()` - valid URL format
- `MustMatchValidator({matcher: 'fieldName'})` - cross-field validation
- `MinDateValidator({min: date})` - minimum date
- `MaxDateValidator({max: date})` - maximum date

## Common Operations

**Form Usage:**
```typescript
const form = new MyForm()
form.validate() // validate entire form
form.isValid // check if form is valid
form.value // get form values as object
form.addFormLevelValidator('fieldName', validator) // add dynamic validator
```

**Field Usage:**
```typescript
const field = new FormField({
  value: 'initial',
  validators: [new RequiredValidator()],
  name: 'fieldName'
})
field.validate()
field.isValid
field.errors
```

## Advanced Features

**Cross-field Validation:**
Use `dynamicFormValidators` static property for field dependencies:
```typescript
static dynamicFormValidators = {
  confirmPassword: [new MustMatchValidator({ matcher: 'password' })]
}
```

**Custom Validators:**
Extend the `Validator` class:
```typescript
class MyValidator extends Validator {
  constructor({ message = 'Custom error', code = 'custom' } = {}) {
    super({ message, code })
  }

  call(value: any) {
    if (/* validation logic */) {
      throw new Error(JSON.stringify({ code: this.code, message: this.message }))
    }
  }
}

When working with TN Forms:
1. Always define TypeScript interfaces for form inputs
2. Use static properties to define form fields
3. Remember to call `validate()` before checking `isValid`
4. Use union types for better developer experience
5. Leverage built-in validators before creating custom ones

---

React Integration

**Why React Integration is Needed:**
React's state depends on referential equality, not deep equality. TN Forms classes don't work as React state out of the box, so the React integration provides utilities to handle this properly.

**Core React Utils:**

### FormProvider
Context provider that allows using TN Forms as React state:

```typescript
return (
  <FormProvider<TLoginFormInputs> formClass={LoginForm}>
    <MyFormComponent />
  </FormProvider>
)
```

### useTnForm Hook
Hook to consume form state within FormProvider descendants:

```typescript
const MyFormComponent = () => {
  const {
    form,
    createFormFieldChangeHandler,
    overrideForm,
    setFields,
    validate,
  } = useTnForm<TLoginForm>();

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    createFormFieldChangeHandler(form.email)(e.target.value)
  }

  return (
    <div>
      <input
        value={form.email.value}
        onChange={handleEmailChange}
      />
      {/* For custom components that expect (value: string) => void */}
      <CustomInput
        value={form.password.value}
        onChange={createFormFieldChangeHandler(form.password)}
      />
    </div>
  )
}
```

**Important React Patterns:**

1. **Type Safety:** Always provide the union type to `useTnForm<TFormType>` for proper typing
2. **Immutability:** Only modify form state through `createFormFieldChangeHandler` - never mutate form directly
3. **Event Handling:** `createFormFieldChangeHandler` returns `(v: T) => void`, not a React event handler
4. **State Management:** The hook manages React re-renders automatically when form state changes


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