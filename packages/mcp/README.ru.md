# @safe-shape/mcp

[English](https://github.com/dev-ik/safe_shape/blob/v3.4.1/packages/mcp/README.md) | **Русский**

Контракты для AI-инструментов и локальный MCP-сервер проверки. Node >=20.10, ESM.
Пакет устанавливается отдельно; core и umbrella не зависят от SDK.

```sh
npm install @safe-shape/mcp @safe-shape/core
npx --no-install safe-shape-mcp --workspace . --manifest examples/mcp.manifest.json
```

Экспортируйте схемы входа/выхода, проверяйте границы инструментов и контракты
через stdio. Неверные аргументы не доходят до обработчика; неверный результат
не становится успешным ответом. Доверенные модули работают с правами процесса;
проверка путей не является песочницей. Deadline кооперативен. Нет автоматических
повторов и записи baseline.

[Руководство](https://github.com/dev-ik/safe_shape/blob/v3.4.1/docs/ru/mcp.md) · [API](https://github.com/dev-ik/safe_shape/blob/v3.4.1/docs/ru/api/mcp.md)
