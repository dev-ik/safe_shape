# Контрпримеры контрактов

[English](../counterexamples.md) | **Русский**

С версии 3.1 `createContractCounterexamples(previousSnapshot, nextSnapshot, options?)`
из compat/общего пакета возвращает глубоко неизменяемые синтетические корневые
значения. Оба snapshots должны быть одного формата v1/v2. Compatibility по
умолчанию backward, также forward/full; side по умолчанию input.

```js
import { number, createContractSnapshotV2, createContractCounterexamples } from "safe-shape";
const previous = createContractSnapshotV2(number({ minimum: 0 }));
const next = createContractSnapshotV2(number({ minimum: 1 }));
const examples = createContractCounterexamples(previous, next);
// backward, input, source previous, target next, path [], available, value 0
```

Backward ищет previous→next, forward — наоборот, full возвращает оба по порядку.
Значение принимается source и отклоняется target в поддержанной семантике snapshot.
Это полный корневой payload, не фрагмент по пути finding. Например, minLength
2→3 даёт «aa»; расширение даёт свидетельство в обратном направлении.

Сохраняйте исходные comparison/migration/HTTP reports: пример не меняет решение,
не доказывает отсутствие других нарушений и не обнаруживает реальных клиентов.

## Поддержанный домен и ограничения

Поддержаны JSON scalar literal, enum, boolean, native number, строки с min/maxLength,
unknown, never, конечные objects/arrays/unions, optional/nullable; с 3.2 также
кортежи и discriminated unions. Политики объектов и отсутствие optional сохраняются.
Refinements, специальные encoded literals (включая -0), pattern/format, references,
intersections и transforms не поддержаны. Построение по output не доказывает
производимость и возвращает unsupported-side.

Поиск пробует значения двух корней, числовые границы и соседние IEEE-754 значения,
округлённые границы и фиксированные seeds. Не более 128 проверок кандидатов на
направление; это не ограничение parsing snapshot или размера scalar literal.
Поиск не исчерпывающий, в частности для multipleOf с диапазоном.

Для строк синтезируются повторы a/b длины 0, 1, границ и соседних неотрицательных
длин. Максимум синтеза — 1024 code points, превышение отсекается до выделения памяти.
Это не усечение заданных literal/enum значений. Проверка длины использует Unicode
code points, поиск исключённых enum строк неполон.

| Причина unavailable | Значение |
| --- | --- |
| unsupported-side | Производимость output вне домена |
| unsupported-domain | Корни нельзя достоверно восстановить |
| candidate-limit | Исчерпаны 128 попыток |
| construction-limit | Превышен ресурс построения |
| no-witness-found | В ограниченном наборе свидетеля нет |

Ни одна причина не означает compatible. Неверные snapshots/опции и смешанные
форматы выбрасывают исключение. Типы: ContractCounterexample, CounterexampleValue,
CounterexampleUnavailableReason. Найденное свидетельство важнее пропущенных длин;
исчерпание попыток даёт candidate-limit. Construction-limit публичен с 3.1.

## Составные значения

Генератор строит допустимый source seed и меняет по одному полю/элементу,
перебирая union-ветви по порядку. Каждый результат проверяется против обоих полных
корней. Возможные примеры: `{}` при добавлении required, вложенный user.name при
сужении длины. Prototype-подобные ключи сохраняются как собственные JSON-свойства;
выходные массивы/объекты глубоко заморожены.

| Ресурс на направление | Лимит |
| --- | --- |
| Глубина схемы | 4, корень — 0 |
| Узлы схемы | 128 на корень |
| Поля объекта / ветви union | 16 / 8 |
| Длина генерируемого массива / кортежа | 16 |
| Локальные кандидаты | 16 на пул |
| Локальные проверки и входы генератора | 4096 общих единиц работы |
| Корневые кандидаты | 128 |
| Узлы развёрнутого значения | 1024 |
| Строки/ключи составного значения | 65536 UTF-16 units суммарно |

Лимиты размера проверяются до корневой validation/serialization; общие поддеревья
считаются по каждому вхождению. Неканонические required/optional во внешних snapshots
не поддержаны. Декартово произведение не перебирается: сложные многополевые случаи
могут остаться unavailable, не меняя исходное решение совместимости.

## CLI и проверка бюджета

```sh
safe-shape --json contract check --module ./amount.mjs --against ./amount.json --counterexamples
safe-shape --json contract check-many --manifest ./contracts.json --counterexamples
```

Флаг добавляет counterexamples в одиночный результат/оценённые batch entries.
Без флага или с false прежний вывод сохраняется. Manifest, exit-коды, решения
и baselines не меняются; для v2 output явно возвращается unsupported-side.
Добавьте markdown для [review-артефакта](contract-review.md).

После build выполните `node examples/check-contract-evolution.mjs packages/cli/dist/cli.js`.
Тот же сценарий проверяется из установленных архивов. Benchmarks-check контролирует
заранее заданные бюджеты: scalar и string отдельно 10000 вызовов за 5 секунд,
composite — 1000 за 5 секунд. Проверяются parsing snapshot и результаты.
Это бюджет fixture, не универсальная SLA или сравнение с Zod. Кортежи/теги
проверяются исходными runtime-схемами в обоих направлениях и форматах.
