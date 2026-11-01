import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { PassThrough } from 'node:stream';
import type { McpTransport, McpJsonRpcMessage } from '../src/protocol.js';

/** Independent wire client used only by tests; it validates observable replies. */
export class Client {
  private transport?: McpTransport;
  private nextId = 1;
  private readonly pending = new Map<number, { resolve: (result: any) => void; reject: (error: Error) => void; timer: NodeJS.Timeout }>();
  constructor(private readonly info: { name: string; version: string }) {}
  async connect(transport: McpTransport): Promise<void> {
    this.transport = transport;
    transport.onmessage = (raw: any) => {
      const pending = this.pending.get(raw.id);
      if (!pending) return;
      this.pending.delete(raw.id); clearTimeout(pending.timer);
      if (raw.jsonrpc !== '2.0') pending.reject(new Error('Invalid JSON-RPC version'));
      else if (raw.error) pending.reject(new Error(raw.error.message));
      else pending.resolve(raw.result);
    };
    transport.onclose = () => this.rejectPending(new Error('Transport closed'));
    transport.onerror = error => this.rejectPending(error);
    await transport.start();
    const initialized = await this.request('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: this.info });
    if (initialized.protocolVersion !== '2025-06-18') throw new Error('Unexpected protocol version');
    await transport.send({ jsonrpc: '2.0', method: 'notifications/initialized' });
  }
  private request(method: string, params?: Record<string, unknown>): Promise<any> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error('Test request timed out')); }, 5000);
      this.pending.set(id, { resolve, reject, timer });
      void this.transport!.send({ jsonrpc: '2.0', id, method, ...(params === undefined ? {} : { params }) }).catch(error => {
        this.pending.delete(id); clearTimeout(timer); reject(error);
      });
    });
  }
  listTools(): Promise<{ tools: any[] }> { return this.request('tools/list'); }
  callTool(params: { name: string; arguments?: Record<string, unknown> }): Promise<any> { return this.request('tools/call', params); }
  private rejectPending(error: Error): void { for (const pending of this.pending.values()) { clearTimeout(pending.timer); pending.reject(error); } this.pending.clear(); }
  async close(): Promise<void> { this.rejectPending(new Error('Client closed')); await this.transport?.close(); }
}

export class InMemoryTransport implements McpTransport {
  onmessage: McpTransport['onmessage']; onerror: McpTransport['onerror']; onclose: McpTransport['onclose'];
  private peer?: InMemoryTransport;
  private closed = false;
  static createLinkedPair(): [InMemoryTransport, InMemoryTransport] {
    const a = new InMemoryTransport(), b = new InMemoryTransport(); a.peer = b; b.peer = a; return [a, b];
  }
  async start(): Promise<void> {}
  async send(message: McpJsonRpcMessage): Promise<void> {
    if (this.closed || this.peer?.closed) throw new Error('Transport closed');
    this.peer?.onmessage?.(structuredClone(message));
  }
  async close(): Promise<void> { if (this.closed) return; this.closed = true; this.onclose?.(); await this.peer?.close(); }
}

export class StdioClientTransport implements McpTransport {
  onmessage: McpTransport['onmessage']; onerror: McpTransport['onerror']; onclose: McpTransport['onclose'];
  readonly stderr = new PassThrough();
  private child?: ChildProcessWithoutNullStreams;
  private ended: Promise<void> = Promise.resolve();
  constructor(private readonly options: { command: string; args: string[]; stderr: 'pipe' }) {}
  async start(): Promise<void> {
    if (this.child) throw new Error('Already started');
    const child = spawn(this.options.command, this.options.args, { stdio: ['pipe', 'pipe', 'pipe'] }); this.child = child;
    this.ended = new Promise(resolve => child.once('exit', () => { this.onclose?.(); resolve(); }));
    let buffer = '';
    child.stdout.setEncoding('utf8'); child.stderr.pipe(this.stderr);
    child.stdout.on('data', (chunk: string) => {
      buffer += chunk;
      let end: number;
      while ((end = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, end); buffer = buffer.slice(end + 1);
        try { this.onmessage?.(JSON.parse(line)); } catch (error) { this.onerror?.(error as Error); }
      }
    });
    child.on('error', error => this.onerror?.(error));
    await new Promise<void>((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject); });
  }
  async send(message: McpJsonRpcMessage): Promise<void> {
    await new Promise<void>((resolve, reject) => this.child!.stdin.write(JSON.stringify(message) + '\n', error => error ? reject(error) : resolve()));
  }
  async close(): Promise<void> {
    if (!this.child || this.child.exitCode !== null || this.child.signalCode !== null) return;
    this.child.stdin.end();
    const timer = setTimeout(() => this.child?.kill('SIGKILL'), 1000);
    try { await this.ended; } finally { clearTimeout(timer); }
  }
}
