# Миграция с SafeShape 2.x на 3.0

[English](../migration-2-to-3.md) | **Русский**

SafeShape 3.0 объединяет готовые возможности 2.1 с Diagnostics v2 и явным
асинхронным парсингом. Обновляйте все пакеты SafeShape до одной major-версии.

У `Issue` появилось обязательное поле `severity: "error"`. Обновите точные
snapshots, строгие декодеры и вручную созданные issues. Тип форматированного
объекта переименован в `FormattedDiagnostic`; имя `Diagnostic` теперь означает
нативный union `Issue | Warning`. У custom issue стабильный id доступен как
`ruleId`.

Успех без предупреждений по-прежнему имеет форму `{ success: true, data }`.
При предупреждениях появляется frozen-массив `warnings`; при ошибке он доступен
как `error.warnings`. `parse()` возвращает только данные, поэтому для обработки
предупреждений используйте `safeParse()`.

Для синхронных предупреждений доступны `warn()` и
`warnWithDiagnostics()`. Параметр `params` содержит только JSON-safe данные,
которые копируются и замораживаются. Ограничения: 20 уровней, 1 000 элементов
и 16 384 символа сериализованного JSON.

Асинхронные правила создаются через `refineAsync()`,
`refineAsyncWithDiagnostics()`, `warnAsync()` и
`warnAsyncWithDiagnostics()`. Для них используйте `safeParseAsync()` или
`parseAsync()`. Синхронный вызов заранее обнаруживает вложенные async-правила и
бросает `TypeError`; async-правила исполняются последовательно и сохраняют
детерминированный порядок диагностик.

Асинхронные варианты также есть в `@safe-shape/validation` и
`@safe-shape/http`; CLI `schema validate` ожидает async-схемы автоматически.
Standard Schema возвращает Promise только для схем с async-работой и передаёт
предупреждения в необязательном расширении `warnings`.

Opaque identity записывается в Contract IR как `warning:<id>`,
`async-error:<id>` или `async-warning:<id>`. JSON Schema exporter явно
отклоняет такие правила. После миграции запустите typecheck, тесты, сравнение
контрактов и полный release gate; изменения baseline проверяйте вручную.
