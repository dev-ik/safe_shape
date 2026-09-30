# Генерация TypeScript

[English](README.md) | **Русский**

`@safe-shape/typescript` создаёт объявления типов из runtime-схем.

```ts
import { object, string, enumeration } from "@safe-shape/core";
import { toTypeScriptType } from "@safe-shape/typescript";
const user = object({ id: string(), role: enumeration(["admin", "member"]) });
const source = toTypeScriptType(user, { name: "User", side: "output" });
```

`toTypeScriptType(schema, options?)` возвращает строку. `name` по умолчанию
`SchemaOutput`, `side` — output; допускается input. Метаданные не меняют типы.
Enum становится объединением литералов, unknown/never — соответствующими типами.
Discriminated union — объединение объектов, intersection — пересечение в скобках.
Длина/pattern/format строки остаются string, multipleOf — number, ограничения
ключей record не меняют `Readonly<Record<string, Value>>`.

Объекты reject/strip на выходе содержат только объявленные поля. Passthrough
добавляет `readonly [key: string]: unknown`, не ослабляя типы известных полей.
На входной стороне strip допускает неизвестные дополнительные поля.

Непрозрачные выходы transform генерируются как unknown: возвращаемый TypeScript
тип mapper не доступен через runtime introspection. На input сохраняется
исходный тип; `pipe(next)` на output использует проверенный тип следующей стадии.
Объявление описывает структуру, а не все runtime-ограничения или точную
достижимость выходных значений.

С 3.2 поддерживаются lazy-ссылки, повторное использование и взаимная рекурсия:
имена объявлений детерминированы. Некорректные и непродуктивные циклы type alias
отклоняются. Прежнее форматирование ациклических схем сохранено; до 3.2 ссылки
не поддерживались.
