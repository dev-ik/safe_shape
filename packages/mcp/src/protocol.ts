import { integer, literal, object, record, string, union, unknown as unknownSchema } from '@safe-shape/core';
import { copyJson, jsonBytes } from './json.js';
import type { McpLimits } from './limits.js';

export type McpJsonRpcMessage = Readonly<Record<string, unknown>>;
export interface McpCallToolResult {
  readonly content: readonly Readonly<{ type: 'text'; text: string }>[];
  readonly structuredContent?: Readonly<Record<string, unknown>>;
  readonly isError?: boolean;
  readonly _meta?: Readonly<Record<string, unknown>>;
}
export interface McpTransport {
  onmessage?: ((message: unknown) => void) | undefined;
  onerror?: ((error: Error) => void) | undefined;
  onclose?: (() => void) | undefined;
  start(): Promise<void>;
  send(message: McpJsonRpcMessage): Promise<void>;
  close(): Promise<void>;
}
export interface SafeShapeMcpServer {
  onerror?: ((error: Error) => void) | undefined;
  onclose?: (() => void) | undefined;
  connect(transport: McpTransport): Promise<void>;
  close(): Promise<void>;
}
export class McpProtocolError extends Error {
  constructor(readonly code: number, message: string) { super(message); }
}
const idSchema = union([string(), integer()]);
const params = record(unknownSchema());
const requestSchema = object({ jsonrpc: literal('2.0'), id: idSchema, method: string({ minLength: 1 }), params: params.optional() }, { unknownProperties: 'passthrough' });
const notificationSchema = object({ jsonrpc: literal('2.0'), method: string({ minLength: 1 }), params: params.optional() }, { unknownProperties: 'passthrough' });
const initializeSchema = object({ protocolVersion: string({ minLength: 1 }), capabilities: params, clientInfo: object({ name: string({ minLength: 1 }), version: string({ minLength: 1 }) }, { unknownProperties: 'passthrough' }) }, { unknownProperties: 'passthrough' });
const callSchema = object({ name: string({ minLength: 1 }), arguments: params.optional(), _meta: params.optional() }, { unknownProperties: 'passthrough' });
const listSchema = object({ _meta: params.optional() });
const cancelSchema = object({ requestId: idSchema, reason: string().optional() }, { unknownProperties: 'passthrough' });
type RequestId = string | number;

