# Проверяемые границы выходных значений

[English](../checked-output.md) | **Русский**

Требуется SafeShape 3.3.0. API включены в локальный релизный кандидат;
в пакетах 3.2.x их нет. См. [описание релиза](release-3.3.0.md).

```ts
import { string, number, checkSchemaConnection, safeToJsonSchema } from "safe-shape";
const Page = string({ pattern: "^[0-9]+$" }).transform(Number)
  .pipe(number({ integer: true, minimum: 1, maximum: 100 }));
const Consumer = number({ integer: true, minimum: 1 });
Page.parse("12"); // 12
Page.safeParse("0").success; // false
checkSchemaConnection(Page, Consumer).compatible; // true
const exported = safeToJsonSchema(Page, {
  side: "output", mode: "output-bound", target: "draft-2020-12",
});
```

Последняя стадия проверяет каждый успешный выход. Её ограничения задают верхнюю
границу множества выходов, но не доказывают производимость всех значений внутри.
Например, mapper всегда возвращает 1, хотя проверяющая схема допускает 1–100.

## Runtime, introspection и экспорт

Используются прежние transform/pipe, без неявного coercion. Сохраняются input/output
inference, явный async, полные пути, порядок warnings и остановка после отказа.

`describeOutputBound(schema)` из core возвращает замороженный
`{ format: "safe-shape.output-bound/v1", graph: { root, definitions } }`.
Поддерживаются вложенные pipelines и рекурсия. Strip описывает только выходные
ключи. Непроверенный финальный mapper и объединённый выход intersection остаются
opaque; реальные custom-правила не стираются.

ToJsonSchema/safeToJsonSchema принимают mode output-bound только с явным side
output. Оба диалекта поддержаны. Успешный safe-экспорт содержит warning
json_schema.output.bound даже для нативной схемы; throwing API возвращает только
артефакт. Непредставимые custom-ограничения и opaque output по-прежнему дают отказ.

Default mode exact, Standard JSON Schema, CLI export, точный IR и snapshots не
меняют поведения. Bound не является snapshot и не описывает точную достижимость.

## Проверка связей

`checkSchemaConnection(producer, consumer, options?)` находится в compat.
Опции producerId/consumerId по умолчанию равны producer/consumer. Результат
SchemaConnectionReport содержит прежние поля отчёта связи и evidence output-bound.
Producer fingerprint относится к графу границы, consumer fingerprint — к input.

Доказанное включение гарантирует, что успешные выходы подходят потребителю.
Если граница шире consumer, это ещё не доказывает производимость отвергаемого
значения: результат unknown требует ручной проверки. API никогда не строит
producer input и не исполняет callbacks; counterexample явно unavailable.
Lazy-getters могут разрешаться как при обычном introspection. Непрозрачные
consumer refinements анализируются консервативно. Это не гарантия успешности
любого входа producer или отсутствия исключений прикладного кода.

Для сохранённых v2 snapshots и нативных производимых контрпримеров используйте
checkContractConnection. Старые форматы не меняются.
[Полный пример](../../examples/checked-output.mjs) запускается после build командой
`node examples/checked-output.mjs`.
