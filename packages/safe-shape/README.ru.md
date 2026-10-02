# Общий пакет SafeShape

[English](README.md) | **Русский**

`safe-shape` объединяет runtime и инструменты в одной зависимости.

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

Переэкспортируются публичные API core, compat, http, json-schema, typescript,
validation. Установка также приносит cli с бинарником safe-shape. Дополнительной
runtime-семантики общий пакет не вводит.

Все ограничения, политики объектов, immutable-диагностика, warnings и явные
async-методы совпадают с исходными пакетами. Доступны Standard Schema V1 и
createStandardJsonSchema, safeToJsonSchema/JsonSchemaExportError, группировка
ошибок, формы, recovery HTTP, композиция объектов, checked pipe, snapshots,
checkContractConnection и рекурсивные TypeScript-объявления.
Зарезервированные имена импортируйте с alias, например `enum as enumSchema`.

В версии 3.3.0 также переэкспортируются describeOutputBound и
checkSchemaConnection; см. [проверяемые выходы](../../docs/ru/checked-output.md).
Для browser runtime без инструментов Node выбирайте отдельный core-пакет;
см. [архитектуру](../../docs/ru/package-architecture.md).

## API workflow (3.4.0)

Umbrella экспортирует `httpEndpoint`, `apiContract`, `createApiClient`, экспорт OpenAPI 3.1 и проверки совместимости API snapshots. Для браузера используйте `@safe-shape/api/client`. См. [API workflow](../../docs/ru/api/api.md).
