/**
 * Exhaustiveness guard: unreachable if every variant is handled, and a
 * compile error appears at the call site when a new variant is added.
 */
export function assertNever(value: never): never {
  throw new Error(`Unhandled variant: ${JSON.stringify(value)}`);
}
