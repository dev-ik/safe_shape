# Core API

[English](https://github.com/dev-ik/safe_shape/blob/v3.5.1/packages/core/README.md) | **Русский**

SafeShape проверяет данные на внешних границах приложения. Все схемы неизменяемы;
операции возвращают новые экземпляры. Неявного приведения типов нет.

## Конструкторы

| API | Назначение |
| --- | --- |
| `string(constraints?)` | Строки, длина, шаблон и формат |
| `number(constraints?)`, `integer(constraints?)` | Конечные числа, диапазон, целочисленность и кратность |
| `boolean()`, `literal(value)` | Логические значения и точные литералы |
| `enum(values)`, `enumeration(values)` | Непустой закрытый набор строк и конечных чисел |
| `unknown()`, `never()` | Любое значение без копирования; запрет всех значений |
| `array(item, constraints?)`, `tuple(items)` | Массив и кортеж фиксированной длины |
| `union(choices)` | Первая успешно прошедшая ветвь |
| `discriminatedUnion(key, choices)` | Объектная ветвь по обязательному уникальному тегу |
| `intersection(left, right)` | Проверка обеих схем и объединение совместимых результатов |
| `object(shape, options?)` | Объект с объявленными полями |
| `record(value, constraints?)` | Объект с общей схемой значений и ограничениями ключей |
| `nullable(schema)`, `.nullable()` | Дополнительно разрешают `null` |
| `optional(schema)`, `.optional()` | Разрешают `undefined` и отсутствие поля объекта |
| `lazy(getSchema, { id })` | Повторное использование и рекурсия |
| `annotate(schema, metadata)`, `.annotate(metadata)` | Метаданные для инструментов |

Именованный импорт зарезервированных слов требует псевдонима:

```ts
import { enum as enumSchema, unknown as unknownSchema } from "@safe-shape/core";
const status = enumSchema(["draft", "published"] as const);
```

Также доступны `schema.enum()`, `schema.unknown()`, `schema.never()` и остальные
конструкторы пространства `schema`. Enum сохраняет литеральный вывод типов и
порядок значений в диагностике; Contract IR канонически сортирует значения.
Пустые наборы, повторы, бесконечные числа и отрицательный ноль запрещены.

Дискриминатор — обязательный `literal` или `enum` со строковыми/числовыми тегами,
уникальными между объектными ветвями. Отсутствующий или неизвестный тег даёт
`invalid_discriminator` по пути тега. Выбранная ветвь сохраняет все свои ошибки.
Обычный union при полном отказе возвращает `invalid_union` с упорядоченным
`branches`: индекс объявления, исходные ошибки и warnings каждой ветви.
Вложенные деревья не уплощаются, «лучшая» ветвь автоматически не выбирается.

Intersection проверяет исходный вход обеими схемами, сохраняет ошибки слева
направо и объединяет одинаковые или рекурсивно совместимые массивы/простые
объекты. Конфликт выходов даёт `intersection_conflict`. Новые контейнеры
заморожены. Для объединения объектов с непересекающимися полями задайте обоим
`unknownProperties: "strip"`: строгие схемы иначе отклонят чужие поля.

## Политика полей и композиция

`object()` по умолчанию использует `unknownProperties: "reject"`: лишние поля
дают `unexpected_property`. `strip` принимает и удаляет их, `passthrough`
сохраняет как `unknown` без глубокого копирования или замораживания этих значений.
Объявленные поля проверяются при любой политике; выходной контейнер заморожен.
Политика отражается в IR и учитывает сторону при экспорте.

С версии 3.2 доступны замороженный `shape`, `pick(keys)`, `omit(keys)`, неглубокий
`partial()`, `required()` и добавляющий поля `extend(fields)`. Коллизия `extend`
запрещена даже при совпадении типов. Компонуйте объект до объектных refinements;
правила отдельных полей сохраняются. См. [композицию](https://github.com/dev-ik/safe_shape/blob/v3.5.1/docs/ru/composable-contracts.md).

## Parsing и результаты

`Schema<TOutput, TInput = TOutput>` предоставляет:

- `safeParse(unknown): ParseResult<TOutput>` и `parse(unknown): TOutput`;
- `safeParseAsync(unknown): Promise<ParseResult<TOutput>>` и `parseAsync()`;
- `refine`, `refineWithIssues`, `warn`, `warnWithDiagnostics`;
- явные `refineAsync`, `refineAsyncWithDiagnostics`, `warnAsync`, `warnAsyncWithDiagnostics`;
- `transform(mapper, options?)`, `pipe(next)`, `nullable`, `optional`, `annotate`.

```ts
type ParseResult<T> =
  | { readonly success: true; readonly data: T; readonly warnings?: readonly Warning[] }
  | { readonly success: false; readonly error: ValidationError };
```

`parse` выбрасывает `ValidationError`, `parseAsync` отклоняет promise.
`ValidationError.issues` и `.warnings` неизменяемы. Пустой канал warnings при
успехе отсутствует; `parse` намеренно возвращает только данные. Safe-методы
возвращают отказ валидации, но не перехватывают любые ошибки JavaScript приложения.

## Standard Schema V1

Каждая схема структурно реализует `schema["~standard"]` без отдельной зависимости:
`version: 1`, `vendor: "safe-shape"`. `validate(input)` синхронен для sync-схем и
возвращает Promise для схем с async-правилами. Результат — замороженный `{ value }`
или `{ issues }` с необязательным расширением `warnings`. Коды, подсказки и ветви
SafeShape сохраняются. `libraryOptions` принимается, но пока игнорируется.
`StandardSchemaV1.InferInput` и `InferOutput` учитывают transforms; поле `types`
существует только на уровне типов, не в runtime.

## Нативные ограничения

```ts
import { string, integer, number, record, array } from "@safe-shape/core";
const name = string({ minLength: 3, maxLength: 40, pattern: "^[a-z]+$" });
const email = string({ format: "email" });
const age = integer({ minimum: 0, maximum: 150 });
const amount = number({ minimum: 0, multipleOf: 0.01 });
const counters = record(integer(), { key: { pattern: "^[a-z]+$", maxLength: 64 } });
const scores = array(number({ minimum: 0, maximum: 100 }), { minLength: 1, maxLength: 10 });
```

Длина строки измеряется в Unicode code points, границы включительны.
Конфигурация проверяется при создании схемы и заморожена в описании.
`pattern` — исходный текст ECMAScript regex в Unicode-режиме без stateful-флагов;
неверный шаблон отклоняется при создании. Шаблоны считаются доверенным кодом.

Форматы: `email`, `uuid`, `date`, `date-time`. Email — точное ASCII-подмножество
с dot-atom и DNS-label, не весь RFC 5322 и не международные адреса.
Даты проверяются календарно без `Date.parse`; date-time требует часовой пояс,
не принимает leap seconds и `24:00:00`. Полная грамматика: RFC 0024 (EN).
Ошибки длины, шаблона и формата накапливаются независимо.

`multipleOf` положителен и конечен. Делимость точна для кратчайшей десятичной
записи числа, без epsilon: `0.3` кратно `0.1`, `0.30000000000000004` — нет.
`not_multiple_of` может соседствовать с ошибками диапазона и целочисленности.
Ключи record поддерживают ограничения строки; они не переименовываются и не
приводятся. Ошибки ключа и значения могут иметь одинаковый путь.

## Пользовательские правила, warnings и async

Нативные ограничения предпочтительны для анализа совместимости. `refine`
предназначен для правил, которые нельзя выразить нативно; стабильный `id`
обозначает семантику непрозрачного правила, а не доказательство его эквивалентности.

```ts
import { object, string } from "@safe-shape/core";
const credentials = object({ password: string(), confirmation: string() }).refine(
  v => v.password === v.confirmation,
  { id: "password-confirmation/v1", path: ["confirmation"], message: "Пароли должны совпадать." },
);
```

`refineWithIssues((value, context) => ..., { id })` добавляет несколько ошибок
через `context.addIssue({ path?, message, expected?, suggestion?, params? })`.
Порядок сохраняется; пути относительны проверяемой схеме и получают префиксы
объектов, массивов и HTTP-секций. Код — `custom`, пути копируются и замораживаются.
Синхронный collector, вернувший promise или выбросивший исключение, даёт
детерминированный отказ без раскрытия исключения.

`warn` выдаёт нефатальный Warning при `false`; `warnWithDiagnostics` использует
`addWarning`. Оба требуют `id`. `params` допускают JSON-примитивы, массивы и
простые объекты: копируются, замораживаются, ограничены 20 уровнями, 1000
элементами и 16384 сериализованными символами. Циклы, accessors, неконечные
числа и непростые объекты запрещены.

Async-правила используют отдельные методы и требуют `safeParseAsync`/`parseAsync`.
Работа идёт последовательно в порядке объявления/входа. Sync-вход обнаруживает
вложенные async-правила до parsing и выбрасывает `TypeError`. Отклонённый promise
правила становится fatal custom issue, без раскрытия причины отклонения.

## Преобразования и типы

`.transform(mapper, { id?, message?, expected?, suggestion? })` вызывается после
проверки входа. Исключение mapper даёт `transform_failed`. Выходной тип меняется,
исходный входной тип сохраняется во всей цепочке. `.pipe(next)` проверяет
промежуточное значение и выводит тип следующей стадии. Ошибки сохраняют полные
пути, warnings накапливаются по порядку, следующая стадия не запускается после отказа.

```ts
import { string, number, type InferInput, type InferOutput } from "@safe-shape/core";
const page = string().transform(Number).pipe(number({ minimum: 1 }));
type Input = InferInput<typeof page>; // string
type Output = InferOutput<typeof page>; // number
```

`Infer` остаётся псевдонимом выходного типа. `Schema<User>` сохраняет прежний смысл.
Runtime-методы принимают `unknown`: входной generic описывает композицию, а не
доверие к переданным данным. Меняйте стабильный id при изменении семантики правила.

## Диагностика

Issue содержит `severity: "error"`, `code`, `path`, `expected`, `received`,
`message`, `suggestion`, необязательные `branches`, `ruleId`, JSON-safe `params`.
`Diagnostic` — объединение `Issue | Warning`. Неизменяемы ошибки, пути, массивы
ветвей, их записи и массивы вложенных ошибок.

Коды: `invalid_type`, `invalid_literal`, `invalid_enum`, `invalid_string_pattern`,
`invalid_string_format`, `forbidden_value`, `invalid_tuple_length`, `invalid_union`,
`invalid_discriminator`, `intersection_conflict`, `too_small`, `too_large`,
`not_integer`, `not_multiple_of`, `transform_failed`, `missing_property`,
`unexpected_property`, `custom`.

Для представления используйте `createDiagnostic`, `createFormattedDiagnostic`,
`createDiagnostics`, `formatIssuePath`, `formatDiagnostic`, `formatIssues`,
`formatWarnings`, `formatDiagnostics`, `formatValidationError`. Форматированные
union-ошибки сохраняют рекурсивные секции и `FormattedDiagnostic.branches`.

`groupIssuesByPath` группирует без потерь по структурному пути, сохраняя первый
порядок путей и порядок ошибок. `toFieldErrors` даёт замороженную запись для форм:
`["contacts", 0, "email"]` → `contacts[0].email`, корень — `_root` по умолчанию.
Настройки: `rootKey`, `formatMessage`, `formatPath`. Коллизии разных путей в один
ключ вызывают `TypeError`; сообщения не перезаписываются. Prototype-подобные
ключи сохраняются безопасно. Ветви union не уплощаются автоматически.

Форматтеры передаются на вызов; локаль не хранится в схеме или глобальном состоянии.
`formatIssues`/`formatValidationError` меняют через `formatMessage` только текст
сообщения, сохраняя остальные поля и прежнее поведение без опций.

## Метаданные, introspection и рекурсия

`.annotate({ title, description, examples })` прикрепляет неизменяемые метаданные
без изменения parsing. `describeSchema` возвращает нейтральное описание, не JSON
Schema; refinement id или `null` и transform id остаются видимыми. Идентичности
warnings/async кодируются как `warning:<id>`, `async-error:<id>`, `async-warning:<id>`.

`describeContract` возвращает `format: "safe-shape.contract-ir/v2"` и отдельные
замороженные `input`/`output` с `root` и `definitions`. Непроверенный выход
преобразования — `opaque`. `lazy` требует стабильный id, кеширует результат getter
и поддерживает повторное использование/рекурсию. Разные экземпляры с одинаковым
id отклоняются; legacy `describeSchema` показывает ссылку без графа определений.

В версии 3.3.0 `describeOutputBound(schema)` возвращает отдельный
`SchemaOutputBound` с `format: "safe-shape.output-bound/v1"` и `graph`.
Это верхняя граница успешных выходов, не точный snapshot; см.
[проверяемые выходы](https://github.com/dev-ik/safe_shape/blob/v3.5.1/docs/ru/checked-output.md). В опубликованной 3.2.x API отсутствует.
