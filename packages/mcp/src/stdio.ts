import { Transform, type TransformCallback, type Readable, type Writable } from 'node:stream';
import type { McpTransport, McpJsonRpcMessage } from './protocol.js';
import type { McpLimits } from './limits.js';
/** Bounded per-frame buffer and an ASCII structure scanner preceding JSON.parse. */
export function createBoundedInput(maxBytes: number, maxDepth: number): Transform {
  const buffer = Buffer.alloc(maxBytes);
  let length = 0, depth = 0, quoted = false, escaped = false;
  return new Transform({
    transform(chunk: Buffer, _encoding: BufferEncoding, callback: TransformCallback) {
      try {
        for (const byte of chunk) {
          if (byte === 10) {
            this.push(Buffer.concat([buffer.subarray(0, length), Buffer.from('\n')]));
            length = 0; depth = 0; quoted = false; escaped = false;
            continue;
          }
          if (length >= maxBytes) throw new Error('Request byte limit exceeded.');
          buffer[length++] = byte;
          if (quoted) {
            if (escaped) escaped = false;
            else if (byte === 92) escaped = true;
            else if (byte === 34) quoted = false;
          } else if (byte === 34) quoted = true;
          else if (byte === 123 || byte === 91) { if (++depth > maxDepth) throw new Error('JSON depth limit exceeded.'); }
          else if (byte === 125 || byte === 93) depth--;
        }
        callback();
      } catch (error) { callback(error as Error); }
    },
    flush(callback: TransformCallback) { if (length) callback(new Error('Incomplete protocol frame.')); else callback(); },
  });
}
export class BoundedStdioTransport implements McpTransport {
  onmessage: McpTransport['onmessage'];
  onerror: McpTransport['onerror'];
  onclose: McpTransport['onclose'];
  private state: 'new' | 'running' | 'closed' = 'new';
  private readonly bounded: Transform;
  private queuedBytes = 0;
  private inFlightWrites = 0;
  private readonly writes = new Set<(error?: Error | null) => void>();
  constructor(private readonly input: Readable, readonly limits: McpLimits, private readonly output: Writable = process.stdout) {
    this.bounded = createBoundedInput(limits.requestBytes, limits.depth);
  }
  private readonly failed = (error: Error): void => {
    try { this.onerror?.(error); } catch { /* Observers cannot prevent cleanup. */ }
    void this.close();
  };
  private detachOutputWhenIdle(): void {
    // Writable emits an error after its write callback. Keep the listener for
    // that emission, including writes that settle after logical close.
    setImmediate(() => {
      if (this.state === 'closed' && this.inFlightWrites === 0) this.output.removeListener('error', this.failed);
    });
  }
  private readonly ended = (): void => { void this.close(); };
  private readonly frame = (data: Buffer): void => {
    let message: unknown;
    try { message = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(data)); }
    catch {
      void this.send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error.' } }).catch(this.failed);
      return;
    }
    try { this.onmessage?.(message); } catch { this.failed(new Error('Protocol receiver failed.')); }
  };
  async start(): Promise<void> {
    if (this.state !== 'new') throw new TypeError('Transport can start only once.');
    this.state = 'running';
    this.bounded.on('data', this.frame);
    this.bounded.on('error', this.failed);
    this.bounded.on('end', this.ended);
    this.input.on('error', this.failed);
    this.output.on('error', this.failed);
    this.input.pipe(this.bounded);
  }
  async send(message: McpJsonRpcMessage): Promise<void> {
    if (this.state !== 'running') throw new Error('Transport is not running.');
    const frame = JSON.stringify(message) + '\n';
    const bytes = Buffer.byteLength(frame, 'utf8');
    if (bytes - 1 > this.limits.responseBytes || this.queuedBytes + bytes > (this.limits.responseBytes + 1) * this.limits.concurrency) {
      await this.close(); throw new Error('Protocol output limit exceeded.');
    }
    this.queuedBytes += bytes;
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const finish = (error?: Error | null) => {
        if (settled) return;
        settled = true; this.queuedBytes -= bytes; this.writes.delete(finish);
        if (error) reject(error); else resolve();
      };
      this.writes.add(finish);
      this.inFlightWrites++;
      let completed = false;
      const written = (error?: Error | null) => {
        if (completed) return;
        completed = true; this.inFlightWrites--;
        finish(error);
        if (this.state === 'closed') this.detachOutputWhenIdle();
      };
      try { this.output.write(frame, 'utf8', written); } catch (error) { written(error as Error); }
    });
  }
  async close(): Promise<void> {
    if (this.state === 'closed') return;
    this.state = 'closed';
    this.input.unpipe(this.bounded);
    this.input.removeListener('error', this.failed);
    this.detachOutputWhenIdle();
    this.bounded.removeListener('data', this.frame);
    this.bounded.removeListener('end', this.ended);
    this.bounded.destroy();
    for (const finish of this.writes) finish(new Error('Transport closed.'));
    try { this.onclose?.(); } catch { /* Cleanup is already complete. */ }
  }
}
