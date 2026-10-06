# HTTP API

[English](https://github.com/dev-ik/safe_shape/blob/v3.5.0/packages/http/README.md) | **Русский**

`@safe-shape/http` проверяет HTTP-границы схемами core и не зависит от фреймворка.
`httpContract(config)` принимает секции params, query, body, headers, cookies,
общую response и карту responses по статусам.

```ts
import { object, string } from "@safe-shape/core";
import { httpContract } from "@safe-shape/http";
const contract = httpContract({
  params: object({ id: string() }),
  body: object({ name: string() }),
  response: object({ id: string() }),
  responses: { 404: object({ message: string() }) },
});
const request = contract.parseRequest({ params: { id: "user_1" }, body: { name: "Dev" } });
```

## Запросы и ответы

Методы контракта: `safeParseRequest`, `parseRequest`, `safeParseRequestAsync`,
`parseRequestAsync`; для ответов — `safeParseResponse(input, status?)`,
`parseResponse`, `safeParseResponseAsync`, `parseResponseAsync`.
Safe-варианты возвращают core ParseResult, throwing-варианты — данные или ошибку.

Отдельные функции для адаптеров: `safeParseHttpRequest`, `parseHttpRequest`,
`safeParseHttpRequestAsync`, `parseHttpRequestAsync`, `safeParseHttpResponse`,
`parseHttpResponse`, `safeParseHttpResponseAsync`, `parseHttpResponseAsync`.
Первый аргумент — контракт; для ответов статус передаётся после input.

Пути ошибок/предупреждений получают имя секции: body.email, headers.authorization,
cookies.session. Префикс добавляется рекурсивно во все union-ветви и custom-пути;
порядок collector сохраняется, warnings не становятся fatal.

При наличии схемы для статуса используется она; иначе — общая response, если
задана. Если статус передан, но подходящей схемы/резервной response нет, отказ
приходит по `input.response.status`. Если схем ответов вообще нет, данные
возвращаются неизменёнными.

## Восстановление ответа

`recoverHttpResponse(contract, input, options)` и async-вариант проверяют сетевой
ответ, а после его отказа — fallback через тот же контракт и статус.
Передайте ровно одно: `fallback: unknown` либо `getFallback: () => unknown`.
Ленивый fallback не вызывается при валидной сети.

```ts
import { recoverHttpResponse } from "@safe-shape/http";
const state = recoverHttpResponse(contract, payload, { status: 200, getFallback: readCache });
if (state.kind === "valid" || state.kind === "recovered") render(state.data);
else renderUnavailable();
```

Состояния заморожены. Valid содержит данные; recovered — проверенные данные и
networkError; unavailable — networkError и fallbackError. Warnings выбранного
валидного результата сохраняются. Невалидный payload не становится типизированными
данными. Исключения fallback — ошибки приложения и распространяются наружу:
обрабатывайте сбой хранилища внутри callback. Телеметрия, retries и UI-политика
остаются в приложении. См. [восстановление](https://github.com/dev-ik/safe_shape/blob/v3.5.0/docs/ru/production-response-recovery.md).

## Представление совместимости

HTTP-пакет отвечает за runtime. Для эволюции используйте compat:
`compareContractsV2` и `createHttpCompatibilityPresentation(report, { exchange })`.
Для request producer — клиент, consumer — сервер; для response наоборот.
Backward означает совместимость consumer, forward — producer, full — обоих.
Представление не меняет доказательства.