/** The inspection server deliberately advertises only its implemented tools. */
export function createProtocolServer(options: {
  readonly version: string;
  readonly limits: McpLimits;
  readonly list: () => unknown;
  readonly call: (name: string, args: Record<string, unknown>, signal: AbortSignal) => Promise<McpCallToolResult>;
}): SafeShapeMcpServer {
  let state: 'new' | 'connected' | 'initializing' | 'ready' | 'closed' = 'new';
  let transport: McpTransport | undefined;
  const pending = new Map<RequestId, AbortController>();
  const observe = (callback: (() => void) | undefined) => { try { callback?.(); } catch { /* Observers cannot prevent cleanup. */ } };
  const server: SafeShapeMcpServer = {
    async connect(next) {
      if (state !== 'new') throw new TypeError('MCP server can connect only once.');
      state = 'connected'; transport = next;
      const previousClose = next.onclose, previousError = next.onerror;
      next.onmessage = message => { void receive(message).catch(fail); };
      next.onclose = () => { observe(previousClose); void server.close().catch(fail); };
      next.onerror = error => { observe(() => previousError?.(error)); fail(error); };
      try { await next.start(); } catch (error) { await server.close(); throw error; }
    },
    async close() {
      if (state === 'closed') return;
      state = 'closed';
      for (const controller of pending.values()) controller.abort();
      pending.clear();
      const current = transport; transport = undefined;
      if (current) {
        current.onmessage = undefined; current.onerror = undefined; current.onclose = undefined;
        try { await current.close(); } finally { observe(server.onclose); }
      } else observe(server.onclose);
    },
  };
  function fail(error: unknown): void {
    observe(() => server.onerror?.(error instanceof Error ? error : new Error('MCP transport failed.')));
    void server.close().catch(() => {});
  }
  async function send(message: McpJsonRpcMessage): Promise<void> {
    if (state === 'closed' || !transport) return;
    copyJson(message, options.limits.depth + 8, false);
    if (jsonBytes(message) > options.limits.responseBytes) { await server.close(); throw new Error('Protocol output limit exceeded.'); }
    await transport.send(message);
  }
  const errorReply = (id: RequestId | null, code: number, message: string) => send({ jsonrpc: '2.0', id, error: { code, message } });
  async function receive(raw: unknown): Promise<void> {
    if (state === 'closed') return;
    let message: any;
    try {
      message = copyJson(raw, options.limits.depth, false);
      if (jsonBytes(message) > options.limits.requestBytes) throw new Error();
    } catch { await server.close(); return; }
    if (!message || typeof message !== 'object' || Array.isArray(message)) { await errorReply(null, -32600, 'Invalid request.'); return; }
    if (!Object.hasOwn(message, 'id')) {
      const parsed = notificationSchema.safeParse(message);
      if (!parsed.success) return;
      if (parsed.data.method === 'notifications/initialized' && state === 'initializing') state = 'ready';
      if (parsed.data.method === 'notifications/cancelled') {
        const cancelled = cancelSchema.safeParse(parsed.data.params);
        if (cancelled.success) pending.get(cancelled.data.requestId)?.abort();
      }
      return;
    }
    // This server initiates no requests; unsolicited responses are ignored.
    if (!Object.hasOwn(message, 'method') && (Object.hasOwn(message, 'result') || Object.hasOwn(message, 'error'))) return;
    const parsed = requestSchema.safeParse(message);
    if (!parsed.success) { await errorReply(idSchema.safeParse(message.id).success ? message.id : null, -32600, 'Invalid request.'); return; }
    const request = parsed.data;
    if (pending.has(request.id)) { await errorReply(request.id, -32600, 'Duplicate active request id.'); return; }
    if (request.method === 'ping') { await send({ jsonrpc: '2.0', id: request.id, result: {} }); return; }
    if (request.method === 'initialize') {
      if (state !== 'connected') { await errorReply(request.id, -32600, 'Already initialized.'); return; }
      if (!initializeSchema.safeParse(request.params).success) { await errorReply(request.id, -32602, 'Invalid initialize params.'); return; }
      state = 'initializing';
      await send({ jsonrpc: '2.0', id: request.id, result: { protocolVersion: '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'safe-shape', version: options.version } } });
      return;
    }
    if (state !== 'ready') { await errorReply(request.id, -32000, 'MCP initialization is not complete.'); return; }
    if (request.method === 'tools/list') {
      if (!listSchema.safeParse(request.params ?? {}).success) { await errorReply(request.id, -32602, 'Invalid tools/list params.'); return; }
      await send({ jsonrpc: '2.0', id: request.id, result: { tools: options.list() } });
      return;
    }
    if (request.method !== 'tools/call') { await errorReply(request.id, -32601, 'Method not found.'); return; }
    const call = callSchema.safeParse(request.params);
    if (!call.success) { await errorReply(request.id, -32602, 'Invalid tools/call params.'); return; }
    if (pending.size >= options.limits.concurrency) {
      const payload = { ok: false, operation: call.data.name, error: { code: 'capacity_exceeded', message: 'Operation capacity exceeded.' } };
      await send({ jsonrpc: '2.0', id: request.id, result: { isError: true, structuredContent: payload, content: [{ type: 'text', text: JSON.stringify(payload) }] } });
      return;
    }
    const controller = new AbortController();
    pending.set(request.id, controller);
    try {
      const result = await options.call(call.data.name, call.data.arguments ?? {}, controller.signal);
      if (!controller.signal.aborted) await send({ jsonrpc: '2.0', id: request.id, result });
    } catch (error) {
      if (!controller.signal.aborted) await errorReply(request.id, error instanceof McpProtocolError ? error.code : -32603, error instanceof McpProtocolError ? error.message : 'Internal error.');
    } finally { if (pending.get(request.id) === controller) pending.delete(request.id); }
  }
  return server;
}
