# SafeShape 3.4.0

[English](../release-3.4.0.md) | **Русский**

Статус: опубликован 2026-10-02. Все девять npm-пакетов имеют версию 3.4.0. См.
[свидетельства релиза](release-evidence-3.4.md) и [GitHub release](https://github.com/dev-ik/safe_shape/releases/tag/v3.4.0).

## Изменения

- Новый @safe-shape/api: immutable httpEndpoint/apiContract-каталоги с явными
  method/path, request schemas и response schemas по финальным статусам.
- createApiClient создаёт fetch-клиент с типизацией data по status, проверяет
  запрос до transport и ответ после decoding, сохраняет warnings и передаёт
  AbortSignal. Browser entry @safe-shape/api/client не загружает Node tooling.
- toOpenApi/safeToOpenApi экспортируют OpenAPI 3.1.0 с изолированными Draft 2020-12
  components и URI-encoded recursive references. Opaque rules дают structured
  errors без частичного документа. Non-JSON literals отклоняются до сериализации,
  которая могла бы потерять или изменить их ограничения.
- createApiSnapshot/parseApiSnapshot/compareApiSnapshots проверяют эволюцию всего
  API: backward requests, forward responses, удаление/изменение маршрутов и статусов.
- CLI: api export, api snapshot, api check. Check exits: 0 — compatible,
  2 — migration/review, 1 — operational error. Перезапись baseline отклоняется.
- Umbrella, EN/RU-документация, installed consumers и release gates всех девяти
  пакетов включают новый пакет. Семантика зафиксирована RFC 0050 и ADR 0038.

## Обновление с 3.3.x

Breaking changes существующих API, snapshot formats и defaults не предполагаются.
Обновите safe-shape либо все используемые scoped-пакеты до 3.4.0 одновременно.
Существующие core/HTTP/tooling-вызовы не требуют миграции. Установка:

```sh
npm install safe-shape@3.4.0
```

Для браузера используйте @safe-shape/api/client; корневой API entry сочетает
runtime и Node tooling. Требования пакетов остаются Node >=20.10 и ESM.

## Границы возможностей

Новый transport поддерживает JSON body/response, строковые path parameters,
scalar query и непустые массивы через повторяющиеся query-ключи. Wire schemas
запрещают transforms и strip-объекты. Cookies, multipart, automatic retries,
server routing и query decoding не предоставляются. Generic OpenAPI не заменяет
native format/pattern validation и strict section validation; расширения SafeShape
сохраняют эту семантику. Объявленные non-2xx — типизированный обмен. AbortSignal
отменяет fetch, но не выполняющийся async refinement. Удаление constrained request
section требует manual review. Compatibility сравнивает accepted wire domains,
а не бизнес-эквивалентность или доступность endpoint.
См. [API reference](api/api.md) и [исполняемый пример](../../examples/api-workflow.mjs).

## Проверки

npm run prepare:release выполняет полный gate и создаёт девять архивов. CI
итогового commit проверяет Node 20.10.0/24. Независимый developer walkthrough
не отмечен как пройденный; automated journeys записываются отдельно. Владелец
явно разрешил релиз 3.4.0 после раскрытия этого ограничения.
