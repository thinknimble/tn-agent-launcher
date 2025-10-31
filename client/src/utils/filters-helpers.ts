//
// filters-helpers.ts

type SelectOption<T> = {
  label: string
  value: T
}

// Mapped type to convert filter properties for UI state management.
export type UiFilterState<T> = {
  [K in keyof T]: T[K] extends string | undefined | null
    ? SelectOption<string>[]
    : T[K] extends string[] | undefined | null
      ? SelectOption<string>[]
      : T[K] extends boolean | undefined | null
        ? SelectOption<string>[]
        : T[K]
}

// Helper to create the initial UI state.
export function createInitialUiState<T extends object>(
  initialValues: Partial<T>,
): UiFilterState<Partial<T>> {
  const uiState = {} as UiFilterState<Partial<T>>
  for (const key in initialValues) {
    const initialValue = initialValues[key as keyof T]
    if (typeof initialValue === 'boolean' && initialValue === true) {
      // For a boolean `true`, we create an array with a single representative option.
      uiState[key as keyof T] = [{ label: String(key), value: 'true' }] as any
    } else {
      // For booleans that are false, strings, or arrays, initialize as an empty array.
      uiState[key as keyof T] = [] as any
    }
  }
  return uiState
}

export function convertSingleUiFilterToApi<T extends object, K extends keyof T>(
  uiValue: UiFilterState<Partial<T>>[K],
  initialValue: Partial<T>[K],
) {
  if (Array.isArray(uiValue)) {
    if (typeof initialValue === 'boolean') {
      // Boolean filter: API needs a boolean. Presence of items means `true`.
      return uiValue.length > 0
    }
    if (Array.isArray(initialValue)) {
      // Multi-select: T[K] is string[], so API needs string[]
      return (uiValue as SelectOption<string>[]).map((opt) => opt.value) as any
    } else {
      // Single-select: T[K] is string, so API needs a single string or undefined
      return uiValue.length > 0 ? (uiValue[0] as SelectOption<string>).value : undefined
    }
  }
  // This case should not be reached if all UI filters are SelectOption[]
  return uiValue as any
}

// Helper function to convert all UI filters to API format
export function convertUiFiltersToApi<T extends object>(
  uiFilters: UiFilterState<Partial<T>>,
  initialValues: Partial<T>,
): Partial<T> {
  const apiFilters = {} as Partial<T>

  for (const key in uiFilters) {
    const uiValue = uiFilters[key as keyof T]
    const initialValue = initialValues[key as keyof T]
    const convertedValue = convertSingleUiFilterToApi(uiValue, initialValue)

    // Only include non-empty/non-false values in the API request
    if (
      convertedValue !== undefined &&
      convertedValue !== false &&
      (!Array.isArray(convertedValue) || convertedValue.length > 0)
    ) {
      apiFilters[key as keyof T] = convertedValue
    }
  }

  return apiFilters
}

export type { SelectOption }
