# Результаты проверки SafeShape 3.5.0

[English](../release-evidence-3.5.md) | **Русский**

Статус: финальный локальный кандидат 3.5.0 проверен, публикации нет.

## Выполненные проверки

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

Remote CI, npm publisher configuration, тег, push и публикация не выполнялись.
Перед разрешённой публикацией настройте npm trusted publisher нового пакета и
запустите remote versioned gate. Локальные проверки не подтверждают
совместимость с непроверенными клиентами.
