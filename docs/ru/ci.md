# Проверки контрактов в CI

[English](../ci.md) | **Русский**

Зафиксируйте рассмотренный snapshot, соберите текущий модуль схемы и сравните
его с baseline. Проверяющий job никогда не обновляет baseline автоматически:
это решение об API, рассматриваемое вместе со схемой.

```json
{
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "contracts:snapshot": "safe-shape contract snapshot --module ./dist/contracts/user.js --export userSchema --id user --format v2 --out ./.safe-shape/user.contract.json",
    "contracts:check": "safe-shape --json contract check --module ./dist/contracts/user.js --export userSchema --against ./.safe-shape/user.contract.json --side input"
  }
}
```

Перед первым локальным snapshot создайте .safe-shape и соберите ESM-модуль без
console output. V1 остаётся default для нерекурсивных baselines: исключите format
при создании и side при проверке. V2 нужен для рекурсии и отдельных сторон.

## Переносимый job

```sh
npm ci
npm run build
npm run contracts:check > contract-report.json
```

Коды: 0 — safe/annotation-only, 2 — breaking/risky/unknown, 1 — operational error.
Сохраняйте JSON артефактом даже при ненулевом коде. Migration.decision:
compatible — отношение доказано, migration-required — доказан breaking,
manual-review — риск/нет доказательства. Это подсказки, не автоматические правки.

Для GitHub Actions:

```yaml
name: contracts
on: [push, pull_request]
permissions:
  contents: read
jobs:
  compatibility:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: "24"
          cache: npm
      - run: npm ci
      - run: npm run build
      - run: npm run contracts:check > contract-report.json
      - if: always()
        uses: actions/upload-artifact@v6
        with:
          name: contract-report
          path: contract-report.json
```

Для GitLab CI:

```yaml
contracts:
  image: node:24
  script:
    - npm ci
    - npm run build
    - npm run contracts:check > contract-report.json
  artifacts:
    when: always
    paths:
      - contract-report.json
```

## Разбор изменений

После build запустите `node examples/check-contract-evolution.mjs packages/cli/dist/cli.js`.
В установленный проект скопируйте contract-evolution.mjs и check-contract-evolution.mjs,
установите safe-shape и запустите второй файл. Runner создаёт свой временный baseline,
проверяет input/output, safe/breaking/unknown/errors и неизменность baseline bytes,
удаляя только свой каталог. Consumer-check повторяет это из архивов.

HTTP-роли можно добавить через createHttpCompatibilityPresentation; они описывают
отношение, не обнаруженные сервисы. Backward request защищает server consumer,
forward response — server producer. Для обоих направлений выбирайте full.
При migration-required согласуйте затронутые стороны; при manual-review изучите
opaque-правило/недостающее доказательство. Равный id — утверждение автора; меняйте
его при смене callback-семантики. После review явно создайте новый baseline и
зафиксируйте вместе со схемой, не для механического «озеленения» CI.

## Несколько контрактов и связи

Замените contracts:check на `safe-shape --json contract check-many --manifest ./contracts.json`.
[Формат](api/cli.md) использует пути относительно manifest. Все записи попадают
в results даже после ошибки; exit 1 имеет приоритет над 2. Рассматривайте полный
отчёт, а не только код. Baseline approval остаётся отдельным для каждого контракта.

С 3.2 check-connections сравнивает зарегистрированные producer output и consumer
input v2 snapshots без модулей и изменения baselines; см. [связи](contract-connections.md).
Для Markdown-артефактов используйте [review](contract-review.md).
