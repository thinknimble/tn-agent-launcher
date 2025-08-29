import { describe, it, expect, vi } from 'vitest'
import { render, screen } from 'src/test-utils'
import { PromptBuilder } from './prompt-builder'
import userEvent from '@testing-library/user-event'

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  Link: ({ children, to, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

describe('PromptBuilder', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
    placeholder: 'Enter your prompt...',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders basic component structure', () => {
    render(<PromptBuilder {...defaultProps} />)

    expect(screen.getByText('System Prompt')).toBeInTheDocument()
    expect(
      screen.getByText('Create better agent prompts with systematic design principles'),
    ).toBeInTheDocument()
    expect(screen.getByText('Improve Prompt')).toBeInTheDocument()
    expect(screen.getByText('Our stance on prompts')).toBeInTheDocument()
  })

  it('displays current value in the preview area', () => {
    const testValue = 'Test system prompt content'
    render(<PromptBuilder {...defaultProps} value={testValue} />)

    expect(screen.getByText(testValue)).toBeInTheDocument()
  })

  it('shows default text when no value provided', () => {
    render(<PromptBuilder {...defaultProps} />)

    expect(screen.getByText('Your system prompt will appear here...')).toBeInTheDocument()
  })

  it('renders simple textarea when improve prompt is not active', () => {
    render(<PromptBuilder {...defaultProps} />)

    const textarea = screen.getByPlaceholderText('Enter your prompt...')
    expect(textarea).toBeInTheDocument()
    expect(textarea).toHaveAttribute('placeholder', 'Enter your prompt...')
  })

  it('calls onChange when typing in simple textarea', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<PromptBuilder value="" onChange={onChange} />)

    const textareas = screen.getAllByRole('textbox')
    const simpleTextarea = textareas.find(
      (ta) => ta.getAttribute('placeholder') === 'Enter the system prompt for this agent...',
    )
    expect(simpleTextarea).toBeTruthy()

    await user.type(simpleTextarea!, 'Test')

    // userEvent.type calls onChange for each character typed
    expect(onChange).toHaveBeenCalled()
    // Check that onChange was called with each character building up to "Test"
    expect(onChange).toHaveBeenLastCalledWith('Test')
  })

  it('toggles improve prompt mode when button clicked', async () => {
    const user = userEvent.setup()
    render(<PromptBuilder {...defaultProps} />)

    const improveButton = screen.getByText('Improve Prompt')
    expect(screen.queryByText('Select principles to apply:')).not.toBeInTheDocument()

    await user.click(improveButton)

    expect(screen.getByText('Select principles to apply:')).toBeInTheDocument()
    expect(improveButton).toHaveClass('border-neutral-900', 'bg-neutral-900', 'text-white')
  })

  it('displays all 6 stance options when improve prompt is active', async () => {
    const user = userEvent.setup()
    render(<PromptBuilder {...defaultProps} />)

    await user.click(screen.getByText('Improve Prompt'))

    expect(screen.getByText('1. Tools Before Thinking')).toBeInTheDocument()
    expect(screen.getByText('2. Document Your Process')).toBeInTheDocument()
    expect(screen.getByText("3. Show, Don't Explain")).toBeInTheDocument()
    expect(screen.getByText('4. Make Patterns Visible')).toBeInTheDocument()
    expect(screen.getByText("5. Grade, Don't Generate")).toBeInTheDocument()
    expect(screen.getByText('6. Design the Organization')).toBeInTheDocument()
  })

  it('shows stance sections when stances are selected', async () => {
    const user = userEvent.setup()
    render(<PromptBuilder {...defaultProps} />)

    await user.click(screen.getByText('Improve Prompt'))

    const toolsCheckbox = screen.getByLabelText(/Tools Before Thinking/)
    await user.click(toolsCheckbox)

    expect(screen.getByText('Tools Before Thinking')).toBeInTheDocument()
    expect(screen.getByText('Suggested: 3-5 sentences')).toBeInTheDocument()
    expect(screen.getByText('Show tips')).toBeInTheDocument()
  })

  it('toggles helper text when show tips is clicked', async () => {
    const user = userEvent.setup()
    render(<PromptBuilder {...defaultProps} />)

    await user.click(screen.getByText('Improve Prompt'))

    const toolsCheckbox = screen.getByLabelText(/Tools Before Thinking/)
    await user.click(toolsCheckbox)

    const showTipsButton = screen.getByText('Show tips')
    await user.click(showTipsButton)

    expect(screen.getByText('Start with Your Inputs and Outputs')).toBeInTheDocument()
    expect(screen.getByText('Identify Tool vs Taste Tasks')).toBeInTheDocument()
    expect(screen.getByText('Hide tips')).toBeInTheDocument()
  })

  it('updates stance content when typing in stance textarea', async () => {
    const user = userEvent.setup()
    render(<PromptBuilder {...defaultProps} />)

    await user.click(screen.getByText('Improve Prompt'))

    const toolsCheckbox = screen.getByLabelText(/Tools Before Thinking/)
    await user.click(toolsCheckbox)

    const textarea = screen.getByPlaceholderText(
      'Define your inputs, outputs, and which tasks can be handled by tools...',
    )
    await user.type(textarea, 'Test stance content')

    expect(textarea).toHaveValue('Test stance content')
  })

  it('generates combined prompt from selected stances', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<PromptBuilder {...defaultProps} onChange={onChange} />)

    await user.click(screen.getByText('Improve Prompt'))

    // Select first stance
    const toolsCheckbox = screen.getByLabelText(/Tools Before Thinking/)
    await user.click(toolsCheckbox)

    // Add content to first stance
    const textarea1 = screen.getByPlaceholderText(
      'Define your inputs, outputs, and which tasks can be handled by tools...',
    )
    await user.type(textarea1, 'First stance content')

    // Select second stance
    const processCheckbox = screen.getByLabelText(/Document Your Process/)
    await user.click(processCheckbox)

    // Add content to second stance
    const textarea2 = screen.getByPlaceholderText(
      'Document each step of your process and specify the exact structure...',
    )
    await user.type(textarea2, 'Second stance content')

    // Generate prompt
    const generateButton = screen.getByText('Generate Prompt')
    await user.click(generateButton)

    expect(onChange).toHaveBeenCalledWith('First stance content\n\n---\n\nSecond stance content')
  })

  it('clears all content when clear button clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<PromptBuilder {...defaultProps} onChange={onChange} />)

    await user.click(screen.getByText('Improve Prompt'))

    // Select and fill a stance
    const toolsCheckbox = screen.getByLabelText(/Tools Before Thinking/)
    await user.click(toolsCheckbox)

    const textarea = screen.getByPlaceholderText(
      'Define your inputs, outputs, and which tasks can be handled by tools...',
    )
    await user.type(textarea, 'Test content')

    // Clear everything
    const clearButton = screen.getByText('Clear')
    await user.click(clearButton)

    expect(toolsCheckbox).not.toBeChecked()
    expect(onChange).toHaveBeenCalledWith('')
    expect(screen.queryByText('Tools Before Thinking')).not.toBeInTheDocument() // Section should be hidden
  })

  it('shows action buttons only when stances are selected or improve prompt is active', async () => {
    const user = userEvent.setup()
    render(<PromptBuilder {...defaultProps} />)

    // Initially no action buttons
    expect(screen.queryByText('Clear')).not.toBeInTheDocument()
    expect(screen.queryByText('Generate Prompt')).not.toBeInTheDocument()

    // Activate improve prompt - now buttons should appear because isImprovePromptActive is true
    await user.click(screen.getByText('Improve Prompt'))

    expect(screen.getByText('Clear')).toBeInTheDocument()
    expect(screen.getByText('Generate Prompt')).toBeInTheDocument()

    // Deactivate improve prompt
    await user.click(screen.getByText('Improve Prompt'))

    // Action buttons should be gone
    expect(screen.queryByText('Clear')).not.toBeInTheDocument()
    expect(screen.queryByText('Generate Prompt')).not.toBeInTheDocument()

    // Reactivate and select a stance
    await user.click(screen.getByText('Improve Prompt'))
    const toolsCheckbox = screen.getByLabelText(/Tools Before Thinking/)
    await user.click(toolsCheckbox)

    // Action buttons should still be visible
    expect(screen.getByText('Clear')).toBeInTheDocument()
    expect(screen.getByText('Generate Prompt')).toBeInTheDocument()
  })

  it('removes stance section when unchecking a selected stance', async () => {
    const user = userEvent.setup()
    render(<PromptBuilder {...defaultProps} />)

    await user.click(screen.getByText('Improve Prompt'))

    // Select stance
    const toolsCheckbox = screen.getByLabelText(/Tools Before Thinking/)
    await user.click(toolsCheckbox)

    expect(screen.getByText('Tools Before Thinking')).toBeInTheDocument()

    // Unselect stance
    await user.click(toolsCheckbox)

    expect(screen.queryByText('Suggested: 3-5 sentences')).not.toBeInTheDocument()
  })

  it('maintains correct section numbering when multiple stances selected', async () => {
    const user = userEvent.setup()
    render(<PromptBuilder {...defaultProps} />)

    await user.click(screen.getByText('Improve Prompt'))

    // Select first and third stance (skip second)
    const toolsCheckbox = screen.getByLabelText(/Tools Before Thinking/)
    await user.click(toolsCheckbox)

    const showCheckbox = screen.getByLabelText(/Show, Don't Explain/)
    await user.click(showCheckbox)

    // Check that sections are numbered 1 and 2 (not 1 and 3)
    const sections = screen.getAllByText(/^\d+$/)
    expect(sections).toHaveLength(2)
    expect(sections[0]).toHaveTextContent('1')
    expect(sections[1]).toHaveTextContent('2')
  })

  it('links to prompt stance page', () => {
    render(<PromptBuilder {...defaultProps} />)

    const link = screen.getByText('Our stance on prompts').closest('a')
    expect(link).toHaveAttribute('href', '/prompt-stance')
  })

  it('shows help description text when not in improve mode', () => {
    render(<PromptBuilder {...defaultProps} />)

    expect(
      screen.getByText('Define the behavior and personality of your AI agent'),
    ).toBeInTheDocument()
  })

  it('hides help description text when in improve mode', async () => {
    const user = userEvent.setup()
    render(<PromptBuilder {...defaultProps} />)

    await user.click(screen.getByText('Improve Prompt'))

    expect(
      screen.queryByText('Define the behavior and personality of your AI agent'),
    ).not.toBeInTheDocument()
  })
})
