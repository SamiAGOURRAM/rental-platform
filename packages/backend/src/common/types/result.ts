/** Discriminated union for operation results — services return Result instead of throwing */

export type Success<T> = { readonly ok: true; readonly value: T };
export type Failure<E> = { readonly ok: false; readonly error: E };
export type Result<T, E = Error> = Success<T> | Failure<E>;

export const ok = <T>(value: T): Success<T> => ({ ok: true, value });
export const fail = <E>(error: E): Failure<E> => ({ ok: false, error });

/** Unwrap a Result, throwing if it failed */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (result.ok) return result.value;
  throw result.error;
}

/** Map the success value of a Result */
export function mapResult<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  if (result.ok) return ok(fn(result.value));
  return result;
}
