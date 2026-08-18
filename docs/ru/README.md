# Документация SafeShape

[English](../README.md) | **Русский**

Русская документация начинается с основных пользовательских сценариев. Полные
API reference пока остаются на английском и доступны из этого же оглавления.

## Начало работы

- [Быстрый старт](quick-start.md): установка, первая схема, диагностика и
  baseline контракта.
- [Миграция с 1.x на 2.0](migration-1-to-2.md): изменения, требующие внимания,
  и безопасный порядок обновления.
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

Архитектурные решения находятся в [`adr/`](../../adr/), а принятые предложения
по публичному API — в [`rfc/`](../../rfc/). Эти документы сохраняются на
английском как единый нормативный источник.
