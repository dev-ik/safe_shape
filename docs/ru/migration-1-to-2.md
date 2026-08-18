# Миграция SafeShape с 1.x на 2.0

[English](../migration-1-to-2.md) | **Русский**

SafeShape 2.0 сохраняет runtime-first builder API и формат snapshot v1. Обычно
обновление можно провести постепенно: синхронизировать версии пакетов,
скомпилировать проект, проверить существующие baselines и обработать изменения
ниже.

## Требования

- Node.js `>=20.10`.
- Обновляйте `safe-shape` и все установленные пакеты `@safe-shape/*` вместе.
- Во время миграции оставьте строгую проверку TypeScript включённой.

Для общего пакета:

```sh
npm install safe-shape@2
```

Для отдельных пакетов удерживайте одну major-версию:

```sh
npm install @safe-shape/core@2 @safe-shape/validation@2
npm install --save-dev @safe-shape/compat@2 @safe-shape/cli@2
```

## Рекомендуемый порядок

1. Обновите все пакеты SafeShape, не меняя сохранённые snapshots.
2. Запустите TypeScript compiler и тесты, чтобы найти exhaustive switches и
   неверные предположения об optional-полях.
3. Проверьте новые схемы по существующим v1 baselines.
4. Обновите потребителей diagnostics и артефактов с учётом новых полей.
5. Переходите на snapshot v2 только для рекурсии или раздельных input/output
   проверок.
6. Проверяйте и коммитьте каждый новый baseline вручную; не генерируйте его в
   CI check job.

## Изменения в исходном коде

### Раздельные input и output типы

`Schema` теперь моделирует output и input отдельно:

```ts
import {
  string,
  type Infer,
  type InferInput,
  type InferOutput,
  type Schema,
} from "@safe-shape/core";

const length = string().transform((value) => value.length, {
  id: "string-length/v1",
});

type Input = InferInput<typeof length>;    // string
type Output = InferOutput<typeof length>;  // number
type ExistingAlias = Infer<typeof length>; // number

declare const outputSchema: Schema<number, string>;
```

Первый generic `Schema` по-прежнему обозначает output, поэтому существующий
`Schema<T>` эквивалентен `Schema<T, T>`. `Infer<TSchema>` остаётся alias для
output. Используйте `InferInput` на недоверенной границе, а `InferOutput` после
успешного parsing.

### Optional-поля объектов

Ключ можно не передавать, только если его схема явно обёрнута в `optional()` или
`.optional()`. Наличие `undefined` в output-типе само по себе не делает ключ
необязательным.

```ts
import { object, optional, string } from "@safe-shape/core";

const user = object({
  id: string(),
  nickname: optional(string()),
});
```

Если код 1.x полагался на неявный `undefined`, добавьте explicit optional wrapper
и повторите type/runtime-тесты.

### Неизвестные поля объектов

Политика по умолчанию — `reject`. Выбирайте `strip` или `passthrough` только
осознанно:

```ts
const stripped = object(
  { id: string() },
  { unknownProperties: "strip" },
);
```

`strip` удаляет неизвестные ключи из output, `passthrough` сохраняет их. Это
различие участвует в проверке совместимости.

### Diagnostics и schema definitions

В 2.0 появились новые issue codes и варианты `SchemaDefinition`. Exhaustive
`switch` по `IssueCode` или `SchemaDefinition["kind"]` должен обрабатывать эти
варианты. Сохраняйте `never` assertion, чтобы будущие дополнения обнаруживались
компилятором.

Ошибка обычного union может содержать упорядоченное дерево `branches`. Клиенты,
игнорирующие неизвестные JSON-поля, продолжат работать; строгие decoders и exact
snapshots нужно обновить.

### Refinements и JSON Schema

Refinements нельзя точно представить в JSON Schema, поэтому exporter теперь
возвращает ошибку вместо ослабленного артефакта. В build tooling используйте
небросающий API:

```ts
import { safeToJsonSchema } from "@safe-shape/json-schema";

const result = safeToJsonSchema(schema);

if (!result.success) {
  console.error(result.issues);
  process.exitCode = 1;
}
```

Присваивайте обычным refinements и transforms стабильные семантические id.
`refineWithIssues()` требует id и может возвращать несколько упорядоченных
issues с путями. Меняйте id при изменении поведения: одинаковый id утверждает
одинаковую семантику.

## Миграция snapshots

Snapshot v1 остаётся форматом по умолчанию. Поддерживаемые нерекурсивные деревья
и fingerprints не изменились, поэтому существующие baselines можно сохранить:

```sh
safe-shape contract check \
  --module ./dist/contracts/user.js \
  --export userSchema \
  --against ./.safe-shape/user.contract.json \
  --compatibility backward
```

Формат v2 включается явно и нужен для рекурсивных контрактов или раздельной
input/output совместимости:

```sh
safe-shape contract snapshot \
  --module ./dist/contracts/tree.js \
  --export treeSchema \
  --id tree \
  --format v2 \
  --out ./.safe-shape/tree.v2.contract.json

safe-shape --json contract check \
  --module ./dist/contracts/tree.js \
  --export treeSchema \
  --against ./.safe-shape/tree.v2.contract.json \
  --side input \
  --compatibility backward
```

Создайте отдельный проверенный v2 baseline вместо перезаписи v1-файла.
`contract check` определяет формат автоматически; `--side` разрешён только для
v2 и по умолчанию равен `input`.

Коды завершения команды стабильны:

- `0`: `safe` или `annotation-only`;
- `2`: `breaking`, `risky` или `unknown`;
- `1`: операционная ошибка, например повреждённый snapshot или неверный flag.

JSON-результат содержит `format` и `migration`. Решение о миграции нужно читать
из `migration.decision`, а не вычислять из текста сообщения.

## Проверка consumer-проекта

Запустите команды, представляющие реальные границы приложения:

```sh
npm run build
npm test
npm run contracts:validate
npm run contracts:check
```

Перед завершением миграции убедитесь, что:

- версии всех пакетов SafeShape совпадают;
- `InferInput` используется до parsing, а `InferOutput` — после него, если типы
  различаются;
- пропускаемые ключи имеют явные optional-схемы;
- snapshots diagnostics учитывают новую структуру;
- JSON Schema generation явно отклоняет неподдерживаемое opaque-поведение;
- каждый результат с exit code `2` проверен;
- v2 baselines прошли review и не создаются внутри CI.

Дальше: [быстрый старт](quick-start.md), [интеграция в проект](../integration.md)
(EN), [совместимость контрактов](../api/compat.md) (EN) и
[проверки в CI](../ci.md) (EN).
