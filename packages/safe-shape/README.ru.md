# Общий пакет SafeShape

[English](https://github.com/dev-ik/safe_shape/blob/v3.5.1/packages/safe-shape/README.md) | **Русский**

Runtime-контракты для TypeScript: проверка неизвестных данных, вывод типов, экспорт схем и проверка совместимости API через одну зависимость.

Версия 3.5.0 добавляет AI-контракты и MCP через entry `safe-shape/mcp`, автоматически устанавливаемый с umbrella. Runtime umbrella сохраняет совместимость. Требуются Node >=20.10 и ESM.

```sh
npm install safe-shape
```

```ts
import { object, string, createContractSnapshotV2, toJsonSchema, toTypeScriptType,
  validateSchema, type InferInput, type InferOutput } from "safe-shape";
const user = object({ id: string() }).annotate({ title: "User" });
const report = validateSchema(user, { id: "user_1" });
const snapshot = createContractSnapshotV2(user, { id: "user" });
const jsonSchema = toJsonSchema(user);
const source = toTypeScriptType(user, { name: "User" });
type Input = InferInput<typeof user>;
type Output = InferOutput<typeof user>;
```

## API workflow

Неизменяемый каталог endpoints, проверка запросов до fetch и ответов после decoding, экспорт OpenAPI 3.1 и сравнение API snapshots. Добавлено в 3.4.0 и сохранено в 3.5.0.

```js
import {
  object, string, httpEndpoint, apiContract,
} from "safe-shape";

export const api = apiContract({
  getUser: httpEndpoint({
    method: "get",
    path: "/users/{id}",
    request: { params: object({ id: string({ minLength: 1 }) }) },
    responses: {
      200: object({ id: string() }),
      404: object({ message: string() }),
    },
  }),
});

```

Сохраните каталог в `api.mjs`. Вызовы клиента вынесите в отдельный модуль, чтобы CLI imports не отправляли HTTP-запросы:

```js
import { createApiClient, toOpenApi, createApiSnapshot, compareApiSnapshots } from "safe-shape";
import { api } from "./api.mjs";

const client = createApiClient(api, { baseUrl: "https://api.example.com/v1" });
const result = await client.getUser({ params: { id: "user_1" } });
if (result.success && result.status === 200) console.log(result.data.id);

const openapi = toOpenApi(api, { title: "Users", version: "1.0.0" });
const baseline = createApiSnapshot(api);
const comparison = compareApiSnapshots(baseline, createApiSnapshot(api));
console.log(openapi.openapi, comparison.decision); // 3.1.0, compatible
```

Клиент обращается к вашему существующему серверу; SafeShape не устанавливает router. Типы path parameters и response data по status выводятся из каталога. Невалидный запрос останавливается до transport. Объявленный ответ 404 — типизированный результат; ошибки валидации, сети и decoding имеют `success: false`. Warnings сохраняются; второй аргумент вызова принимает `{ signal }`.

Для браузера импортируйте `apiContract`, `httpEndpoint`, `createApiClient` из `@safe-shape/api/client`, а схемы — из `@safe-shape/core`. OpenAPI и snapshot tooling используют Node entry.

Transport поддерживает JSON, строковые path parameters, scalar query fields и непустые массивы с повторяющимися query keys. Transforms, stripping objects, cookies, multipart, автоматические retries и server routing не предоставляются. См. [полный API reference](https://github.com/dev-ik/safe_shape/blob/v3.5.1/docs/ru/api/api.md) и [запускаемый пример](https://github.com/dev-ik/safe_shape/blob/v3.5.1/examples/api-workflow.mjs).

### CLI

Сохраните модуль с экспортом каталога как `api.mjs`, затем выполните:

```sh
npx safe-shape api export --module ./api.mjs --export api --title Users --version 1.0.0 --out ./openapi.json
npx safe-shape api snapshot --module ./api.mjs --export api --out ./api.contract.json
npx safe-shape --json api check --module ./api.mjs --export api --against ./api.contract.json
```

Exit codes проверки: 0 для совместимых изменений, 2 для миграции или ручного review, 1 для operational errors. Проверка читает baseline без его замены. См. [CLI reference](https://github.com/dev-ik/safe_shape/blob/v3.5.1/docs/ru/api/cli.md).

Переэкспортируются публичные API core, compat, http, json-schema, typescript,
validation и api. Установка также приносит cli с бинарником safe-shape. Дополнительной
runtime-семантики общий пакет не вводит.

Все ограничения, политики объектов, immutable-диагностика, warnings и явные
async-методы совпадают с исходными пакетами. Доступны Standard Schema V1 и
createStandardJsonSchema, safeToJsonSchema/JsonSchemaExportError, группировка
ошибок, формы, recovery HTTP, композиция объектов, checked pipe, snapshots,
checkContractConnection и рекурсивные TypeScript-объявления.
Зарезервированные имена импортируйте с alias, например `enum as enumSchema`.

В версии 3.3.0 также переэкспортируются describeOutputBound и
checkSchemaConnection; см. [проверяемые выходы](https://github.com/dev-ik/safe_shape/blob/v3.5.1/docs/ru/checked-output.md).
Для browser runtime без инструментов Node выбирайте отдельный core-пакет;
см. [архитектуру](https://github.com/dev-ik/safe_shape/blob/v3.5.1/docs/ru/package-architecture.md).

## AI-контракты и MCP

Одна команда `npm install safe-shape` устанавливает локальный stdio-сервер и
адаптер AI-инструментов. Импортируйте MCP API из `safe-shape/mcp`; основной импорт
не загружает MCP/SDK. Отдельный `@safe-shape/mcp` по-прежнему доступен.
Установка umbrella включает SDK даже без использования этого entry.
См. [MCP](https://github.com/dev-ik/safe_shape/blob/v3.5.1/docs/ru/mcp.md).
