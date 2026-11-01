# API-контракты

[English](../../api/api.md) | **Русский**

`@safe-shape/api` добавляет workflow API версии 3.4.0. Существующие API и
snapshots 3.3.0 сохраняются.

## Endpoint и каталог

```ts
import { apiContract, httpEndpoint, createApiClient, toOpenApi } from "@safe-shape/api";
import { object, string } from "@safe-shape/core";

const api = apiContract({
  getUser: httpEndpoint({
    method: "get",
    path: "/users/{id}",
    request: { params: object({ id: string({ minLength: 1 }) }) },
    responses: {
      200: object({ id: string() }),
      404: object({ message: string() }),
    },
  }),
});
const client = createApiClient(api, { baseUrl: "https://example.com/v1" });
const result = await client.getUser({ params: { id: "user_1" } });
if (result.success && result.status === 200) console.log(result.data.id);
const document = toOpenApi(api, { title: "Users", version: "1" });
```

HttpEndpointConfig содержит method, path, request, responses, необязательные
summary и description. Методы: get/post/put/patch/delete/head/options.
Пути используют {name}; query/fragment, dot segments, percent escapes и
повторяющиеся placeholders запрещены. Ключи каталога — стабильные operation ids.
Одинаковые method/template отклоняются, даже если имена placeholders различаются.
Контейнеры копируются и замораживаются. Публичные типы: ApiSchema, EndpointRequest,
HttpMethod, HttpEndpoint, ApiContract.

Секции запроса: params/query/headers/body. Секции параметров — strict object.
Params точно соответствуют обязательным строковым placeholders. Query поддерживает
string/number/boolean и массивы этих значений, а также optional(). Для массивов
нужен minLength >= 1; отсутствие задаётся пропуском optional-поля. Массивы передаются
повторяющимися query-ключами. Вложенные объекты и null в query не поддерживаются.
Headers — HTTP token names в нижнем регистре со строковыми значениями;
accept/content-type/cookie принадлежат transport. Body и ответы со схемой — JSON.
Ответы явно задаются статусами 200–599; null означает отсутствие тела. GET/HEAD
не имеют body; HEAD и статусы 204/205/304 требуют null. Default-status fallback нет.

Wire-схемы не могут содержать transforms и strip-объекты, включая рекурсивные графы.
Runtime поддерживает refinements, warnings и async-правила. Конструкторы и tooling
не выполняют callbacks. Сериализация явная, без скрытого приведения входа схемы.
Серверный адаптер должен декодировать scalar query и повторяющиеся ключи согласно
этим правилам; пакет не устанавливает router и не декодирует серверные query.

## Проверяемый клиент

createApiClient(api, { baseUrl, fetch? }) возвращает замороженный mapped ApiClient.
Fetch можно передать для тестов или application transport. Base URL — абсолютный
HTTP(S), сохраняет path prefix и запрещает credentials, query и fragment.
Методы принимают InferEndpointRequest и ApiCallOptions { signal?: AbortSignal }.
InferEndpointResponse связывает status с data. Невалидный запрос останавливается
до fetch.

ApiClientResult: success со status/data/requestWarnings/responseWarnings либо
ApiClientFailure с success false, kind и requestWarnings. Варианты ошибок:

- request-validation / response-validation: native ValidationError; для ответа
  также возвращается status;
- serialization: JSON, path segment или header нельзя передать без изменения;
- network: fetch отклонён/отменён; исходное transport exception не раскрывается;
- decoding: неверный JSON content type, невалидный JSON или непустое no-body тело;
- unexpected-status: статус не объявлен в endpoint.

