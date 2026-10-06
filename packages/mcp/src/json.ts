export class McpOperationError extends Error {
  constructor(readonly code: string, message: string, readonly issues?: unknown) { super(message); }
}

/** Copy JSON data without invoking getters, toJSON or lossy serialization. */
export function copyJson(value: unknown, maxDepth = 128, freeze = true): any {
  const active = new Set<object>();
  function visit(item: unknown, depth: number): any {
    if (depth > maxDepth) throw new McpOperationError('depth_exceeded', 'JSON nesting limit exceeded.');
    if (item === null || typeof item === 'string' || typeof item === 'boolean') return item;
    if (typeof item === 'number' && Number.isFinite(item)) return item;
    if (typeof item !== 'object' || item === null || active.has(item)) throw new McpOperationError('serialization_failed', 'Value is not lossless JSON.');
    const array = Array.isArray(item);
    if (!array && Object.getPrototypeOf(item) !== Object.prototype && Object.getPrototypeOf(item) !== null) throw new McpOperationError('serialization_failed', 'Only plain JSON objects are supported.');
    active.add(item);
    try {
      const keys = Reflect.ownKeys(item);
      const result: any = array ? [] : Object.create(null);
      for (const key of keys) {
        if (array && key === 'length') continue;
        const descriptor = Object.getOwnPropertyDescriptor(item, key)!;
        if (typeof key !== 'string' || !descriptor.enumerable || !('value' in descriptor)) throw new McpOperationError('serialization_failed', 'Only enumerable JSON data properties are supported.');
        if (array && (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= (item as unknown[]).length)) throw new McpOperationError('serialization_failed', 'Array has non-index properties.');
        Object.defineProperty(result, key, { value: visit(descriptor.value, depth + 1), enumerable: true, writable: true, configurable: true });
      }
      if (array && keys.length - 1 !== (item as unknown[]).length) throw new McpOperationError('serialization_failed', 'Sparse arrays are not JSON.');
      // Ordinary objects preserve native diagnostic/report shapes, including __proto__ data keys.
      if (!array) Object.setPrototypeOf(result, Object.prototype);
      return freeze ? Object.freeze(result) : result;
    } finally { active.delete(item); }
  }
  return visit(value, 0);
}
export function jsonBytes(value: unknown): number { return Buffer.byteLength(JSON.stringify(value), 'utf8'); }
export function publicError(error: unknown): { code: string; message: string; issues?: unknown } {
  if (error instanceof McpOperationError) return { code: error.code, message: error.message, ...(error.issues === undefined ? {} : { issues: error.issues }) };
  return { code: 'execution_failed', message: 'Operation failed.' };
}
