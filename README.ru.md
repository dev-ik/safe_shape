# SafeShape

[English](README.md) | **Русский**

Runtime-контракты для TypeScript: одна схема валидирует неизвестные данные во
время выполнения, выводит статические типы и служит источником артефактов для
инструментов.

[![npm package](https://img.shields.io/npm/v/safe-shape?label=npm%20safe-shape)](https://www.npmjs.com/package/safe-shape)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.10-339933)](package.json)
[![TypeScript](https://img.shields.io/badge/types-TypeScript-3178c6)](docs/type-system.md)
[![ESM](https://img.shields.io/badge/module-ESM-4b5563)](package.json)

<p align="center">
  <img src="docs/assets/safe-shape-demo.gif" alt="Демонстрация установки SafeShape, описания схемы, валидации, диагностики и экспорта через CLI" width="760">
</p>

## Зачем нужен SafeShape

Типы TypeScript исчезают во время выполнения. SafeShape делает границу доверия
явной: без скрытого приведения типов, с неизменяемыми схемами, стабильной
диагностикой и строгим выводом типов из реально исполняемого контракта.

SafeShape подходит для данных, которые пересекают границу доверия:

- запросов и ответов API;
- JSON-файлов и конфигурации;
- входных данных CLI и генерируемых артефактов;
- webhook payload и интеграционных событий;
- любого значения `unknown`, которое должно стать типизированным.

## Чем SafeShape отличается от Zod

Zod сегодня обладает более широкой экосистемой валидации. SafeShape намеренно
уже: runtime-схема здесь считается публичным контрактом, который должен быть
явным, документируемым, пригодным для инструментов и проверяемым перед релизом.

| Решение | Zod | SafeShape |
| --- | --- | --- |
| Основная цель | Валидация схем в стиле TypeScript-first | Платформа runtime-контрактов |
| API | Широкий набор удобных методов | Консервативная и стабильная поверхность |
| Приведение типов | Удобные coercion-сценарии | Никакого скрытого coercion; преобразования явные |
| Инструменты | Большая экосистема и встроенные конвертеры | Собственные CLI, JSON Schema, генерация TypeScript и validation reports |
| HTTP-границы | Обычно адаптеры или код приложения | Собственные framework-neutral HTTP helpers |
| Эволюция контракта | Зависит от инструментов приложения | Детерминированные input/output snapshots, fingerprints и консервативный compatibility report |
| Стандартные протоколы | Standard Schema | Нативный синхронный Standard Schema V1 и явный Standard JSON Schema adapter |
| Диагностика union | `invalid_union` сохраняет ошибки веток | Упорядоченная рекурсивная диагностика веток одинаково проходит через native errors, validation reports, CLI, HTTP и Standard Schema |
| Межполевые правила | Checks и refinements могут добавлять issues | Stable-id правила используют относительные пути или упорядоченный collector и сохраняют структуру на всех first-party границах |
| Release gate | Зрелая библиотека общего назначения | Тесты, примеры, benchmarks, consumer install, audit и pack dry-run |

Сравнение опирается на текущие официальные материалы Zod 4:
[API](https://zod.dev/api), [JSON Schema](https://zod.dev/json-schema) и
[экосистему](https://zod.dev/ecosystem).

Выбирайте Zod, когда важнее максимальная экосистема и самый широкий набор
валидаторов. Выбирайте SafeShape, когда нужен компактный контрактный слой с
явным runtime-поведением, стабильной диагностикой и первоклассными средствами
для CI и генерации артефактов.

## Быстрый старт

Установите полный runtime и набор инструментов:

```sh
npm install safe-shape
```

Опишите схему и проверьте неизвестные данные:

```ts
import { integer, object, string, type Infer } from "safe-shape";

const User = object({
  id: string({ minLength: 1, maxLength: 100 }),
  age: integer({ minimum: 0, maximum: 150 }).optional(),
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

SafeShape не приводит типы автоматически. Значение `{ age: "42" }` останется
невалидным, пока вы явно не добавите преобразование.

Подробный сценарий находится в [руководстве по быстрому старту](docs/ru/quick-start.md).

## CLI

CLI превращает runtime-контракты в проверяемые артефакты:

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

Зафиксируйте baseline контракта и блокируйте несовместимые изменения в CI:

```sh
safe-shape contract snapshot \
  --module ./dist/contracts/user.js \
  --export User \
  --id user \
  --format v2 \
  --out ./.safe-shape/user.contract.json

safe-shape --json contract check \
  --module ./dist/contracts/user.js \
  --export User \
  --against ./.safe-shape/user.contract.json \
  --side input \
  --compatibility backward
```

Режим `--json` предназначен для автоматизации. CLI не требует авторизации.
Snapshot v1 остаётся форматом по умолчанию; v2 нужно выбирать явно для
рекурсивных контрактов и раздельных input/output-графов.

## Пакеты

Установите `safe-shape`, если нужна вся публичная поверхность через одну
зависимость. Для строгих границ можно использовать отдельные пакеты:

| Пакет | Назначение |
| --- | --- |
| `safe-shape` | Общий пакет, реэкспортирующий runtime и tooling API |
| `@safe-shape/core` | Схемы, parsing, диагностика и вывод типов |
| `@safe-shape/compat` | Детерминированные snapshots и анализ совместимости |
| `@safe-shape/http` | Framework-neutral helpers для HTTP-границ |
| `@safe-shape/json-schema` | Экспорт JSON Schema |
| `@safe-shape/typescript` | Генерация TypeScript declarations |
| `@safe-shape/validation` | JSON-friendly validation reports |
| `@safe-shape/cli` | Инструменты командной строки |

## Принципы

- Runtime прежде всего.
- Стабильность API важнее количества возможностей.
- Неизменяемые схемы и результаты parsing.
- Богатая диагностика со стабильными путями issues.
- Сначала корректность, затем производительность.
- Производительность важнее удобства.
- Никакой магии и скрытого приведения типов.

## Документация

- [Русская документация](docs/ru/README.md)
- [Быстрый старт](docs/ru/quick-start.md)
- [Миграция с 1.x на 2.0](docs/ru/migration-1-to-2.md)
- [Полный каталог документации](docs/README.md) (EN)
- [Core API](docs/api/core.md) (EN)
- [Совместимость контрактов](docs/api/compat.md) (EN)
- [CLI API](docs/api/cli.md) (EN)
- [HTTP API](docs/api/http.md) (EN)
- [JSON Schema API](docs/api/json-schema.md) (EN)

## Локальная разработка

```sh
npm install
npm run build
npm run test
npm run docs:check
npm run release:check
```

Проверить собранный CLI без глобальной установки:

```sh
npm run cli:doctor
```

Исполняемые примеры находятся в [examples](examples/README.md):

```sh
npm run examples:check
```

## Статус проекта

SafeShape находится на стабильной версии `2.0.0`. Release gate проверяет
метаданные, сборку, типы, тесты, примеры, benchmarks, установку tarball в
тестовый consumer-проект, npm audit и package dry-run.
