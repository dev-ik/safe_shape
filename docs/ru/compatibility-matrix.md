# Матрица правил совместимости

[English](../compatibility-matrix.md) | **Русский**

Для backward source=previous, target=next; для forward наоборот; full проверяет оба.
Safe — включение доказано, breaking — известен класс контрпримеров, unknown —
нет доказательства, risky зарезервирован для обоснованного недоказанного риска.

## Общие правила

| Источник → цель | Результат |
| --- | --- |
| Семантически одинаковый узел | safe |
| Runtime одинаков, изменились аннотации | annotation-only |
| Never без нерешённого opaque → любая цель | safe |
| Любой источник без нерешённого opaque → unknown | safe |
| Unknown → более узкая цель | breaking |
| Населённый источник → доказанно пустая цель | breaking при конструктивном свидетельстве |
| Непустота источника неизвестна → пустая цель | unknown |
| Изменённое/анонимное opaque-поведение | unknown |
| Доказанно непересекающиеся примитивы | breaking |
| Неподдержанное отношение разных видов | unknown |

## Узлы

| Узел | Условие safe | Breaking / консервативный случай |
| --- | --- | --- |
| String | Интервал длины source внутри target, pattern/format те же | Свидетельство длины → breaking; иной pattern/format → unknown |
| Number/integer | Диапазон и целочисленная решётка включены | Свидетельство диапазона/целочисленности → breaking; недоказанная multipleOf-решётка → unknown |
| Literal | Цель принимает точное значение по всем native правилам | Отказ → breaking; opaque цели → unknown |
| Enum | Каждый source-member допустим | Отвергнутый конечный member → breaking; бесконечный source в enum обычно unknown |
| Array | Длины и элементы включены | Свидетельство длины/элемента → breaking; opaque распространяется |
| Tuple/array | Эффективная длина и каждый позиционный/общий элемент включены | Конструктивное свидетельство → breaking; ненаселённые альтернативные длины → unknown |
| Union | Каждая source-ветвь входит в одну target-ветвь | Непокрытый singleton или населённая непересекающаяся ветвь → breaking; возможное коллективное покрытие → unknown |
| Discriminated union / intersection | Одинаковая структура | Изменённая структура консервативно unknown |
| Record | Ключи и значения source включены | Нарушение любого отношения → breaking; opaque распространяется |
| Nullable/optional | Дополнительный null/undefined и inner включены | Удаление source-member → breaking; opaque распространяется |
| Transform input | Стабильный одинаковый id, inner включён | Native нарушение → breaking; иной/анонимный id → unknown |
| Opaque output | Одинаковый неанонимный id | Структурное breaking не утверждается; иной/анонимный id → unknown |
| Reference/recursion | Коиндуктивное включение definitions | Конкретное нарушение поля → breaking; неподдержанные shortcuts → unknown |

Literal учитывает Unicode code points, Unicode regex, точные форматы SafeShape,
диапазон, integer и точный десятичный multipleOf.

## Форма объектов

| Поле source → поле target | Результат |
| --- | --- |
| Required → optional с содержащей схемой | safe |
| Optional → required | breaking |
| Отсутствует при reject → новое optional | safe |
| Отсутствует при strip → новое optional | breaking: меняется принятие или выход |
| Отсутствует при passthrough → optional universal identity | safe |
| Отсутствует при passthrough → доказанно более узкое optional | breaking |
| Отсутствует при passthrough → opaque optional | unknown |
| Отсутствует → required | breaking |
| Присутствует → отсутствует при reject/strip | breaking |
| Identity-поле → отсутствует при passthrough | safe |
| Поле с transform/изменением выхода → отсутствует при passthrough | unknown |
| Присутствует с обеих сторон | Рекурсивное сравнение обязательности и схем |

Политики учитывают выход, поэтому строже одного принятия входа:

| Source / Target | reject | strip | passthrough |
| --- | --- | --- | --- |
| reject | safe | safe | safe |
| strip | breaking | safe | breaking |
| passthrough | breaking | breaking | safe |

Результаты policy и shape объединяются: любой breaking делает направление breaking.

## HTTP и исправления корректности

Request: producer client, consumer server; backward касается server consumer,
forward — client producer. Response: producer server, consumer client; backward
касается client consumer, forward — server producer. Full сохраняет обе роли.
Представление HTTP и migration не меняют доказательства.

Реализованы enum/literal, tuple/array, witness-based union, object policies,
рекурсия, стороны transforms и CI. Равные encoded literals после opaque guards
сравниваются safe внутри графовых union/wrappers: union(string, null) эквивалентен
nullable(string) в обоих направлениях/сторонах. RFC 0043 исправил false-breaking,
не меняя snapshot bytes/формат отчёта; anonymous refinements остаются unknown.

Собственные ключи __proto__, constructor и другие участвуют как обычные поля.
Required не может ссылаться только на унаследованное свойство. RFC 0044 исправил
потерю таких ключей в описаниях/артефактах. Старые затронутые baselines могут быть
некорректны или менять fingerprint; заменяйте только после просмотра runtime-схемы,
не принимайте изменение хеша автоматически.
