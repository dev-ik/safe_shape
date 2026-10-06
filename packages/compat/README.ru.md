# Совместимость контрактов

[English](https://github.com/dev-ik/safe_shape/blob/v3.5.0/packages/compat/README.md) | **Русский**

`@safe-shape/compat` создаёт детерминированные snapshots и консервативно
сравнивает версии контрактов.

## Snapshots v1 и v2

```ts
import { object, string } from "@safe-shape/core";
import { createContractSnapshot, createContractSnapshotV2 } from "@safe-shape/compat";
const user = object({ id: string() });
const tree = createContractSnapshot(user, { id: "user" });
const graph = createContractSnapshotV2(user, { id: "user" });
```

V1: формат `safe-shape.contract/v1`, стабильный id, каноническое JSON-safe дерево
и fingerprint `sha256:`. Свойства и required сортируются; title/description
сохраняются, examples исключаются, чтобы не сохранять образцы payload.
V1 отклоняет lazy-ссылки и сохраняет прежние формат/fingerprint.

V2: `safe-shape.contract/v2`, графы input/output со своими fingerprint и общий
fingerprint. Граф содержит root и сортированный definitions. Непрозрачные
выходы остаются opaque. Хеш вычисляется по компактному каноническому JSON;
ключи и required сортируются, значимый порядок tuple/union сохраняется.
Id контракта и сохранённые fingerprint не входят в семантический хеш.

`parseContractSnapshot` и `parseContractSnapshotV2` проверяют недоверенные данные,
пересобирают замороженные контейнеры, отклоняют несовпадение fingerprint.
V2 проверяет все три хеша, отсутствующие цели ссылок и недостижимые definitions.
V1 и V2 не подменяют друг друга. При переходе создавайте отдельный согласованный
baseline, не перезаписывайте рассмотренный файл автоматически.

## Направления сравнения

`compareContracts(previousSchema, nextSchema, options?)` и
`compareContractSnapshots(previous, next, options?)` работают с v1.
`compareContractsV2` и `compareContractSnapshotsV2` — с графами; `side` по умолчанию
`input`, допускается `output`. Режимы `compatibility`:

- `backward`: previous ⊆ next;
- `forward`: next ⊆ previous;
- `full`: оба направления.

```ts
import { string } from "@safe-shape/core";
import { compareContracts } from "@safe-shape/compat";
const previous = string({ minLength: 3, maxLength: 40 });
const next = string({ minLength: 1, maxLength: 80 });
compareContracts(previous, next, { compatibility: "backward" }).status; // safe
compareContracts(previous, next, { compatibility: "forward" }).status; // breaking
```

Id версий одного контракта должны совпадать, иначе результат unknown. Рекурсивные
пары проверяются коиндуктивно; lazy-id и топология повторного использования не
являются runtime-семантикой. Пути findings семантические, не пути хранения definitions.

## Отчёты и решения о миграции

Отчёт содержит compatible, status, compatibility, fingerprint обеих сторон и
замороженные findings. Статусы: `safe` — доказано, `breaking` — известен класс
контрпримеров, `risky` — достоверный, но недоказанный риск, `unknown` — доказательства
нет, `annotation-only` — изменились только не-runtime аннотации.
Finding содержит code, path, direction, предыдущий/следующий узел, message и suggestion.

`createMigrationDiagnostics(report)` даёт JSON-friendly решение, счётчики,
summary и действия без изменения доказательства: safe/annotation-only → compatible,
breaking → migration-required, risky/unknown → manual-review. `migrationRequired`
истинен только для breaking; `manualReviewRequired` — для risky/unknown.
Helper не генерирует миграции и не принимает новый baseline.

## Правила

Нормативная [матрица](https://github.com/dev-ik/safe_shape/blob/v3.5.0/docs/ru/compatibility-matrix.md) задаёт правила для всех видов схем.
Нативные ограничения сравниваются как множества допустимых значений.
Enum/literal проверяются точно, включая pattern, format и multipleOf цели.
После проверки opaque-ограничений never содержится в любой цели, unknown содержит
любой источник; сужение unknown — breaking.

Одинаковые discriminatedUnion/intersection поддерживаются; неподдержанные
структурные отношения дают unknown. При чтении snapshot перепроверяются структура
и уникальность дискриминатора. Шаблоны/форматы хранятся и проверяются; смена
неподдающихся доказательству pattern/format даёт unknown. При их совпадении
длина по-прежнему анализируется направленно.

Для multipleOf доказывается расширение десятичной решётки: удаление ограничения
или шаг цели, делящий шаг источника. Другие случаи консервативны. Ограничения
ключей record используют строковые правила на пути `<key>`, значения — на `*`.

Политики объектов сохраняются. При той же форме reject → permissive безопасен
в направлении принятия, обратно — breaking. Strip ↔ passthrough меняет выход
и считается breaking. Добавление universal identity unknown в passthrough может
быть безопасно; более узкие поля дают breaking, opaque остаются unknown.
Удаление identity-поля в passthrough безопасно; transforms требуют отдельного анализа.

Кортежи сравниваются позиционно и с массивами с учётом эффективной длины.
Union-removal даёт breaking при конечном непокрытом значении или доказанно
непересекающейся населённой ветви; возможное коллективное покрытие остаётся unknown.
Коды включают `tuple.array.changed`, `contract.target.empty`; пустая цель даёт
breaking только при конструктивном доказательстве непустоты источника.

## Непрозрачное поведение

Callback нельзя восстановить из snapshot. Анонимные правила дают unknown.
Равные стабильные id — утверждение автора о неизменной семантике, не сравнение
кода функций. Меняйте id вместе с поведением; пустые id запрещены.
Совпадающие стабильные opaque output id считаются неизменным поведением.

## HTTP и контрпримеры

`createHttpCompatibilityPresentation(report, { exchange: "request" | "response" })`
сохраняет доказательство и добавляет роли: request — клиент производит, сервер
потребляет; response — наоборот. Backward относится к consumer, forward — к producer,
full — к обоим. Сохраняются status, fingerprint, side и исходные findings.

`createContractCounterexamples` добавляет конкретные свидетельства в ограниченном
поддержанном домене; отсутствие значения не доказывает безопасность. См.
[контрпримеры](https://github.com/dev-ik/safe_shape/blob/v3.5.0/docs/ru/counterexamples.md).

## Связи producer/consumer

С 3.2 `checkContractConnection(producerSnapshotV2, consumerSnapshotV2)` сравнивает
output производителя с input потребителя. ContractConnectionReport содержит
идентичности, comparison, migration и counterexample с реально производимым
значением либо явной причиной отсутствия. См. [связи](https://github.com/dev-ik/safe_shape/blob/v3.5.0/docs/ru/contract-connections.md).

В версии 3.3.0 `checkSchemaConnection(producer, consumer, { producerId?, consumerId? })`
анализирует живые схемы по верхней границе выхода. Значения id по умолчанию:
`producer`, `consumer`. `SchemaConnectionReport.evidence` равен `output-bound`;
producer fingerprint относится к границе. Только доказанное включение даёт
compatible, недоказанное — unknown/manual-review, контрпример не строится.
Callbacks не исполняются, lazy-getters могут разрешаться. Старые snapshot API
не меняются. См. [проверяемые выходы](https://github.com/dev-ik/safe_shape/blob/v3.5.0/docs/ru/checked-output.md).
