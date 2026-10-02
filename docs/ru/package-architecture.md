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
| cli | Командные сценарии поверх api/core/compat/exporters/validation |

Все scoped-пакеты имеют префикс @safe-shape/. Направление зависимостей:
http/compat/json-schema/typescript/validation → core; cli → core, compat,
json-schema, typescript, validation, api; api → core/http/json-schema/compat; safe-shape → все перечисленные, включая cli.
Core не зависит от HTTP, compat или exporters. Не переносите Node tooling в
browser runtime. Новые архитектурные решения требуют ADR.

Browser entry `@safe-shape/api/client` не загружает Node tooling.
