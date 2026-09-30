# Ошибки production без остановки приложения

[English](../production-boundaries.md) | **Русский**

Валидация и доступность приложения — разные ответственности. На границе каждого
запроса/сообщения/компонента зарегистрируйте нарушение и отклоните операцию либо
восстановитесь данными, проверенными той же схемой. Следующая операция может работать.

SafeParse/safeParseAsync требуют проверки success до чтения data. Parse/parseAsync
намеренно выбрасывают ошибки. Core не меняет поведение от NODE_ENV и не настраивает
глобальный logger. Sync parsing async-схемы — ошибка программы. Неожиданное
исключение JavaScript, например getter входа, требует application exception boundary.

[Обработчик](../../examples/production-boundary.mjs) показывает:

- Невалидный запрос: лог нарушения, 400, сервис не вызывается.
- Невалидный ответ сервиса: лог нарушения, локальный 503.
- Исключение parsing/сервиса: operational failure и 503.
- Валидные запрос и ответ: проверенные данные и 201.
- Бросающий, отклоняющий promise или зависший logger не меняет результат операции.

```js
import { createUserHandler } from "../../examples/production-boundary.mjs";
const handle = createUserHandler({
  saveUser: input => database.createUser(input),
  report: event => logger.warn(event),
});
const response = await handle(requestBody);
```

Это пример прикладного кода, не новый API библиотеки. Default sink пишет JSON в
console.warn; переданный sink получает стабильные имена границ/операций, выбранные
коды и отредактированные пути без payload, сообщений исключений и custom-текста.
Обработчик rejection прикрепляется немедленно; логирование best-effort не ожидается.
Очереди, rate limits и delivery guarantees принадлежат приложению.

Для HTTP-клиента используйте [recovery](production-response-recovery.md).
Невалидный payload не становится доверенным после warning. Ответ 503 не отменяет
уже выполненную запись; транзакции и повторы определяет приложение.

Examples-check запускает [тесты](../../examples/production-boundary.test.mjs) с
strict unhandled rejections: invalid→valid, исключения callbacks/getters,
response drift, сбои logger и недоступный кеш. Они не доказывают защиту от
завершения процесса, исчерпания памяти или ошибок вне границы.
