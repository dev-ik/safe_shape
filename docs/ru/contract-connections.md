# Явные связи производителя и потребителя

[English](../contract-connections.md) | **Русский**

С версии 3.2 `checkContractConnection(producer, consumer)` принимает v2 snapshots
и проверяет включение output производителя в input потребителя. Их id могут
различаться: это разные стороны/версии. API не обнаруживает реальные развёрнутые
клиенты и не строит топологию сервисов автоматически.

```ts
import { object, enumeration, literal, createContractSnapshotV2, checkContractConnection } from "safe-shape";
const producer = createContractSnapshotV2(object({ state: enumeration(["active", "paused"]) }), { id: "api@2" });
const consumer = createContractSnapshotV2(object({ state: literal("active") }), { id: "web@1" });
const report = checkContractConnection(producer, consumer);
// migration.decision: migration-required; counterexample.value: { state: "paused" }
```

Замороженный отчёт содержит producer/consumer (id, side, fingerprint), compatible,
status, comparison с направлением backward, migration и counterexample.
Available-контрпример содержит value и конкретный producerInput. Он отвергается
consumer и получается неизменённым после parsing producerInput восстановимым
producer. Unavailable содержит причину, включая unsupported-production.

Поиск ограничен JSON-доменом [контрпримеров](counterexamples.md), сначала пробует
само значение как вход. Неполнота поиска никогда не означает безопасность.
Strip в выходной проекции разрешает только объявленные поля. Выход union может
включать никогда не выбираемые ветви: при непроизводимом контрпримере нужна ручная
проверка. Intersection может объединять выходы и остаётся opaque. Для transforms/
pipelines не угадываются свидетели. Рекурсивные native-графы допускают доказательство
без построения примера. Стабильные id правил — утверждения автора о семантике.

## Manifest CI

```json
{
  "version": 1,
  "connections": [
    { "name": "api-to-web", "producer": "api-v2.json", "consumer": "web-v1.json" }
  ]
}
```

```sh
safe-shape --json contract check-connections --manifest ./connections.json > connections-report.json
```

Пути относительны manifest, имена уникальны. Версия/поля проверяются до выполнения;
читаются snapshots, не исполняемые модули. Baselines только читаются.
Допустимы manifest/json. Результат содержит summary (total, compatible,
reviewOrMigration, errors) и упорядоченные results с report или error.
Код 0 — всё совместимо; 2 — миграция/ручная проверка; 1 — operational error,
которая имеет приоритет. Неверный manifest не создаёт частичного отчёта.

Текстовый режим показывает стороны, пути, причины, действия и подтверждённый
producer input/output либо причину отсутствия. JSON и exit-коды те же.
Для request: client output → server input; для response: server output → client input.
Зарегистрируйте каждую нужную версию явно; принятие baseline — отдельное решение.

В версии 3.3.0 [checkSchemaConnection](checked-output.md) позволяет отдельно
доказать включение верхней границы проверенного pipeline-выхода. Старый snapshot
API и его консервативная семантика остаются прежними.
