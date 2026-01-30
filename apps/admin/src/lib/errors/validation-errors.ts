/**
 * Standard validation error types for schema operations
 */

export type ValidationErrorCode =
  | 'DUPLICATE_KEY'
  | 'NOT_FOUND'
  | 'INVALID_INDEX'
  | 'EMPTY_VALUE'
  | 'CUSTOM'

export interface ValidationError {
  readonly code: ValidationErrorCode
  readonly field?: string
  readonly message: string
}

/**
 * Creates a duplicate key error
 */
export function duplicate(field: string, key: string): ValidationError {
  return {
    code: 'DUPLICATE_KEY',
    field,
    message: `A field with key "${key}" already exists`,
  }
}

/**
 * Creates a not found error
 */
export function notFound(field: string, key: string): ValidationError {
  return {
    code: 'NOT_FOUND',
    field,
    message: `Field "${key}" not found`,
  }
}

/**
 * Creates an invalid index error
 */
export function invalidIndex(index: number, length: number): ValidationError {
  return {
    code: 'INVALID_INDEX',
    message: `Index ${index} is out of bounds (0-${length - 1})`,
  }
}

/**
 * Creates an empty value error
 */
export function emptyValue(field: string): ValidationError {
  return {
    code: 'EMPTY_VALUE',
    field,
    message: `${field} cannot be empty`,
  }
}

/**
 * Creates a custom validation error
 */
export function custom(message: string, field?: string): ValidationError {
  return {
    code: 'CUSTOM',
    field,
    message,
  }
}
