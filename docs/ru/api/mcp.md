# API @safe-shape/mcp

[English](../../api/mcp.md) | **Русский**

Node ESM API доступны через `safe-shape/mcp` после `npm install safe-shape`.
Также можно отдельно установить и импортировать `@safe-shape/mcp`. Основной
импорт `safe-shape` не загружает MCP/SDK; установка включает их транзитивно.

- `createMcpContractRegistry(entries, tools?)`: копирует/замораживает контракты
  `{id, description, schema}` и каталог
  `{id, name, description, inputId, outputId}`. ID непустые, до 128 символов.
  Дубликаты ID/имён и неизвестные ссылки дают TypeError. Чтение через
  `contracts`, `tools`, `getContract(id)` и `getTool(id)`.
- `createSafeShapeMcpServer({registry, limits?})`: SDK Server с шестью
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
`McpHandlerContext`, `McpLimits`. Обёртки неизменяемы; поведение payloads
сохраняет семантику core. См. [использование и границы доверия](../mcp.md).