Объявленные 4xx/5xx — успешный обмен с собственным типом data. Warnings не меняют
success. JSON-ответ требует application/json либо application/*+json. Negative zero в query отклоняется, чтобы не превращать его в ноль. Path segments
кодируются; пустые и dot segments запрещены. Изменяющая header нормализация
отклоняется. JSON body запрещает non-finite numbers, negative zero, bigint,
циклы, non-plain objects, accessors, undefined members и sparse/decorated arrays.
Core может заранее опустить optional-поля объектов согласно обычному parsing.

Fetch использует redirect: error, без автоматических retry/fallback. Signal
передаётся fetch, но не отменяет уже выполняющийся async refinement. Исключения
callbacks обрабатываются по существующим правилам core. Auth/storage/telemetry
остаются в приложении. Для браузера используйте @safe-shape/api/client: этот
entry экспортирует конструкторы, клиент и типы без Node compatibility tooling.

## OpenAPI

ToOpenApi вызывается как toOpenApi(api, OpenApiOptions { title, version }) и
возвращает замороженный OpenAPI 3.1.0 с Draft 2020-12 resources в components.schemas.
Safe-вариант safeToOpenApi возвращает OpenApiExportResult: success/document или
failure/issues. OpenApiExportError содержит те же issues. OpenApiExportIssue
содержит code, message, immutable path и необязательный underlying JSON Schema
issue. Коды: openapi.schema.unsupported, openapi.contract.invalid. При ошибке
частичный документ не возвращается и не записывается.

Для запросов и ответов используются wire input schemas. Рекурсивные definitions
изолированы в компонентах, локальные references переписаны. Params/headers используют
simple, query — form/explode. Opaque refinements и неподдерживаемые JSON values
приводят к ошибке. Output bound не выдаётся за точное описание. Экспорт описывает
JSON wire domain: generic OpenAPI validators могут иначе обрабатывать форматы и
Unicode-mode patterns. Семантика отмечена x-safe-shape-format и
x-safe-shape-pattern-mode. Generic parameters также не выражают запрет неизвестных
query/header имён: x-safe-shape-request-schemas сохраняет полные strict section
schemas для SafeShape-aware tooling. OpenAPI validation не заменяет runtime.
См. [спецификацию OpenAPI](https://spec.openapis.org/oas/v3.1.1.html).

## Изменения API

### Прямое сравнение OpenAPI (4.0.0)

```ts
import { readFile } from "node:fs/promises";
import { compareOpenApi } from "@safe-shape/api"; // также экспортируется из safe-shape

const report = compareOpenApi(
  await readFile("./previous.openapi.yaml", "utf8"),
  await readFile("./next.openapi.yaml", "utf8"),
);
console.log(report.decision, report.findings, report.issues);
process.exitCode = report.compatible ? 0 : 2;
```

`compareOpenApi(previous: unknown, next: unknown, options?: OpenApiCompareOptions)`
принимает строки YAML/JSON или разобранные объекты OpenAPI 3.0.x/3.1.x. Импорт схем
выполняется внутри, доказательства строит `@safe-shape/compat`. Вручную создавать
каталог SafeShape или snapshot не нужно. Функция не читает файлы и не обращается к сети.

Неизменяемый `OpenApiCompatibilityReport` содержит compatible, decision, findings
и issues. Решения: compatible, migration-required и manual-review.
`OpenApiCompatibilityFinding` содержит endpoint (`METHOD path`), code, status,
путь в документе, message и необязательный исходный GraphCompatibilityReport.
Коды: openapi.operation.added, openapi.operation.removed, openapi.request.changed,
openapi.response.changed и openapi.transport.changed. `OpenApiCompareIssue` содержит
source (previous/next), code, path и message; коды — openapi.document.invalid и
openapi.feature.unsupported. Ошибка импорта возвращает manual-review без частичных
findings. Неверный formatPolicy вызывает TypeError. Адаптер поддерживает ограниченное
подмножество спецификации и не является полным валидатором OpenAPI.

Операции сопоставляются по точным методу/пути; operationId — аннотация. Переименование
пути выглядит как удаление/добавление. Параметры уровня пути наследуются и могут
переопределяться операцией; регистр имён заголовков не важен. Запросы сравниваются
backward, ответы — forward. Проверяются обязательность параметров/тела, конкретные JSON
media types, заголовки ответов и статусы: точный, диапазон, default (в этом порядке).
Изменения servers/security или сериализации требуют manual-review. Сравниваются
объявленные значения, а не бизнес-поведение или доступность приложения.

Поддерживаются типизированные примитивы, скалярные enum/const, properties/required,
булев additionalProperties (по умолчанию разрешён), чистые словари, массивы,
anyOf/allOf, локальные JSON Pointer refs с продуктивной рекурсией, nullable в 3.0,
массивы type/булевы схемы в 3.1, ограничения длины, включительные числовые границы,
multipleOf и ECMAScript-паттерны в Unicode-режиме. Title/description сохраняются;
default не подставляет значения. Домен — JSON с конечными числами JavaScript.
Недоказуемое отношение остаётся manual-review.

Для format нужно явно выбрать интерпретацию. По умолчанию `formatPolicy: "reject"`
возвращает issues. `"annotation"` трактует format только как документацию;
`"safe-shape"` включает нативную семантику email/uuid/date/date-time. Другие форматы,
включая int32/int64, требуют annotation или ручной проверки. Annotation не проверяет
разрядность чисел и не выявляет изменения только format.

Неподдерживаемые ограничения не отбрасываются: oneOf, исключительные границы,
uniqueItems, проекции readOnly/writeOnly, типизированный additionalProperties вместе
с именованными полями, внешние refs, другие диалекты и ограничения без явного type
возвращают issues. Callbacks, links, webhooks, XML/не-JSON media, content encoding, wildcard/параметры
media type и тела GET/HEAD/TRACE также требуют проверки. Неиспользуемые components
не сравниваются. Конфигурация аутентификации и серверов сравнивается как данные.

Используется YAML 1.2 с проверкой повторных ключей, лимитом раскрытия alias 100 и без
пользовательских тегов. Вход копируется без вызова getters; циклы и не-JSON значения
отклоняются. Лимиты документа: 5 млн символов, 100 000 значений, глубина 128 и 20 000
преобразований схем. Это ограничения импорта, а не изоляция ресурсов; паттерны
остаются доверенным кодом контракта. См. [пример YAML](../../../examples/openapi-comparison.mjs).

### Каталоги и snapshots SafeShape

createApiSnapshot(api) создаёт immutable ApiSnapshot формата API_SNAPSHOT_FORMAT
(safe-shape.api/v1), детерминированный SHA-256 fingerprint и ApiEndpointSnapshot
с v2 request/response snapshots. ParseApiSnapshot вызывается как
parseApiSnapshot(unknown), копирует и замораживает данные, проверяет формат,
маршруты, wire rules, schema ids и fingerprints вложенных схем и всего API.

compareApiSnapshots(previous, next) возвращает ApiCompatibilityReport для
обновления сервера с сохранением старых клиентов. Запросы проверяются backward,
ответы — forward по wire input domains. ApiCompatibilityFinding содержит endpoint,
code, status, path, message и необязательный GraphCompatibilityReport.
Новые endpoints безопасны; удаление или смена method/path — breaking. Новый статус
ответа нарушает dispatch старого клиента; удаление статуса безопасно в модели
accepted values. Проверка не доказывает доступность или бизнес-эквивалентность.
Смена JSON/no-body — breaking. Новая request section сравнивается с прежним
отсутствующим body или пустым объектом параметров; удаление секции требует review.
Opaque proofs остаются консервативными.

Поля отчёта: compatible, decision, previousFingerprint, nextFingerprint, findings.
Decision: compatible, migration-required, manual-review. Проверки не изменяют
baselines и не отправляют HTTP-запросы.

```sh
safe-shape --json api export --module ./api.mjs --title Users --version 1 --out ./openapi.json
safe-shape --json api snapshot --module ./api.mjs --out ./api.baseline.json
safe-shape --json api check --module ./api.mjs --against ./api.baseline.json
```

Export по умолчанию default; для именованного каталога передайте --export. Пути
относительны cwd, parent output directory должна существовать. JSON envelope:
ok/command и document, snapshot либо report, а при записи также out. Check exits:
0 — compatible, 2 — migration/review, 1 — operational/export error. Ошибки на stderr
имеют error.code api_command_failed либо openapi_export_failed с issues.
