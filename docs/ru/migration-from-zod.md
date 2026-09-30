# Переход с Zod

[English](../migration-from-zod.md) | **Русский**

Начинайте с одной границы приложения, сравнивайте принятие входов и получаемые
выходы, затем расширяйте миграцию. Версия сравнения закреплена в
[quality/package.json](../../quality/package.json).

| Zod | SafeShape | Что проверить |
| --- | --- | --- |
| z.object(shape) | object(shape, { unknownProperties: "strip" }) | Default SafeShape — reject |
| z.strictObject(shape) | object(shape) | Лишние поля отклоняются |
| z.looseObject(shape) | object(shape, { unknownProperties: "passthrough" }) | Дополнительные значения остаются unknown |
| .pick({ id: true }) | .pick(["id"]) | Массив имён |
| .partial(), .required() | Те же методы | Неглубокая композиция до объектных правил |
| .extend(shape) | .extend(shape) | Замена существующих полей запрещена |
| .transform(fn).pipe(next) | Те же методы | Явное преобразование с проверкой выхода |
| z.infer, z.input, z.output | Infer, InferInput, InferOutput | Компилируйте реальных потребителей |
| .refine(async fn) | .refineAsync(fn, { id }) | Явные async entry points |

Одинаковые названия не гарантируют одинаковую семантику. SafeShape считает длину
строки в Unicode code points, а не UTF-16 units, использует точные собственные
форматы, immutable-контейнеры и readonly-коллекции. Сторонние Standard Schema
resolvers могут игнорировать warnings; при необходимости читайте нативный результат.

## Ограниченный source migration tool

В собранном репозитории с development/quality зависимостями:

```sh
node scripts/migrate-zod.mjs --input ./schemas.ts --out ./schemas.safe.ts
npm run migration:check
```

Инструмент использует development TypeScript, не добавляет зависимостей в core/CLI
и не исполняет источник. Допускается schema-only модуль с import `{ z }` или
`* as z` из zod/zod/v4, const-схемами, необязательными infer/input/output aliases.
Поддержаны string, number, boolean, unknown, never, JSON literals, уникальные
строковые enums, arrays, tuples, unions, objects с сохранением policy, optional,
nullable, неповторяющиеся min/max чисел/массивов и ссылки на предыдущие схемы.

Callbacks, coercion, defaults, нулевые literals (различие -0), string bounds/formats,
int, lazy, object composition, динамические выражения/imports и прочие конструкции
дают line/column diagnostics для ручного переноса. При любой неподдержанной
конструкции частичного артефакта нет. Out должен быть новым отдельным файлом;
существующий файл не перезаписывается. Без out исходник идёт в JSON stdout.
Exit: 0 — генерация, 2 — ручная миграция, 1 — I/O/аргументы.

Проверяйте сгенерированный код. Дифференциальные тесты сравнивают принятие и
успешный выход, а не vendor-specific ошибки. [Connected example](../../examples/connected-contracts.mjs)
проверяет композицию, HTTP, рекурсию и CI; [form fixture](../../quality/form.mjs) —
реальный React Hook Form Standard Schema resolver, nested errors, async и warnings.
Quality-check собирает browser-пример в .tmp/quality/browser и устанавливает
архивы в изолированные form/server/CI проекты. Скрипт/VM не заменяет независимого
разработчика и не является доказательством production adoption.
