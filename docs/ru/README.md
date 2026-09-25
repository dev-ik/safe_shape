# Документация SafeShape

[English](../README.md) | **Русский**

Русская документация начинается с основных пользовательских сценариев. Полные
API reference пока остаются на английском и доступны из этого же оглавления.

## Начало работы

- [Границы production](../production-boundaries.md): обработка невалидных операций, изоляция сбоев логгера и продолжение работы приложения.
- [Композиция контрактов](../composable-contracts.md), [связи producer/consumer](../contract-connections.md), [переход с Zod](../migration-from-zod.md) (EN): доступны в 3.2.0.

- [Быстрый старт](quick-start.md): установка, первая схема, диагностика и
  baseline контракта.
- [Миграция с 1.x на 2.0](migration-1-to-2.md): изменения, требующие внимания,
  и безопасный порядок обновления.
- [Миграция с 2.x на 3.0](migration-2-to-3.md): warnings, диагностика и явный async.
- [Миграция с 3.0 на 3.1](../migration-3.0-to-3.1.md) (EN).
- [Главный README](../../README.ru.md): обзор платформы и сравнение с Zod.
- [Интеграция в проект](../integration.md) (EN): пакеты, Standard Schema, HTTP,
  CLI и CI.

## API Reference

- [Общий пакет `safe-shape`](../api/safe-shape.md) (EN)
- [Core schemas и parsing](../api/core.md) (EN)
- [Snapshots и совместимость контрактов](../api/compat.md) (EN)
- [CLI](../api/cli.md) (EN)
- [HTTP helpers](../api/http.md) (EN)
- [JSON Schema](../api/json-schema.md) (EN)
- [Генерация TypeScript](../api/typescript.md) (EN)
- [Validation reports](../api/validation.md) (EN)

## Архитектура и эксплуатация

- [Модель совместимости](../compatibility-matrix.md) (EN)
- [Диагностика](../diagnostics.md) (EN)
- [Архитектура пакетов](../package-architecture.md) (EN)
- [Проверки контрактов в CI](../ci.md) (EN)
- [Release workflow](../release.md) (EN)
- [Benchmarks](../benchmarks.md) (EN)
- [Roadmap](../roadmap.md) (EN)
- [Критерии качества релиза 3.1](../release-quality-3.1.md) (EN)
- [Исторический roadmap выпуска 3.1](../roadmap-3.1.md) (EN)
- [План реализации 3.1: эволюция контрактов](../implementation-plan-3.1.md) (EN)
- [Исторический roadmap 3.2, вошедший в релиз 3.1](../roadmap-3.2.md) (EN)
- [Релиз 3.2.0: возможности и подтверждение публикации](../release-candidate-3.2.0.md) (EN)

Архитектурные решения находятся в [`adr/`](../../adr/), а принятые предложения
по публичному API — в [`rfc/`](../../rfc/). Эти документы сохраняются на
английском как единый нормативный источник.
