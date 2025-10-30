import { ReactNode, useEffect } from 'react'
import { Button } from './button'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showCloseButton?: boolean
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  showCloseButton = true,
}: ModalProps) => {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className={`w-full ${sizeClasses[size]} relative transform overflow-hidden rounded-2xl bg-white p-6 text-left shadow-xl transition-all`}
          onClick={(e) => e.stopPropagation()}
        >
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between mb-4">
              {title && (
                <h3 className="text-lg font-medium leading-6 text-gray-900">
                  {title}
                </h3>
              )}
              {showCloseButton && (
                <button
                  type="button"
                  className="rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  onClick={onClose}
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )}

          <div className="mt-2">
            {children}
          </div>

          {footer && (
            <div className="mt-6 flex justify-end space-x-3">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface StepperModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  currentStep: number
  totalSteps: number
  children: ReactNode
  onPrevious?: () => void
  onNext?: () => void
  onSubmit?: () => void
  nextButtonText?: string
  submitButtonText?: string
  isNextDisabled?: boolean
  isSubmitDisabled?: boolean
  isLoading?: boolean
}

export const StepperModal = ({
  isOpen,
  onClose,
  title,
  currentStep,
  totalSteps,
  children,
  onPrevious,
  onNext,
  onSubmit,
  nextButtonText = 'Next',
  submitButtonText = 'Create Integration',
  isNextDisabled = false,
  isSubmitDisabled = false,
  isLoading = false,
}: StepperModalProps) => {
  const isLastStep = currentStep === totalSteps

  const footer = (
    <>
      <Button variant="secondary" onClick={onClose} disabled={isLoading}>
        Cancel
      </Button>
      {currentStep > 1 && onPrevious && (
        <Button variant="secondary" onClick={onPrevious} disabled={isLoading}>
          Previous
        </Button>
      )}
      {!isLastStep && onNext && (
        <Button onClick={onNext} disabled={isNextDisabled || isLoading}>
          {nextButtonText}
        </Button>
      )}
      {isLastStep && onSubmit && (
        <Button onClick={onSubmit} disabled={isSubmitDisabled || isLoading}>
          {isLoading ? 'Creating...' : submitButtonText}
        </Button>
      )}
    </>
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" footer={footer} showCloseButton={false}>
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
        
        {/* Step indicator */}
        <div className="flex items-center space-x-2">
          {Array.from({ length: totalSteps }, (_, i) => {
            const stepNumber = i + 1
            const isActive = stepNumber === currentStep
            const isCompleted = stepNumber < currentStep
            
            return (
              <div key={stepNumber} className="flex items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                    isCompleted
                      ? 'bg-primary text-white'
                      : isActive
                      ? 'bg-primary text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {isCompleted ? (
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    stepNumber
                  )}
                </div>
                {stepNumber < totalSteps && (
                  <div className={`h-0.5 w-8 ${isCompleted ? 'bg-primary' : 'bg-gray-200'}`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {children}
    </Modal>
  )
}