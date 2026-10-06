# @safe-shape/api

[English](https://github.com/dev-ik/safe_shape/blob/v3.5.1/packages/api/README.md) | **Русский**

Каталоги endpoints, проверяемый fetch-клиент, OpenAPI 3.1 и совместимость API.

См. [API reference](https://github.com/dev-ik/safe_shape/blob/v3.5.1/docs/ru/api/api.md). Для браузера используйте
`@safe-shape/api/client`, для Node tooling — корневой entry.

Добавлено в SafeShape 3.4.0. Совместимость существующих runtime API и snapshot defaults сохранена.

## Быстрый старт

```sh
npm install @safe-shape/api @safe-shape/core
```

```js
import {
  httpEndpoint, apiContract,
} from "@safe-shape/api";
import { object, string } from "@safe-shape/core";

export const api = apiContract({
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

```

Сохраните каталог в `api.mjs`. Вызовы клиента вынесите в отдельный модуль, чтобы CLI imports не отправляли HTTP-запросы:

```js
import { createApiClient, toOpenApi, createApiSnapshot, compareApiSnapshots } from "@safe-shape/api";
import { api } from "./api.mjs";

const client = createApiClient(api, { baseUrl: "https://api.example.com/v1" });
const result = await client.getUser({ params: { id: "user_1" } });
if (result.success && result.status === 200) console.log(result.data.id);

const openapi = toOpenApi(api, { title: "Users", version: "1.0.0" });
const baseline = createApiSnapshot(api);
const comparison = compareApiSnapshots(baseline, createApiSnapshot(api));
console.log(openapi.openapi, comparison.decision); // 3.1.0, compatible
```

Клиент обращается к существующему HTTP-серверу. Запросы и ответы валидируются, тип response data выводится по status. Для браузера используйте `@safe-shape/api/client`; OpenAPI и snapshot tools используют Node root entry. Только JSON transport: без router, cookies, multipart и retries. См. [полный reference](https://github.com/dev-ik/safe_shape/blob/v3.5.1/docs/ru/api/api.md): wire schemas, warnings, cancellation и правила совместимости.
