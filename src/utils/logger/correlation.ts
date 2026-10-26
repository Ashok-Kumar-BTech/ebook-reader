/**
 * Correlation ID Context - Tracks request/operation IDs across async boundaries
 */

let currentCorrelationId: string | undefined;
const correlationIdStack: string[] = [];

export function generateCorrelationId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getCorrelationId(): string | undefined {
  return currentCorrelationId;
}

export function setCorrelationId(id: string | undefined): void {
  currentCorrelationId = id;
}

export function withCorrelationId<T>(id: string | undefined, fn: () => T): T {
  const previous = currentCorrelationId;
  currentCorrelationId = id ?? generateCorrelationId();
  try {
    return fn();
  } finally {
    currentCorrelationId = previous;
  }
}

export function pushCorrelationId(id?: string): string {
  const newId = id ?? generateCorrelationId();
  correlationIdStack.push(currentCorrelationId ?? '');
  currentCorrelationId = newId;
  return newId;
}

export function popCorrelationId(): void {
  currentCorrelationId = correlationIdStack.pop();
}

export function runWithCorrelation<T>(fn: () => T | Promise<T>): T | Promise<T> {
  pushCorrelationId();
  const result = fn();
  if (result instanceof Promise) {
    return result.finally(() => popCorrelationId());
  }
  try {
    return result;
  } finally {
    popCorrelationId();
  }
}
