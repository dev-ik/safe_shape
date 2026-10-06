# Результаты проверки SafeShape 3.5.0

[English](../release-evidence-3.5.md) | **Русский**

Статус: опубликован в npm 2026-10-06; у всех десяти пакетов `latest=3.5.0`.
См. [проверку опубликованного релиза](#опубликованный-релиз--2026-10-06): CI,
provenance, checksum архивов и установка из npm.

## Проверки до публикации

2026-10-06 полный первоначальный `npm run release:check` прошёл на Node 20.10.0:
сборка/typecheck, metadata/docs, workspace tests, примеры, benchmarks,
installed consumers, quality/migration, оба audits и pack dry-run. Эта проверка
использовала версии до синхронизации и не заменяет проверку кандидата 3.5.0.

Последующий MCP-набор прошёл 19/19, включая пять исправлений независимого review,
вывод типов, реальный SDK stdio и явную инициализацию/list/call для MCP 2025-06-18.
Тесты SDK-клиента 1.32.1 согласуют ревизию 2025-11-25; новые ревизии не заявлены.

Реальный Codex CLI 0.159.0 выполнил шесть read-only MCP-вызовов: discovery,
экспорт, неверная валидация, исправленная валидация, backward/input comparison
и экспорт tool definition. Глобальные настройки клиента не менялись. Первый
trace — `.tmp/mcp-agent-events.jsonl`; trace итогового кандидата сохраняется
в `.tmp/release-3.5/agent-events.jsonl`.

## Review и оставшаяся проверка

Независимый read-only review нашёл пять Important и ни одного Critical.
Каждое замечание воспроизведено падающим тестом до исправления: отсутствие
корневого object type для SDK, лишняя заморозка payload, продолжение после
синхронного deadline, игнорирование настроенной глубины и исключение safe-export.
Все шесть регрессионных случаев (depth отдельно для адаптера и сервера) проходят.
Доверие к callbacks/transitive imports остаётся явно принятой границей.

Финальный `npm run prepare:release` прошёл с exit 0 на Node 20.10.0: build,
metadata/docs, typecheck, 326 workspace tests (19 MCP), примеры, benchmark runner
и бюджеты, installed consumers, quality fixtures, migration, оба audits без
уязвимостей и pack checks. Созданы десять архивов 3.5.0. Каждая запись SHA256SUMS
независимо пересчитана; проверены manifest, версии внутренних зависимостей и
права executable MCP 0755. `cli:doctor` сообщает 3.5.0 и успешный результат.

Итоговый trace реального агента подтверждает шесть успешных MCP-вызовов на
кандидате 3.5.0: неверные данные false с путём `["name"]`, исправленные true,
решение миграции compatible. После записи evidence/status прошли `docs:check`
(259 Markdown-файлов) и whitespace checks; runtime-файлы архивов не менялись.
Логи — `.tmp/release-3.5/final-prepare-release.log`; SHA256SUMS — в
`release-artifacts/`. Старые архивы сохранены в
`.tmp/release-3.5/previous-artifacts/` перед сборкой новых.

На этом этапе до публикации remote CI, npm publisher configuration, тег, push
и публикация ещё не выполнялись. Эти шаги завершены и описаны ниже в проверке
опубликованного релиза. Локальные проверки не подтверждают совместимость с
непроверенными клиентами.

## Дополнительная проверка документации

Аудит обнаружил пропущенные записи MCP в таблицах пакетов, навигации и
интеграции, а также описание 3.4.1 в npm README umbrella. Исправлено на EN/RU:
отдельная установка MCP, экспорты API, границы пакетов и подготовка trusted
publisher. Хеши переводов проверены и обновлены. `docs:check` проходит для
текущих 258 Markdown-файлов; прежнее число 259 включало временный execution ledger.

Пересобраны десять архивов и SHA256SUMS. `consumer:check` прошёл с установленным
MCP executable и адаптером. Runtime-файлы и package manifest каждого архива
сравнены побайтово с проверенным кандидатом и не изменились; изменена только
документация. Полные runtime-тесты для этой правки документации не повторялись.
Предыдущие архивы сохранены в `.tmp/release-3.5/docs-refresh-previous-artifacts/`.

## MCP через одну установку umbrella

Пользователь согласовал `safe-shape/mcp` до публикации. RFC 0052/ADR 0040 заменяют
требование отдельной установки: umbrella устанавливает MCP/SDK транзитивно,
но основной импорт их не загружает. Самостоятельный пакет остаётся доступен.

Изолированный consumer установил только архив umbrella с localhost metadata
для неопубликованных зависимостей. Единственная прямая зависимость — safe-shape;
MCP API, executable, адаптер и SDK-client workflow прошли проверку. Loader-тест
запрещает загрузку MCP/SDK из основного импорта. Type fixtures подтверждают
вывод преобразованных типов входа/выхода через subpath.

Повторный полный `prepare:release` прошёл: 329 workspace-тестов, EN/RU-документы,
примеры, benchmarks, installed consumers, quality/migration, оба audit без
уязвимостей и десять новых архивов. Проверены SHA256SUMS и файлы subpath,
зависимость и declarations в архиве. Docs-check проверяет 260 Markdown-файлов.
Лог: `.tmp/release-3.5/umbrella-prepare-release.log`.

Review обнаружил конфликт Zod во временном quality consumer после добавления
SDK. EEXIST воспроизведён; setup заменяет только этот временный каталог на
fixture Zod 4.6.1. Полный quality gate прошёл, версия проверена. Production
dependencies не изменялись этой правкой. Старые архивы сохранены в
`.tmp/release-3.5/umbrella-previous-artifacts/`. Проверена установка npm;
другие package managers не тестировались.

## Опубликованный релиз — 2026-10-06

Предыдущие записи описывают этапы до публикации. Тег `v3.5.0` теперь указывает
на `0d909dec3131956127da79ea29caf5af79667d42`.
[CI](https://github.com/dev-ik/safe_shape/actions/runs/37468515906) прошёл на
Node 20.10 и 24. Проверка чистого checkout обнаружила два предположения тестовой
подготовки: manifest fixtures должны создавать родительский временный каталог,
а примеры из исходников — запускать собранный CLI через Node вместо npm bin link.
Оба исправлены; публичное runtime-поведение не менялось.

[Publish workflow](https://github.com/dev-ik/safe_shape/actions/runs/37475098341)
прошёл полный `prepare:release` на теге и опубликовал девять существующих пакетов
через OIDC с provenance. Первая публикация `@safe-shape/mcp@3.5.0` выполнена
через авторизованный CLI владельца для создания нового пакета; у этой версии
нет provenance attestation. Для MCP и API проверен Trusted Publisher:
`dev-ik/safe_shape`, `publish.yml`, environment `npm`.

Все десять пакетов проверены в публичном npm с `latest=3.5.0`.
[GitHub Release](https://github.com/dev-ik/safe_shape/releases/tag/v3.5.0)
содержит десять архивов и SHA256SUMS; все checksum скачанных архивов совпали.
Версии стали доступны в реестре с задержкой после публикации; проверка дождалась
их появления без повторной публикации.

Новый consumer установил только `safe-shape@3.5.0` из npm, audit — без уязвимостей.
Проверены `safe-shape/mcp`, валидация входа и выхода handler, транзитивный MCP
executable и stdio workflow SDK-клиента с шестью tools. Единственная прямая
зависимость — `safe-shape`. Consumer и скачанные архивы находятся соответственно
в `.tmp/release-3.5/published-consumer/` и `published-artifacts/`.
