import { useState, useCallback, useEffect, useRef } from 'react'
import { Button } from './button'

export interface Variable {
  label: string
  value: string
  description?: string
  category?: string
}

interface VariableBindingProps {
  /** The text content that supports variable binding */
  value: string
  /** Callback when the text content changes */
  onChange: (value: string) => void
  /** Available variables for binding */
  variables: Variable[]
  /** Placeholder text */
  placeholder?: string
  /** Custom trigger pattern, defaults to '{{' */
  triggerPattern?: string
  /** Custom variable pattern, defaults to '{{variable}}' */
  variablePattern?: (variable: string) => string
  /** Whether to show categories in the dropdown */
  showCategories?: boolean
  /** Custom component for rendering the text input */
  children?: (props: {
    value: string
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
    onKeyDown: (e: React.KeyboardEvent) => void
    textareaRef: React.RefObject<HTMLTextAreaElement>
  }) => React.ReactNode
  /** Additional CSS classes */
  className?: string
}

export const VariableBinding = ({
  value,
  onChange,
  variables,
  placeholder = 'Type {{  to insert variables...',
  triggerPattern = '{{',
  variablePattern = (variable) => `{{${variable}}}`,
  showCategories = false,
  children,
  className = '',
}: VariableBindingProps) => {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [currentSearch, setCurrentSearch] = useState('')
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0)
  const [cursorPosition, setCursorPosition] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const bindingButtonRefs = useRef<HTMLButtonElement[]>([])

  // Filter variables based on search term
  const filteredVariables = variables.filter(
    (variable) =>
      variable.label.toLowerCase().includes(currentSearch.toLowerCase()) ||
      variable.value.toLowerCase().includes(currentSearch.toLowerCase()) ||
      (variable.description && variable.description.toLowerCase().includes(currentSearch.toLowerCase()))
  )

  // Group variables by category if needed
  const groupedVariables = showCategories
    ? filteredVariables.reduce((acc, variable) => {
        const category = variable.category || 'Other'
        if (!acc[category]) acc[category] = []
        acc[category].push(variable)
        return acc
      }, {} as Record<string, Variable[]>)
    : { All: filteredVariables }

  // Scroll selected suggestion into view
  useEffect(() => {
    if (showSuggestions && bindingButtonRefs.current[selectedSuggestionIndex]) {
      bindingButtonRefs.current[selectedSuggestionIndex].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    }
  }, [selectedSuggestionIndex, showSuggestions])

  // Handle text changes and detect trigger pattern
  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value
      const cursorPos = e.target.selectionStart || 0
      
      onChange(newValue)
      setCursorPosition(cursorPos)

      // Check for trigger pattern at cursor position
      const textBeforeCursor = newValue.slice(0, cursorPos)
      const lastTriggerIndex = textBeforeCursor.lastIndexOf(triggerPattern)

      if (lastTriggerIndex !== -1) {
        const searchTerm = textBeforeCursor.slice(lastTriggerIndex + triggerPattern.length)
        
        // Check if we're still in a potential variable binding
        if (!searchTerm.includes('}') && !searchTerm.includes('\n')) {
          setShowSuggestions(true)
          setCurrentSearch(searchTerm)
          setSelectedSuggestionIndex(0)
        } else {
          setShowSuggestions(false)
        }
      } else {
        setShowSuggestions(false)
      }
    },
    [onChange, triggerPattern]
  )

  // Insert variable at current cursor position
  const insertVariable = useCallback(
    (variable: Variable) => {
      if (!textareaRef.current) return

      const textarea = textareaRef.current
      const textBeforeCursor = value.slice(0, cursorPosition)
      const textAfterCursor = value.slice(cursorPosition)
      
      // Find the trigger pattern before cursor
      const lastTriggerIndex = textBeforeCursor.lastIndexOf(triggerPattern)
      
      if (lastTriggerIndex !== -1) {
        const beforeTrigger = value.slice(0, lastTriggerIndex)
        const variableText = variablePattern(variable.value)
        const newValue = beforeTrigger + variableText + textAfterCursor
        const newCursorPos = beforeTrigger.length + variableText.length

        onChange(newValue)
        
        // Set cursor position after the inserted variable
        setTimeout(() => {
          textarea.focus()
          textarea.setSelectionRange(newCursorPos, newCursorPos)
        }, 0)
      }

      setShowSuggestions(false)
      setCurrentSearch('')
    },
    [value, cursorPosition, triggerPattern, variablePattern, onChange]
  )

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showSuggestions) return

      if (e.key === 'Escape') {
        e.preventDefault()
        setShowSuggestions(false)
        setCurrentSearch('')
        setSelectedSuggestionIndex(0)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedSuggestionIndex((prev) =>
          prev < filteredVariables.length - 1 ? prev + 1 : 0
        )
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedSuggestionIndex((prev) =>
          prev > 0 ? prev - 1 : filteredVariables.length - 1
        )
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        if (filteredVariables[selectedSuggestionIndex]) {
          insertVariable(filteredVariables[selectedSuggestionIndex])
        }
      }
    },
    [showSuggestions, selectedSuggestionIndex, filteredVariables, insertVariable]
  )

  // Default textarea component
  const defaultTextarea = (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={handleTextChange}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={`w-full min-h-[120px] p-3 border border-gray-200 rounded-lg resize-vertical font-mono text-sm placeholder-gray-400 focus:border-primary-500 focus:outline-none ${className}`}
    />
  )

  return (
    <div className="relative">
      {children
        ? children({
            value,
            onChange: handleTextChange,
            onKeyDown: handleKeyDown,
            textareaRef,
          })
        : defaultTextarea}

      {/* Variables dropdown */}
      {showSuggestions && Object.keys(groupedVariables).length > 0 && (
        <div className="absolute z-50 mt-1 max-h-60 w-full min-w-[300px] overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {Object.entries(groupedVariables).map(([category, categoryVariables]) => (
            <div key={category}>
              {showCategories && Object.keys(groupedVariables).length > 1 && (
                <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  {category}
                </div>
              )}
              {categoryVariables.map((variable, index) => {
                const globalIndex = filteredVariables.indexOf(variable)
                return (
                  <Button
                    key={`${category}-${index}`}
                    ref={(el) => {
                      if (el && globalIndex !== -1) {
                        bindingButtonRefs.current[globalIndex] = el
                      }
                    }}
                    onClick={() => insertVariable(variable)}
                    variant="ghost"
                    className={`w-full justify-start rounded-none border-b border-gray-100 px-3 py-2 text-left last:border-b-0 ${
                      globalIndex === selectedSuggestionIndex
                        ? 'bg-primary-50 border-primary-200'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{variable.label}</div>
                      <div className="text-xs text-gray-500 font-mono">
                        {variablePattern(variable.value)}
                      </div>
                      {variable.description && (
                        <div className="text-xs text-gray-400 mt-1">{variable.description}</div>
                      )}
                    </div>
                  </Button>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {showSuggestions && filteredVariables.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
          <div className="text-sm text-gray-500">No matching variables found</div>
        </div>
      )}
    </div>
  )
}

export default VariableBinding