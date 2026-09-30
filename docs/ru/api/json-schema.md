# JSON Schema API

[English](../../api/json-schema.md) | **Русский**

`@safe-shape/json-schema` экспортирует схемы SafeShape в неизменяемые JSON Schema.

```ts
import { object, string } from "@safe-shape/core";
import { toJsonSchema, safeToJsonSchema } from "@safe-shape/json-schema";
const user = object({ id: string() });
const artifact = toJsonSchema(user, {
  id: "https://example.com/contracts/user", side: "input", target: "draft-2020-12",
});
const result = safeToJsonSchema(user);
if (result.success) console.log(result.schema, result.warnings);
else console.error(result.issues);
```

## Опции и диагностика

`side` по умолчанию input; output использует выходной граф. `target` поддерживает
`draft-2020-12` и `draft-07`, выбирает ключевые слова и официальный `$schema`.
`schema` задаёт точный URI; известный официальный URI выбирает диалект при
отсутствии target. Противоречие target/URI отклоняется. `id` задаёт корневой `$id`:
непустой абсолютный URI без fragment и пробелов, проверяется до обхода IR.

Safe-результат — `{ success: true, schema, warnings }` либо
`{ success: false, issues }`. Частичный артефакт при отказе отсутствует.
Все контейнеры, пути и details заморожены. `toJsonSchema` выбрасывает
`JsonSchemaExportError` с теми же issues.

Issue содержит code, severity, message, artifact path, side, target, details?.
Коды: `json_schema.refinement.unrepresentable`, `json_schema.output.opaque`,
`json_schema.id.invalid`, `json_schema.dialect.conflict`,
`json_schema.target.unsupported`, `json_schema.contract.invalid`.
Пути используют ключевые слова выбранного диалекта.

## Отображения

| SafeShape | JSON Schema |
| --- | --- |
| string, number, integer, boolean | Соответствующий type |
| literal, enum | const, enum |
| unknown, never | `{}`, `{ not: {} }` |
| array, tuple | Массив; кортеж фиксированной длины |
| union, discriminatedUnion, intersection | anyOf, oneOf, allOf |
| object | properties, required, additionalProperties |
| record | additionalProperties и propertyNames для ограничений ключей |
| nullable | anyOf с null |
| optional | Схема поля без обязательности в required |
| transform | Входная схема на стороне input |
| lazy | Определения и $ref |

Draft 2020-12 использует `$defs`, `#/$defs/...`, `prefixItems`; Draft 7 —
`definitions`, `#/definitions/...`, tuple items и `additionalItems: false`.
В JSON Pointer экранируются `~` и `/`. Один lazy-экземпляр экспортируется один раз;
разные экземпляры с одним id дают ошибку.

Длина строки → minLength/maxLength; pattern → pattern; форматы email/uuid/date/
date-time → format и точный шаблон SafeShape. Совместные pattern+format не
перезаписывают друг друга: дополнительный pattern идёт в allOf. Календарная
семантика дат требует соответствующей format assertion валидатора.
Числа сохраняют minimum/maximum/multipleOf; integer → integer. Длины массивов
отображаются в minItems/maxItems. Ограничения ключей — propertyNames.

Reject даёт additionalProperties false, passthrough — true. Strip на input даёт
true, на output — false: JSON Schema проверяет экземпляры, но не удаляет поля.
Метаданные title/description/examples переносятся в одноимённые аннотации.
Произвольные refinements не аппроксимируются: выдаётся отдельная ошибка для
каждого правила со стабильным id, если он есть. Непрозрачный output отклоняется;
safe-экспорт собирает все обнаруженные ошибки в один результат.

## Standard JSON Schema V1

`createStandardJsonSchema(schema)` создаёт замороженную сущность с исходным
Standard Schema validate и `~standard.jsonSchema.input(options)` / `.output(options)`.
Конвертация синхронна; validation остаётся sync либо async по исходной схеме.
InferInput/InferOutput и неизменяемость сохраняются. Нужен target; libraryOptions.id
задаёт $id, неизвестные libraryOptions игнорируются. Openapi-3.0 и неизвестные
диалекты отклоняются, opaque output даёт JsonSchemaExportError. Адаптер остаётся
в exporter-пакете, core не зависит от форматов артефактов.

## Выходная граница в версии 3.3.0

`mode: "exact"` — прежнее поведение по умолчанию. Явные
`{ mode: "output-bound", side: "output" }` экспортируют верхнюю границу проверенных
выходов pipelines; safe-результат содержит warning `json_schema.output.bound`.
Она не доказывает производимость каждого допустимого значения. Непрозрачные
финальные transforms и реальные custom-правила по-прежнему отклоняются.
Standard-адаптер и CLI остаются в точном режиме. См. [выходные границы](../checked-output.md).
