# Проверка релиза SafeShape 3.5.1

[English](../release-evidence-3.5.1.md) | **Русский**

Patch документации; статус публикации указан в
[GitHub Release](https://github.com/dev-ik/safe_shape/releases/tag/v3.5.1).
Опубликован 2026-10-06; версии и latest tags всех десяти пакетов — 3.5.1.
Этот файл в теге фиксирует этап проверки. Проверка npm после публикации
записывается в текущей ветке и результатах workflow.

## Проверка документации

Предыдущий аудит прошёл проверку локальных ссылок, переводов, Markdown-якорей,
metadata пакетов и исполняемых примеров. TypeScript consumer быстрого старта
скомпилировался и выполнил экспорт схемы, генерацию типов, snapshot и проверку
совместимости на установленной 3.5.0. Исправленные схема/manifest MCP проверены
по всем шести tools через официальный SDK. Тестовые архивы CLI, MCP и umbrella
содержали оба рассмотренных README без изменений.

Для 3.5.1 согласованы все десять версий и точные внутренние зависимости.
Ссылки package README ведут на `v3.5.1`. Предыдущие архивы сохранены в
`.tmp/release-3.5.1/previous-artifacts/` перед новой полной проверкой.

## Полная локальная проверка версии

`npm run prepare:release` прошёл на Node 20.10.0 2026-10-06: build, metadata,
266 Markdown-файлов, typecheck, 329 workspace-тестов, примеры, benchmarks,
installed consumers с umbrella-only MCP, quality/migration, оба audits без
уязвимостей, pack checks и десять архивов. Все SHA256SUMS совпали.
Оба README каждого архива совпадают с исходниками и используют ссылки `v3.5.1`.
Все 76 runtime JavaScript/declaration-файлов побайтово совпадают с 3.5.0.
Нейтральный статус README проверен через сначала падающий, затем проходящий docs gate;
checker по-прежнему требует точную версию root package на обоих языках.
Лог: `.tmp/release-3.5.1/prepare-release.log`.

## Проверенная публикация

Коммит `f62c5fa5a8a1f94e7b7d87f20f3bb4a4d2e412f1` прошёл
[CI на Node 20.10 и 24](https://github.com/dev-ik/safe_shape/actions/runs/37485175991).
Аннотированный тег `v3.5.1` указывает на этот коммит.
[Publish workflow](https://github.com/dev-ik/safe_shape/actions/runs/37490093992)
прошёл полный gate на теге и опубликовал все десять пакетов через OIDC;
у каждой registry-версии есть provenance, включая MCP.

Все десять архивов GitHub прошли SHA256SUMS. Реальные npm-tarballs прошли registry
SHA-1/SRI и побайтово совпадают с GitHub assets. Все двадцать README совпадают с
исходниками; все 51 уникальная ссылка существует в `v3.5.1`. Снимок в теге использует
нейтральные ссылки на статус публикации; текущие EN/RU-статусы обновлены после
проверки реестра.

Новый consumer установил только `safe-shape@3.5.1`, audit — без уязвимостей;
прошли MCP boundary/SDK stdio, CLI doctor (3.5.1) и MCP executable.
Единственная прямая зависимость — safe-shape. Доступность npm отставала от публикации;
проверка дождалась всех версий. Walkthrough реального агента не повторялся:
packaged runtime/declarations не изменились относительно 3.5.0.
Архивы и результаты consumer сохранены в `.tmp/release-3.5.1/`.
