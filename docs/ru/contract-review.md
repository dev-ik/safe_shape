# Артефакты проверки контрактов

[English](../contract-review.md) | **Русский**

С версии 3.1 существующие compatibility/migration и необязательные counterexample
reports можно представить в Markdown:

```sh
safe-shape contract check --module ./schema.mjs --against ./baseline.json --counterexamples --markdown > review.md
safe-shape contract check-many --manifest ./contracts.json --counterexamples --markdown > review.md
```

Артефакт содержит решение, направление, input/output, fingerprint, пути, причины,
действия и полные JSON-свидетельства, когда они доступны. Batch сохраняет HTTP-роли,
если exchange задан, а также operational errors, продолжая остальные записи.
Unavailable явно помечается; авторитетным остаётся исходное решение. Отчёт не
обнаруживает развёрнутых клиентов и не создаёт миграцию.

Без counterexamples Markdown показывает findings/migration. Заголовки и диагностика
экранируются, JSON защищён code fences. См. [лимиты](counterexamples.md).
Вывод идёт в stdout и при совместимости, и при несовместимости/смешанных ошибках.
Exit: 0 — compatible, 2 — migration/review, 1 — operational error. Неверные manifest/
аргументы дают stderr без артефакта. В CI сохраняйте файл даже при ненулевом коде:

```sh
status=0
safe-shape contract check-many --manifest ./contracts.json --counterexamples --markdown > review.md || status=$?
# Сохраните review.md как артефакт CI.
exit "$status"
```

Markdown допустим только для check/check-many, несовместим с json/out; конфликт
отклоняется до загрузки модулей. Перенаправляйте в отдельный файл, не baseline.
Default JSON/text не меняется. CLI создаёт локальный файл и не публикует PR-комментарии,
не меняет baselines, не создаёт теги и не публикует пакеты.
