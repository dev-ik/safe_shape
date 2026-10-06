# Отчёты валидации

[English](https://github.com/dev-ik/safe_shape/blob/v3.5.0/packages/validation/README.md) | **Русский**

`@safe-shape/validation` преобразует результаты parsing в JSON-friendly отчёты.

```ts
import { object, string } from "@safe-shape/core";
import { validateSchema, validateSchemaAsync } from "@safe-shape/validation";
const user = object({ id: string() });
const report = validateSchema(user, { id: "user_1" });
```

`validateSchema<T>(schema: Schema<T>, input: unknown): ValidationReport<T>`;
для async-правил используйте `validateSchemaAsync`, возвращающий Promise отчёта.

```ts
type ValidationReport<T> =
  | { readonly valid: true; readonly data: T; readonly warnings?: readonly Warning[] }
  | { readonly valid: false; readonly issues: readonly Issue[]; readonly warnings?: readonly Warning[] };
```

Отказ проверки возвращается без исключения. Warnings присутствуют на обеих
ветвях только при наличии предупреждений; массив заморожен. Нативные коды и
пути сохраняются, включая not_multiple_of, ошибки строковых ключей и значений
record по одному пути.

Invalid_union сохраняет упорядоченные рекурсивные branches с индексами,
кодами и полными путями: ветвь не выбирается и дерево не уплощается.
Custom-пути refine/refineWithIssues остаются относительно содержащей схемы,
порядок collector и код custom сохраняются.

Данные отражают действительный выход: strip удаляет лишние поля, passthrough
сохраняет; default reject возвращает unexpected_property. Отчёт подходит для
инструментов и транспортных границ. Перед логированием применяйте политику
редактирования чувствительных данных приложения.
