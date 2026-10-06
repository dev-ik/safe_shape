# Интеграция в проект

[English](../integration.md) | **Русский**

Требуются Node.js >=20.10, ESM-совместимый проект; рекомендуются TypeScript strict,
module/moduleResolution NodeNext. Обновляйте установленные safe-shape и
@safe-shape/* вместе, сохраняя версии согласованными.

```sh
npm install safe-shape
```

Для узкой установки выберите core; добавьте http для границ, validation для
JSON-friendly отчётов, compat для snapshots, json-schema/typescript/cli для
инструментов сборки. Последние можно устанавливать в devDependencies.

## Контракт и runtime

```ts
import { object, string, integer, enumeration, type Infer } from "@safe-shape/core";
export const userSchema = object({
  id: string({ minLength: 1, maxLength: 100 }),
  role: enumeration(["admin", "member"]),
  age: integer({ minimum: 0, maximum: 150 }).optional(),
}).annotate({ title: "User" });
export type User = Infer<typeof userSchema>;
```

Держите модуль схем общим для приложения и CLI, без console output.
Parse выбрасывает ошибку; safeParse возвращает success/data либо error. Перед
бизнес-логикой проверьте success. Для JSON-friendly результата используйте
validateSchema; для async-правил — safeParseAsync/validateSchemaAsync и async HTTP.
Изменение значений делается явно через transform, выход проверяется pipe.

Refine с относительным path даёт одну межполевую ошибку; refineWithIssues с id
собирает несколько упорядоченных ошибок. Они сохраняются в Standard Schema,
CLI, HTTP и validation. Произвольные правила opaque для tooling и не экспортируются
точно в JSON Schema.

## Standard Schema, JSON Schema и HTTP

Передавайте схему напрямую потребителям Standard Schema V1, адаптер не нужен.
Для произвольной схемы ожидайте `await schema["~standard"].validate(input)`:
результат может быть sync или Promise. Нативные поля диагностики сохраняются,
но сторонний consumer может использовать только message/path.

CreateStandardJsonSchema добавляет input/output conversion, сохраняя validation
и inference. Поддержаны Draft 2020-12/7, libraryOptions.id задаёт $id.
SafeToJsonSchema позволяет обработать все exporter issues без исключения и
без частичного артефакта. См. [справочник](api/json-schema.md).

HttpContract задаёт params/query/body/headers/cookies и response/responses.
Адаптер приложения переносит части framework request в эти секции; HTTP-пакет
не зависит от фреймворка. [Production boundaries](production-boundaries.md)
показывает изоляцию ошибок и отказ операции, [recovery](production-response-recovery.md)
— повторную проверку кеша при несовместимом ответе. Невалидные данные не становятся
доверенными из-за записи в лог.

## CLI и CI

Сначала соберите TypeScript-модули в ESM и создайте каталог baseline:

```sh
npm run build
mkdir -p .safe-shape
safe-shape --json doctor
safe-shape schema export --module ./dist/contracts/user.js --export userSchema --out ./dist/contracts/user.schema.json
safe-shape schema types --module ./dist/contracts/user.js --export userSchema --name User
safe-shape --json schema validate --module ./dist/contracts/user.js --export userSchema --input ./fixtures/user.json
safe-shape contract snapshot --module ./dist/contracts/user.js --export userSchema --id user --format v2 --out ./.safe-shape/user.json
safe-shape --json contract check --module ./dist/contracts/user.js --export userSchema --against ./.safe-shape/user.json --side input --compatibility backward
```

Snapshot v1 остаётся default, v2 нужен для рекурсии и независимых сторон.
Добавьте команды в scripts проекта. Baselines хранятся в git и не пересоздаются
в проверяющем CI job. См. [CI](ci.md) для shell/GitHub/GitLab и exit-кодов.

Внутренние поля реализации не являются API. Используйте публичные схемы,
introspection и exporters. В этом репозитории release:check включает полный
набор build/typecheck/tests/examples/benchmarks/consumer/audit/pack проверок.
Для обновления с 1.x сначала прочитайте [миграцию](migration-1-to-2.md).

## API workflow (3.4.0)

Установите `@safe-shape/api` для каталогов endpoints, fetch-клиента, OpenAPI
и проверки API. Umbrella содержит те же экспорты. Для браузера используйте
`@safe-shape/api/client` без Node tooling. См. [API reference](api/api.md).

## AI-контракты и MCP (3.5.0)

Установите `@safe-shape/mcp` отдельно от umbrella. Пакет предоставляет stdio
executable `safe-shape-mcp` и пять публичных конструкторов/адаптеров для
discovery/экспорта/валидации/сравнения контрактов и границ инструментов приложения.
Core и umbrella не получают зависимость от MCP SDK. Задайте фиксированный
manifest доверенных модулей; агент вызывает инструменты по ID с inline JSON.
См. [MCP](mcp.md): установка, конфигурация Codex, шесть инструментов, лимиты и
отмена; [API](api/mcp.md).
