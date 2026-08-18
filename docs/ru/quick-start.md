# Быстрый старт

[English](../quick-start.md) | **Русский**

За несколько шагов вы установите SafeShape, провалидируете неизвестное значение
и создадите baseline контракта для code review и CI.

## Требования

- Node.js `>=20.10`
- TypeScript-проект, совместимый с ESM

## Установка

Для полного runtime и tooling API установите общий пакет:

```sh
npm install safe-shape
```

## Первая схема

```ts
import { integer, object, string, type Infer } from "safe-shape";

const User = object({
  id: string({ minLength: 1 }),
  age: integer({ minimum: 0 }).optional(),
});

type User = Infer<typeof User>;

const result = User.safeParse({ id: "user_1", age: 42 });

if (!result.success) {
  console.error(result.error.issues);
} else {
  const user: User = result.data;
  console.log(user.id);
}
```

`safeParse()` возвращает discriminated result. Используйте `parse()`, если
невалидное значение должно приводить к исключению. SafeShape не преобразует
`{ age: "42" }` автоматически: изменение входных данных требует явного
`transform()`.

## Диагностика

Каждая неуспешная проверка содержит стабильные структурированные issues:

```ts
const result = User.safeParse({ id: "", age: -1 });

if (!result.success) {
  for (const issue of result.error.issues) {
    console.error(issue.code, issue.path, issue.message);
  }
}
```

Пути представлены массивами и остаются машиночитаемыми в validation reports,
HTTP helpers, Standard Schema и CLI.

## Генерация артефактов

Скомпилируйте модуль со схемой в ESM, затем передайте CLI путь к JavaScript:

```sh
safe-shape --json schema export \
  --module ./dist/contracts/user.js \
  --export User \
  --schema https://json-schema.org/draft/2020-12/schema \
  --out ./dist/contracts/user.schema.json

safe-shape --json schema types \
  --module ./dist/contracts/user.js \
  --export User \
  --name User \
  --out ./dist/contracts/user.d.ts
```

## Контроль эволюции контракта

Создайте проверенный baseline формата v2:

```sh
safe-shape contract snapshot \
  --module ./dist/contracts/user.js \
  --export User \
  --id user \
  --format v2 \
  --out ./.safe-shape/user.contract.json
```

Проверяйте обратную совместимость input-контракта в CI:

```sh
safe-shape --json contract check \
  --module ./dist/contracts/user.js \
  --export User \
  --against ./.safe-shape/user.contract.json \
  --side input \
  --compatibility backward
```

Сохраняйте baseline в репозитории только после review. Не пересоздавайте его в
CI-задаче, которая должна обнаруживать изменения.

## Что дальше

- [Миграция с 1.x на 2.0](migration-1-to-2.md)
- [Полный Core API](../api/core.md) (EN)
- [Совместимость контрактов](../api/compat.md) (EN)
- [CLI API](../api/cli.md) (EN)
- [Русская документация](README.md)
