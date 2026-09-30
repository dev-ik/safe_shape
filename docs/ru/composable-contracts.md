# Композиция runtime-контрактов

[English](../composable-contracts.md) | **Русский**

Доступна с SafeShape 3.2.0.

```ts
import { object, string, number } from "safe-shape";
const User = object({ id: string(), name: string(), age: number().optional() });
const CreateUser = User.omit(["id"]);
const UpdateUser = CreateUser.partial();
const PublicUser = User.pick(["id", "name"]);
const CompleteUser = User.required();
const WithRevision = User.extend({ revision: number({ integer: true }) });
const UserId = User.shape.id;
```

ObjectSchemaType хранит замороженный shape с исходными схемами полей. Каждый
метод возвращает новый замороженный объект и сохраняет unknownProperties и
аннотации. Pick/omit принимают readonly-массив существующих имён; неверные имена
вызывают ошибку. Extend только добавляет: коллизии запрещены. Partial неглубокий;
required отклоняет отсутствие и undefined на входе/выходе, сохраняя правила полей.
Типы результата описывают PartialShape/RequiredShape.

Объектные refinements добавляйте после композиции: безопасно перенести произвольное
межполевое правило на новую форму нельзя. Ограничение действует и в типах, и при
обходе типов в runtime. Правила отдельных полей, warnings и async сохраняются.

## Проверка каждой стадии

```ts
const Page = string({ pattern: "^[0-9]+$" }).transform(Number)
  .pipe(number({ integer: true, minimum: 1, maximum: 100 }));
Page.parse("12"); // 12
Page.safeParse("0").success; // false
Page.safeParse(12).success; // false
```

Pipe принимает совместимый промежуточный тип или unknown для сужения. Исходный
input сохраняется, output выводится из следующей стадии. Следующая стадия
выполняется только после успеха предыдущей. Warnings сохраняют порядок,
ошибки — полные пути контейнеров и HTTP. Обе стадии участвуют в async discovery,
включая Standard Schema. Pipeline не становится optional-полем без явного optional.

Точный выходной граф содержит структуру последней стадии и анонимное ограничение:
мы знаем тип проверенного выхода, но не все производимые callback значения.
Поэтому точный JSON Schema export отклоняет такое ограничение, а compatibility
остаётся консервативной. Input сохраняет opaque transform; introspection не
исполняет callbacks. В версии 3.3.0 доступен отдельный режим
[верхней границы выхода](checked-output.md), сохраняющий это различие.

[Сквозной пример](../../examples/connected-contracts.mjs) объединяет композицию,
HTTP-преобразование, рекурсивные объявления и проверку связей.
