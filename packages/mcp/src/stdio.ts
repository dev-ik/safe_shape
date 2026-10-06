import { Transform, type TransformCallback } from 'node:stream';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
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
export class BoundedStdioTransport extends StdioServerTransport {
  constructor(input: NodeJS.ReadableStream & { pipe: any }, readonly limits: McpLimits) {
    const bounded = createBoundedInput(limits.requestBytes, limits.depth);
    super(bounded, process.stdout, { maxBufferSize: limits.requestBytes + 1 });
    input.pipe(bounded);
    bounded.on('error', () => { this.onerror?.(new Error('Protocol input limit exceeded.')); void this.close(); });
  }
  override async send(message: JSONRPCMessage): Promise<void> {
    if (Buffer.byteLength(JSON.stringify(message), 'utf8') > this.limits.responseBytes) { await this.close(); throw new Error('Protocol output limit exceeded.'); }
    return super.send(message);
  }
}
