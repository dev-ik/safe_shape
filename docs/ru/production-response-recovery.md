# Восстановление при невалидном HTTP-ответе

[English](../production-response-recovery.md) | **Русский**

RecoverHttpResponse сохраняет строгую проверку и даёт переносимый между
фреймворками сценарий fallback. Приложение решает, как сообщить о нарушении,
прочитать кеш и показать недоступность.

1. Передайте сетевое значение и fallback либо getFallback.
2. При kind valid используйте проверенные data сразу.
3. При recovered/unavailable сообщите о нарушении через networkError.
4. Покажите восстановленные данные либо локальное состояние недоступности.

Нельзя приводить невалидный payload через `as User`: это переносит сбой в UI.

```ts
import { object, string } from "@safe-shape/core";
import { httpContract, recoverHttpResponse } from "@safe-shape/http";
const contract = httpContract({ responses: { 200: object({ id: string(), name: string() }) } });
function readCache(): unknown {
  try { const value = localStorage.getItem("user"); return value === null ? undefined : JSON.parse(value); }
  catch { return undefined; }
}
const state = recoverHttpResponse(contract, payload, { status: 200, getFallback: readCache });
if (state.kind === "valid" || state.kind === "recovered") render(state.data);
else renderUnavailable();
```

Recovered содержит только выход, прошедший ту же схему и статус, и networkError.
Unavailable также хранит fallbackError. Valid/recovered сохраняют warnings
выбранного выхода. Тип результата — HttpResponseRecoveryResult<T>.
Ровно один из fallback/getFallback обязателен. Ленивый кеш не читается при valid.
Исключения callbacks распространяются: перехватите сбой хранилища и верните unknown
для проверки. Для async-схем есть recoverHttpResponseAsync; асинхронное хранилище
требует соответствующей прикладной обработки.

## Телеметрия

По умолчанию не отправляйте raw body и полный Issue: там могут быть credentials,
персональные значения, ключи records и custom messages. Выбирайте operation/endpoint,
status, версии приложения/контракта, безопасный trace id, коды и редактированные пути.
Полный immutable ValidationError можно сохранить локально.

Ограничивайте частоту и группируйте повторения по стабильным полям. Sink не должен
ломать восстановление: перехватывайте sync throw, немедленно добавляйте catch к
promise и не ждите бесконечно зависший logger. [Исполняемый пример](../../examples/resilient-http-response.mjs)
показывает это поведение. Для запросов сервера см. [production boundaries](production-boundaries.md).

## Окружения и CI

В разработке parseHttpResponse может прерывать сценарий; в production используйте
discriminated state. Схема и множество значений одинаковы, меняется политика
приложения. Runtime-защита нужна даже если upstream обошёл CI.

Для server producer forward по output доказывает, что новый набор ответов входит
в прежний контракт потребителя:

```sh
safe-shape --json contract check --module ./dist/contracts/user.js --export userSchema --against ./.safe-shape/user.contract.json --side output --compatibility forward
```

Используйте рассмотренный v2 baseline; проверка не должна его перезаписывать.
