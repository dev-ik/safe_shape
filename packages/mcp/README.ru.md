# @safe-shape/mcp

[English](https://github.com/dev-ik/safe_shape/blob/v4.0.0/packages/mcp/README.md) | **Русский**

Контракты для AI-инструментов и локальный MCP-сервер проверки. Node >=20.10, ESM.
Пакет можно установить отдельно либо получить через `safe-shape` и импортировать
API из `safe-shape/mcp`. Сервер проверяет MCP средствами SafeShape без зависимостей от Zod и MCP SDK. Umbrella устанавливает MCP
транзитивно, но основной импорт его не загружает.

```sh
npm install @safe-shape/mcp @safe-shape/core
npx --no-install safe-shape-mcp --help
```

Создайте модуль схемы и `safe-shape.mcp.json` по руководству ниже, затем выполните:

```sh
npx --no-install safe-shape-mcp --workspace . --manifest safe-shape.mcp.json
```

Manifest принадлежит вашему проекту; npm-установка не создаёт файлы примеров.

Экспортируйте схемы входа/выхода, проверяйте границы инструментов и контракты
через stdio. Неверные аргументы не доходят до обработчика; неверный результат
не становится успешным ответом. Доверенные модули работают с правами процесса;
проверка путей не является песочницей. Deadline кооперативен. Нет автоматических
повторов и записи baseline.

[Руководство](https://github.com/dev-ik/safe_shape/blob/v4.0.0/docs/ru/mcp.md) · [API](https://github.com/dev-ik/safe_shape/blob/v4.0.0/docs/ru/api/mcp.md)
