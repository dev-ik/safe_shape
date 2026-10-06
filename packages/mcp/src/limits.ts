import { McpOperationError } from './json.js';
export interface McpLimits { readonly requestBytes: number; readonly depth: number; readonly responseBytes: number; readonly concurrency: number; readonly deadlineMs: number }
export const DEFAULT_MCP_LIMITS: McpLimits = Object.freeze({ requestBytes: 1048576, depth: 128, responseBytes: 4194304, concurrency: 16, deadlineMs: 30000 });
export function resolveLimits(input: Partial<McpLimits> = {}): McpLimits {
  if (!input || typeof input !== 'object' || Object.keys(input).some(k => !Object.hasOwn(DEFAULT_MCP_LIMITS, k))) throw new TypeError('Invalid limits.');
  const result = { ...DEFAULT_MCP_LIMITS, ...input };
  for (const value of Object.values(result)) if (!Number.isSafeInteger(value) || value <= 0) throw new TypeError('Limits must be positive safe integers.');
  if (result.deadlineMs > 2147483647) throw new TypeError('Deadline exceeds timer range.');
  return Object.freeze(result);
}
const deadlines = new WeakMap<AbortSignal, { end: number; abort: () => void }>();
export function checkSignal(signal: AbortSignal): void {
  const deadline = deadlines.get(signal);
  if (deadline && performance.now() >= deadline.end) { deadline.abort(); throw new McpOperationError('deadline_exceeded', 'Operation deadline exceeded.'); }
  if (signal.aborted) throw new McpOperationError('cancelled', 'Operation cancelled or timed out.');
}
/** A response deadline never releases a slot occupied by an unfinished callback. */
export class ExecutionGate {
  private active = 0;
  constructor(readonly limits: McpLimits) {}
  async run<T>(work: (signal: AbortSignal) => Promise<T>, external?: AbortSignal): Promise<T> {
    if (this.active >= this.limits.concurrency) throw new McpOperationError('capacity_exceeded', 'Operation capacity exceeded.');
    this.active++;
    const controller = new AbortController();
    deadlines.set(controller.signal, { end: performance.now() + this.limits.deadlineMs, abort: () => controller.abort() });
    let rejectAbort!: (error: Error) => void;
    const abort = new Promise<never>((_, reject) => { rejectAbort = reject; });
    const cancel = () => { controller.abort(); rejectAbort(new McpOperationError('cancelled', 'Operation cancelled.')); };
    external?.addEventListener('abort', cancel, { once: true });
    const timer = setTimeout(() => { controller.abort(); rejectAbort(new McpOperationError('deadline_exceeded', 'Operation deadline exceeded.')); }, this.limits.deadlineMs);
    if (external?.aborted) cancel();
    const running = Promise.resolve().then(() => { checkSignal(controller.signal); return work(controller.signal); }).then(value => { checkSignal(controller.signal); return value; });
    // Attach both settlement handlers even when the caller stops waiting.
    void running.then(() => { this.active--; deadlines.delete(controller.signal); }, () => { this.active--; deadlines.delete(controller.signal); });
    try { return await Promise.race([running, abort]); }
    finally { clearTimeout(timer); external?.removeEventListener('abort', cancel); }
  }
}
