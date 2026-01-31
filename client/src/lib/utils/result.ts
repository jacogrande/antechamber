/**
 * Result type for railway-oriented programming
 *
 * This module implements a functional Result<T, E> type that represents
 * either success (Ok) or failure (Err). This allows for explicit error
 * handling without throwing exceptions, keeping the functional core pure.
 *
 * @example
 * ```typescript
 * const divide = (a: number, b: number): Result<number, string> => {
 *   if (b === 0) return err('Division by zero');
 *   return ok(a / b);
 * };
 *
 * const result = divide(10, 2);
 * if (result.isOk) {
 *   console.log(result.value); // 5
 * }
 * ```
 */

/**
 * Represents a successful result
 */
export interface Ok<T> {
  readonly isOk: true
  readonly isErr: false
  readonly value: T
}

/**
 * Represents a failed result
 */
export interface Err<E> {
  readonly isOk: false
  readonly isErr: true
  readonly error: E
}

/**
 * Result type that can be either Ok or Err
 */
export type Result<T, E> = Ok<T> | Err<E>

/**
 * Creates a successful Result
 */
export function ok<T>(value: T): Ok<T> {
  return {
    isOk: true,
    isErr: false,
    value,
  }
}

/**
 * Creates a failed Result
 */
export function err<E>(error: E): Err<E> {
  return {
    isOk: false,
    isErr: true,
    error,
  }
}

/**
 * Type guard to check if result is Ok
 */
export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.isOk
}

/**
 * Type guard to check if result is Err
 */
export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return result.isErr
}

/**
 * Maps a Result<T, E> to Result<U, E> by applying a function to the Ok value
 */
export function map<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> {
  if (result.isOk) {
    return ok(fn(result.value))
  }
  return result
}

/**
 * Chains Results together (also known as flatMap or bind)
 */
export function flatMap<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> {
  if (result.isOk) {
    return fn(result.value)
  }
  return result
}

/**
 * Unwraps a Result, returning the Ok value or throwing the Err
 *
 * ⚠️ WARNING: This function throws and should only be used at the boundary
 * between functional core and imperative shell, or in tests.
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (result.isOk) {
    return result.value
  }
  throw result.error
}

/**
 * Unwraps a Result, returning the Ok value or a default value
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  if (result.isOk) {
    return result.value
  }
  return defaultValue
}

/**
 * Maps the error value of a Result
 */
export function mapErr<T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> {
  if (result.isErr) {
    return err(fn(result.error))
  }
  return result
}

/**
 * Matches on a Result, calling the appropriate function
 */
export function match<T, E, U>(
  result: Result<T, E>,
  handlers: {
    ok: (value: T) => U
    err: (error: E) => U
  }
): U {
  if (result.isOk) {
    return handlers.ok(result.value)
  }
  return handlers.err(result.error)
}
