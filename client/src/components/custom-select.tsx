import React from 'react'
import Select from 'react-dropdown-select'
import { SelectOption } from '../services/base-model'
import { cn } from '../utils/style'
import { Input } from './input'
import { Button } from './button'

// Get the props type from the Select component and extend it
type SelectProps = React.ComponentProps<typeof Select<SelectOption>>

interface CustomSelectProps extends Omit<SelectProps, 'labelField' | 'valueField'> {
  options: SelectOption[]
  values: SelectOption[]
  onChange: (values: SelectOption[]) => void
  className?: string
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  options,
  values,
  onChange,
  className,
  dropdownHeight = '200px',
  contentRenderer,
  searchable = false,
  ...props
}) => {
  // Match the regular Input component styles exactly
  const inputStyleClasses =
    '!w-full !rounded-md !border !border-gray-300 !bg-white !p-0 !text-black placeholder:!font-thin placeholder:!text-slate-500 !outline-none focus:!outline-none focus-visible:!outline-none focus-visible:!ring-2 focus-visible:!ring-slate-300 invalid:!outline-none invalid:!ring-2 invalid:!ring-red-400 disabled:!cursor-not-allowed disabled:!opacity-50'
  // Default content renderer with floating label effect
  const defaultContentRenderer = ({ props: rendererProps, state, methods }: any) => {
    const hasValues = rendererProps.values && rendererProps.values.length > 0
    const isSearchable = rendererProps.searchable
    const isDropdownOpen = state.dropdown
    const shouldFloat = isSearchable && isDropdownOpen && hasValues

    return (
      <div
        className={cn(
          'relative min-h-9 w-full',
          shouldFloat ? 'overflow-visible' : 'overflow-hidden',
        )}
      >
        {/* Input area */}
        <div
          className={`flex min-h-9 w-full items-center ${
            isSearchable && isDropdownOpen ? '' : hasValues ? 'px-2' : 'px-2'
          }`}
        >
          {isSearchable && isDropdownOpen ? (
            <Input
              autoFocus
              value={state.search}
              onChange={(value) => methods.setSearch(value)}
              onKeyDown={(e) => {
                // Allow typing and prevent dropdown from closing
                e.stopPropagation()
              }}
              placeholder={hasValues ? 'Search...' : rendererProps.placeholder}
              className="!focus:ring-0 !focus:border-0 !border-0 !p-0 !ring-0"
            />
          ) : !hasValues ? (
            <span className="text-sm text-slate-500">{rendererProps.placeholder}</span>
          ) : null}
        </div>

        {/* Floating selected values - overlays when closed, floats up when open */}
        {hasValues && (
          <div
            className={`absolute left-0 right-0 flex items-center transition-all duration-300 ease-out ${
              shouldFloat
                ? '-top-full z-[50] mb-1 bg-transparent opacity-100 shadow-lg'
                : 'bottom-0 top-0 bg-transparent opacity-100'
            }`}
          >
            <div
              className={`max-h-20 overflow-y-auto transition-all duration-300 ${
                shouldFloat ? 'p-2' : 'p-2'
              }`}
            >
              <div className="flex gap-1 overflow-x-scroll">
                {rendererProps.values.map((value: any, index: number) => (
                  <span
                    key={index}
                    className="inline-flex max-w-32 flex-shrink-0 items-center overflow-hidden rounded-full bg-accent text-xs text-white"
                  >
                    <span className="truncate px-3 py-1">{value.label}</span>
                    {rendererProps.clearable && !rendererProps.disabled && (
                      <>
                        <div className="h-4 w-px bg-white/30" />
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            methods.removeItem(e, value, false)
                          }}
                          className="h-full rounded-none px-2 py-1 text-white hover:bg-white/10 hover:text-white/80"
                        >
                          ×
                        </Button>
                      </>
                    )}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }
  React.useEffect(() => {
    // Inject CSS styles for react-dropdown-select
    const styleId = 'custom-select-styles'
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = `
        /* Force border override for react-dropdown-select to match Input component */
        .custom-select-wrapper .react-dropdown-select {
          border: 1px solid #d1d5db !important;
          font-family: inherit !important;
        }

        /* Dropdown styling */
        .custom-select-wrapper .react-dropdown-select-dropdown {
          position: absolute;
          left: 0;
          border: 1px solid #d1d5db;
          width: 100%;
          padding: 0;
          display: flex;
          flex-direction: column;
          border-radius: 0.375rem;
          max-height: ${dropdownHeight};
          overflow: auto;
          z-index: 50 !important;
          background: white;
          box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
          color: #2b2d2e;
          margin-top: 0.25rem;
          font-family: inherit;
        }

        .custom-select-wrapper .react-dropdown-select-dropdown:focus,
        .custom-select-wrapper .react-dropdown-select-dropdown:focus-visible {
          outline: none !important;
        }

        .custom-select-wrapper .react-dropdown-select-item {
          color: #2b2d2e;
          border-bottom: 1px solid #e5e7eb;
          padding: 0.5rem 0.75rem;
          cursor: pointer;
          transition: all 150ms;
          font-size: 0.875rem;
          background: white;
        }

        .custom-select-wrapper .react-dropdown-select-item:hover {
          background: #f9fafb;
          color: #2b2d2e;
        }

        .custom-select-wrapper .react-dropdown-select-item.react-dropdown-select-item-selected,
        .custom-select-wrapper .react-dropdown-select-item.react-dropdown-select-item-active {
          background: #d93a00;
          color: white;
          font-weight: 500;
        }

        .custom-select-wrapper .react-dropdown-select-item.react-dropdown-select-item-disabled {
          background: #f3f4f6;
          color: #9ca3af;
          cursor: not-allowed;
          opacity: 0.5;
        }

        /* Clear/dropdown handle styling */
        .custom-select-wrapper .react-dropdown-select-clear,
        .custom-select-wrapper .react-dropdown-select-dropdown-handle {
          color: #6b7280;
          transition: color 150ms;
        }

        .custom-select-wrapper .react-dropdown-select-clear:hover,
        .custom-select-wrapper .react-dropdown-select-dropdown-handle:hover {
          color: #2b2d2e;
        }

        /* Content area styling */
        .custom-select-wrapper .react-dropdown-select-content {
          padding: 0;
        }

        /* Hide default selected items display since we handle it in contentRenderer */
        .custom-select-wrapper .react-dropdown-select-item-label {
          display: none;
        }

        /* Scrollbar styling for dropdown */
        .custom-select-wrapper .react-dropdown-select-dropdown::-webkit-scrollbar {
          width: 6px;
        }

        .custom-select-wrapper .react-dropdown-select-dropdown::-webkit-scrollbar-track {
          background: white;
        }

        .custom-select-wrapper .react-dropdown-select-dropdown::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 0.25rem;
        }

        .custom-select-wrapper .react-dropdown-select-dropdown::-webkit-scrollbar-thumb:hover {
          background: #d93a00;
        }
      `
      document.head.appendChild(style)
    }
  }, [dropdownHeight])

  return (
    <div className="custom-select-wrapper">
      <Select<SelectOption>
        options={options}
        values={values}
        onChange={onChange}
        labelField="label"
        valueField="value"
        dropdownHeight={dropdownHeight}
        contentRenderer={contentRenderer || defaultContentRenderer}
        className={cn('custom-select', inputStyleClasses, className)}
        {...props}
      />
    </div>
  )
}
