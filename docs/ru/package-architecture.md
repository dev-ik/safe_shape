# Архитектура пакетов

[English](../package-architecture.md) | **Русский**

| Пакет | Ответственность |
| --- | --- |
| safe-shape | Общий переэкспорт runtime и tooling, установка CLI |
| core | Схемы, parsing, результаты, ошибки, диагностика |
| compat | Детерминированные snapshots и доказательства совместимости |
| http | Независимые от фреймворка HTTP-границы |
| json-schema | Экспорт JSON Schema из описания core |
| typescript | Генерация объявлений из описания core |
| validation | JSON-friendly validation reports |
| api | Каталог endpoints, fetch-клиент, OpenAPI и совместимость API |
| mcp | Отдельный stdio-сервер и проверка AI-инструментов |
| cli | Командные сценарии поверх api/core/compat/exporters/validation |

Все scoped-пакеты имеют префикс @safe-shape/. Направление зависимостей:
http/compat/json-schema/typescript/validation → core; cli → core, compat,
json-schema, typescript, validation, api; api → core/http/json-schema/compat; safe-shape → core/compat/http/json-schema/typescript/validation/api/cli/mcp.
Core не зависит от HTTP, compat или exporters. Не переносите Node tooling в
browser runtime. Новые архитектурные решения требуют ADR.

Для прямого сравнения документов пакет api также зависит от yaml.
Browser entry `@safe-shape/api/client` не загружает Node tooling и YAML parser.

MCP зависит только от core/validation/json-schema/compat; протокол реализован
внутри пакета, входные сообщения проверяет core.
Ни один пакет не устанавливает Zod или MCP SDK. Core не зависит от MCP. Umbrella зависит от MCP для установки; его API
загружаются только через `safe-shape/mcp`, основной импорт сохраняет прежний граф.
