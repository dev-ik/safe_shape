# API @safe-shape/mcp

[English](../../api/mcp.md) | **Русский**

Node ESM API доступны через `safe-shape/mcp` после `npm install safe-shape`.
Также можно отдельно установить и импортировать `@safe-shape/mcp`. Основной
импорт `safe-shape` не загружает MCP. Zod и MCP SDK не устанавливаются.

- `createMcpContractRegistry(entries, tools?)`: копирует/замораживает контракты
  `{id, description, schema}` и каталог
  `{id, name, description, inputId, outputId}`. ID непустые, до 128 символов.
  Дубликаты ID/имён и неизвестные ссылки дают TypeError. Чтение через
  `contracts`, `tools`, `getContract(id)` и `getTool(id)`.
- `createSafeShapeMcpServer({registry, limits?})`: `SafeShapeMcpServer` с шестью
  инструментами. Явно вызывайте `connect(transport)` и `close()`.
- `defineMcpTool({name, description, input, output})`: неизменяемое типизированное описание.
- `safeToMcpToolDefinition(tool)`: замороженный `{success:true, definition, warnings}`
  либо `{success:false, issues}`. Точный экспорт графов входа/выхода с корневым объектом.
- `createValidatedMcpHandler(tool, handler, limits?)`: async callback
  `(arguments, {signal}?)`. Бизнес-обработчик получает parsed input и `{signal}`;
  возвращает accepted input схемы результата. Успешные wire data — parsed output.
  Ошибки исполнения дают `isError:true`; автоматического повтора нет.
- `DEFAULT_MCP_LIMITS` и `McpLimits`: requestBytes/depth/responseBytes/
  concurrency/deadlineMs и настройки положительными safe integers.

Типы: `McpContractEntry`, `McpToolCatalogEntry`, `McpContractRegistry`,
`McpTool`, `McpToolDefinition`, `McpToolExportResult`, `McpProfileIssue`,
`McpHandlerContext`, `McpLimits`, `SafeShapeMcpServer`, `McpTransport`,
`McpJsonRpcMessage`, `McpCallToolResult`. Обёртки неизменяемы; поведение payloads
сохраняет семантику core. См. [использование и границы доверия](../mcp.md).

## Типы сервера и транспорта (4.0.0)

`SafeShapeMcpServer.connect(transport: McpTransport): Promise<void>` запускает
один транспорт; повторное подключение даёт TypeError. `close(): Promise<void>`
идемпотентен: очищает callbacks, отменяет ожидающие вызовы и подавляет поздние ответы.
Необязательные `onerror(error: Error)` и `onclose()` не могут помешать очистке.

`McpTransport` содержит async-методы `start()`, `send(message: McpJsonRpcMessage)`,
`close()` и необязательные callbacks `onmessage(message: unknown)`,
`onerror(error: Error)`, `onclose()`. Транспорт сообщает о закрытии/ошибках и передаёт
целые JSON-сообщения. Сервер проверяет данные, размеры/глубину и lifecycle даже
для собственного транспорта. Авторизация сетевого транспорта — задача приложения.
CLI предоставляет ограниченный UTF-8 stdio с разделением по строкам, ограничивает
буфер исходящих сообщений и ожидает завершения записи. Закрытие не уничтожает stdout.

`McpJsonRpcMessage` — `Readonly<Record<string, unknown>>`.
`McpCallToolResult` содержит readonly текстовые записи `content`, необязательные
`structuredContent: Readonly<Record<string, unknown>>`, `isError: boolean` и
`_meta: Readonly<Record<string, unknown>>`. Это результат обработчика SafeShape,
а не все варианты содержимого, которые могут возвращать другие MCP-серверы.

Методы протокола и инициализация описаны в [руководстве MCP](../mcp.md).
Изменение прежнего возвращаемого типа SDK Server описано в [миграции с 3.x](../migration-3-to-4.md).
