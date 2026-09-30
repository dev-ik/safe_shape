# Документация SafeShape

[English](../README.md) | **Русский**

Актуальные пользовательские руководства, API и инструкции эксплуатации доступны
на русском. Названия API, коды ошибок и команды сохраняются как в коде.
Исторические release records и нормативные RFC/ADR отмечены как английские источники.

## Начало работы

- [Быстрый старт](quick-start.md) и [интеграция](integration.md).
- [Композиция контрактов](composable-contracts.md), [связи producer/consumer](contract-connections.md).
- [Описание релиза 3.3.0](release-3.3.0.md): изменения, обновление и статус подготовки.
- [Проверяемые выходные границы](checked-output.md): API версии 3.3.0.
- [Переход с Zod](migration-from-zod.md).
- [Production-границы](production-boundaries.md) и [восстановление ответа](production-response-recovery.md).
- Миграция [1.x → 2.0](migration-1-to-2.md), [2.x → 3.0](migration-2-to-3.md), [3.0 → 3.1](migration-3.0-to-3.1.md).
- [Главный README](../../README.ru.md).

## Справочник API

- [Общий пакет](api/safe-shape.md).
- [Core: схемы, parsing, типы и диагностика](api/core.md).
- [Snapshots и совместимость](api/compat.md).
- [CLI](api/cli.md).
- [HTTP](api/http.md).
- [JSON Schema](api/json-schema.md).
- [Генерация TypeScript](api/typescript.md).
- [Отчёты валидации](api/validation.md).

## Устройство платформы

- [Принципы](design-principles.md), [миссия](goals.md), [философия](philosophy.md).
- [Модель валидации](validation-model.md), [parsing](parser.md), [система типов](type-system.md).
- [Диагностика](diagnostics.md), [ошибки](error-system.md), [неизменяемость](immutability.md).
- [Архитектура пакетов](package-architecture.md).
- [Матрица совместимости](compatibility-matrix.md), [контрпримеры](counterexamples.md), [Markdown review](contract-review.md).
- [Правила API](api-guidelines.md) и [именование](naming.md).

## Разработка и выпуск

- [CI](ci.md), [тестирование](testing.md), [производительность](performance.md), [benchmarks](benchmarks.md).
- [Критерии качества](release-quality-3.1.md).
- [Процесс релиза](release.md) и [готовность к публикации](publish-readiness.md).
- [Текущий план развития](roadmap.md) и [реализация 3.3](implementation-plan-3.3.md).
- [Поддержка переводов](translations.md).

## Архив и нормативные источники (EN)

История измерений и решений сохраняется без переписывания результатов:
[релиз 3.1](../release-candidate-3.1.0.md), [релиз 3.2](../release-candidate-3.2.0.md),
[patch 3.2.1](../release-3.2.1.md), [свидетельства 3.3](../release-evidence-3.3.md).
Полный список исторических исключений есть в [реестре переводов](../translations.json).
[ADR](../../adr/) и [RFC](../../rfc/) — единые нормативные источники на английском.
