# CLI

[English](https://github.com/dev-ik/safe_shape/blob/v3.5.0/packages/cli/README.md) | **Русский**

Пакет `@safe-shape/cli` предоставляет бинарник `safe-shape`; общий пакет устанавливает
его тоже. Авторизация не нужна. Пути относительны текущему каталогу, кроме явно
указанных manifest-relative путей. Родительский каталог `--out` создайте заранее.

## Основные команды

```sh
safe-shape --json doctor
safe-shape schema export --module ./schema.mjs --export userSchema
safe-shape --json schema validate --module ./schema.mjs --export userSchema --input ./user.json
safe-shape schema types --module ./schema.mjs --export userSchema --name User --side output
mkdir -p .safe-shape
safe-shape contract snapshot --module ./schema.mjs --export userSchema --id user --format v2 --out ./.safe-shape/user.json
safe-shape --json contract check --module ./schema.mjs --export userSchema --against ./.safe-shape/user.json --side input --compatibility backward
safe-shape --json contract check-many --manifest ./contracts.json
safe-shape --json contract check-connections --manifest ./connections.json
```

Doctor проверяет локальную доступность runtime. Schema-команды загружают доверенный
JavaScript ESM-модуль; TypeScript сначала соберите. `--export` по умолчанию default.
Модули должны быть тихими, иначе их console output смешается с JSON CLI.

## Export, validate, types

`schema export` создаёт JSON Schema. `--schema` распознаёт официальные URI Draft
2020-12 и Draft 7; неизвестный URI выводится буквально с renderer 2020-12.
`--id` задаёт абсолютный URI `$id` без fragment. `--out` сохраняет артефакт.
Метаданные title/description/examples сохраняются. Lazy экспортируется через
определения и $ref; диалекты различаются `$defs`/`definitions` и синтаксисом tuple.

Enum → enum, unknown → `{}`, never → `{ "not": {} }`, discriminatedUnion → oneOf,
intersection → allOf. Нативные string/number/record ограничения сохраняются.
Экспорт input-side: strip и passthrough разрешают дополнительные поля.
Непредставимое правило не создаёт частичного артефакта: stderr JSON содержит
`error.code: "json_schema_export_failed"` и `error.issues`, exit 1.

`schema validate --input file` читает JSON; `--input -` читает stdin.
`--out` сохраняет весь отчёт. Команда использует async parsing и поддерживает
sync/async схемы. Валидный вход: valid true, exit 0; невалидный: valid false,
issues и exit 1. Warnings сохраняются, но сами по себе код не меняют.
Сохраняются custom-пути и рекурсивные union branches.

`schema types --name User --side input|output` генерирует объявления;
name по умолчанию SchemaOutput, side — output. С 3.2 поддержана рекурсия через
именованные определения. Непроверенный output transform остаётся unknown;
непродуктивные циклы alias отклоняются, неполное объявление не выпускается.

## Snapshots и проверки

Snapshot v1 используется по умолчанию; `--format v2` нужен для рекурсии и отдельных
input/output fingerprint. Id по умолчанию равен имени export. Без out вывод идёт
в stdout. Здесь `--id` — id контракта, а не JSON Schema URI.

`contract check` обнаруживает формат baseline. `--compatibility` — backward по
умолчанию, также forward/full. Side допустим только для v2, по умолчанию input.
Для v1 указание side — operational error. Выходы:

| Код | Значение |
| --- | --- |
| 0 | safe или annotation-only |
| 2 | breaking, risky или unknown |
| 1 | Аргументы, I/O, некорректный snapshot/fingerprint |

Результат совместимости идёт в stdout, ошибки CLI — в stderr. JSON содержит
format и migration с решением compatible/migration-required/manual-review,
счётчиками и диагностикой. Baseline никогда не обновляется командой проверки.

## Пакетная проверка

```json
{
  "version": 1,
  "contracts": [
    { "name": "request", "module": "./dist/user.js", "export": "requestSchema", "against": "./.safe-shape/request.json", "compatibility": "backward", "side": "input", "exchange": "request" },
    { "name": "response", "module": "./dist/user.js", "export": "responseSchema", "against": "./.safe-shape/response.json", "compatibility": "forward", "side": "output", "exchange": "response" }
  ]
}
```

Пути относительны manifest. Name/module/against обязательны и непусты; имена
уникальны. Export по умолчанию default, compatibility — backward, v2 side — input;
для v1 исключите side. Exchange добавляет только HTTP-представление, не выбирает
направление/сторону. Неизвестные поля, версии, дубли и пустой список отклоняются
до загрузки модулей. Записи выполняются последовательно с обычным ESM-кешем.

Отчёт содержит ok, command, абсолютный manifest, counts и упорядоченные results.
Counts: total, compatible, migrationRequired, manualReviewRequired, errors;
счётчики migration/review могут пересекаться. Результаты содержат пути, format,
полный отчёт, migration и необязательный http. Ошибка одной записи не останавливает
следующие и не получает выдуманного migration-решения.

Приоритет кодов: любая operational error → 1, иначе review/migration → 2, иначе 0.
Полный отчёт, включая ошибки записей, идёт в stdout. Неверный manifest даёт
invalid_contract_manifest в stderr без частичного stdout. Для сохранения отчёта
используйте перенаправление в отдельный файл, никогда в baseline/manifest/schema.

`--counterexamples` добавляет ограниченные синтетические корневые примеры к check
и check-many, не меняя default/exit. `--markdown` создаёт артефакт review и не
совместим с json/out. См. [контрпримеры](https://github.com/dev-ik/safe_shape/blob/v3.5.0/docs/ru/counterexamples.md) и [review](https://github.com/dev-ik/safe_shape/blob/v3.5.0/docs/ru/contract-review.md).

## Связи и JSON

Check-connections читает только v2 snapshots из явного manifest, не исполняя
модули. Принимает manifest/json; формат и результаты описаны в [связях](https://github.com/dev-ik/safe_shape/blob/v3.5.0/docs/ru/contract-connections.md).
Текст показывает стороны, пути, причины, действия и подтверждённый выходной
контрпример либо причину отсутствия. Приоритет кодов тот же.

JSON-envelope сохраняет ok и command. Operational error содержит
`error: { code, message }`; validation failure — valid false и issues;
compatibility failure — compatible false, status, findings и migration.
CLI не требует auth. Схемы — доверенный код и могут сами выводить данные.
См. [CI](https://github.com/dev-ik/safe_shape/blob/v3.5.0/docs/ru/ci.md) для сохранения артефактов и политики baseline.

## API workflow (3.4.0)

```sh
safe-shape api export --module ./api.mjs --title "My API" --version 1.0.0 --out ./openapi.json
safe-shape api snapshot --module ./api.mjs --out ./api.contract.json
safe-shape --json api check --module ./api.mjs --against ./api.contract.json
```

Экспорт OpenAPI 3.1, сохранение immutable API snapshots и проверка обновлений сервера относительно существующих клиентов. Exit codes: 0 для совместимых изменений, 2 для миграции или ручного review, 1 для operational errors. См. [API workflow](https://github.com/dev-ik/safe_shape/blob/v3.5.0/docs/ru/api/api.md).
