/**
 * Pure Functional Programming Core Utilities for Ploty
 * Strictly immutable, pure functions, and Either/Result pattern.
 */

// ==========================================
// RESULT / EITHER PATTERN
// ==========================================

export type Ok<T> = {
  readonly success: true;
  readonly value: T;
};

export type Err<E> = {
  readonly success: false;
  readonly error: E;
};

export type Result<T, E> = Ok<T> | Err<E>;

export const ok = <T>(value: T): Result<T, never> => ({
  success: true,
  value,
});

export const err = <E>(error: E): Result<never, E> => ({
  success: false,
  error,
});

export const isOk = <T, E>(result: Result<T, E>): result is Ok<T> => result.success;

export const isErr = <T, E>(result: Result<T, E>): result is Err<E> => !result.success;

export const mapResult = <T, E, R>(
  result: Result<T, E>,
  fn: (value: T) => R,
): Result<R, E> => (result.success ? ok(fn(result.value)) : result);

export const flatMapResult = <T, E, R>(
  result: Result<T, E>,
  fn: (value: T) => Result<R, E>,
): Result<R, E> => (result.success ? fn(result.value) : result);

export const unwrapOr = <T, E>(result: Result<T, E>, fallback: T): T =>
  result.success ? result.value : fallback;

export const matchResult = <T, E, R>(
  result: Result<T, E>,
  onOk: (value: T) => R,
  onErr: (error: E) => R,
): R => (result.success ? onOk(result.value) : onErr(result.error));

// ==========================================
// FUNCTIONAL PIPE COMPOSITION
// ==========================================

export function pipe<A>(a: A): A;
export function pipe<A, B>(a: A, ab: (a: A) => B): B;
export function pipe<A, B, C>(a: A, ab: (a: A) => B, bc: (b: B) => C): C;
export function pipe<A, B, C, D>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
): D;
export function pipe<A, B, C, D, E>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
): E;
export function pipe<A, B, C, D, E, F>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
): F;
export function pipe<A, B, C, D, E, F, G>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
): G;
export function pipe(
  initial: unknown,
  ...fns: readonly ((arg: any) => any)[]
): unknown {
  return fns.reduce((current, fn) => fn(current), initial);
}

// ==========================================
// IMMUTABLE COLLECTION UTILITIES
// ==========================================

/**
 * Pure curried map
 */
export const map =
  <T, R>(fn: (item: T, index: number, array: readonly T[]) => R) =>
  (list: readonly T[]): readonly R[] =>
    Object.freeze(list.map((item, index) => fn(item, index, list)));

/**
 * Pure uncurried map
 */
export const mapList = <T, R>(
  list: readonly T[],
  fn: (item: T, index: number, array: readonly T[]) => R,
): readonly R[] => map(fn)(list);

/**
 * Pure curried filter
 */
export const filter =
  <T>(predicate: (item: T, index: number, array: readonly T[]) => boolean) =>
  (list: readonly T[]): readonly T[] =>
    Object.freeze(list.filter((item, index) => predicate(item, index, list)));

/**
 * Pure uncurried filter
 */
export const filterList = <T>(
  list: readonly T[],
  predicate: (item: T, index: number, array: readonly T[]) => boolean,
): readonly T[] => filter(predicate)(list);

/**
 * Pure curried reduce
 */
export const reduce =
  <T, R>(
    reducer: (acc: R, item: T, index: number, array: readonly T[]) => R,
    initialValue: R,
  ) =>
  (list: readonly T[]): R =>
    list.reduce((acc, item, index) => reducer(acc, item, index, list), initialValue);

/**
 * Pure uncurried reduce
 */
export const reduceList = <T, R>(
  list: readonly T[],
  reducer: (acc: R, item: T, index: number, array: readonly T[]) => R,
  initialValue: R,
): R => reduce(reducer, initialValue)(list);

/**
 * Pure groupBy
 */
export const groupBy =
  <T, K extends string | number | symbol>(keyFn: (item: T) => K) =>
  (list: readonly T[]): Readonly<Record<K, readonly T[]>> => {
    const result = {} as Record<K, T[]>;
    for (const item of list) {
      const key = keyFn(item);
      if (!result[key]) {
        result[key] = [];
      }
      result[key].push(item);
    }
    // Freeze all grouped arrays and the parent object
    const frozenGroups = {} as Record<K, readonly T[]>;
    for (const key of Object.keys(result) as K[]) {
      frozenGroups[key] = Object.freeze(result[key]);
    }
    return Object.freeze(frozenGroups);
  };
