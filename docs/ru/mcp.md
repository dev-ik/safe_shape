# SafeShape и MCP

[English](../mcp.md) | **Русский**

Установите отдельный пакет `@safe-shape/mcp` вместе с SafeShape. Локальный
сервер проверки контрактов и адаптер инструментов приложения выпускаются
вместе. Требуются Node >=20.10 и ESM. Umbrella и core не зависят от MCP.

```sh
npm install @safe-shape/mcp @safe-shape/core
npx --no-install safe-shape-mcp --workspace . --manifest examples/mcp.manifest.json
```

Сервер использует stdio. Настройте coding-агента на эту команду с абсолютным
путём workspace. Аргументы инструментов содержат ID контрактов и JSON;
агент не выбирает модули JavaScript и файлы для записи.

Для Codex конфигурация содержит явный путь executable:

```toml
[mcp_servers.safe_shape]
command = "node"
args = ["/absolute/project/node_modules/@safe-shape/mcp/dist/cli.js", "--workspace", "/absolute/project", "--manifest", "examples/mcp.manifest.json"]
```

Замените абсолютный путь проекта. Настройки можно передать и для отдельного
запуска CLI; acceptance walkthrough использует временные overrides без
изменения глобальных настроек.

## Реестр контрактов

Создайте доверенный ESM-модуль со схемами SafeShape и JSON manifest:

```json
{
  "version": 1,
  "contracts": [
    { "id": "user", "description": "Аргументы пользователя", "module": "schema.mjs", "export": "userSchema" }
  ],
  "tools": [
    { "id": "user-tool", "name": "inspect_user", "description": "Проверить пользователя", "inputId": "user", "outputId": "user" }
  ]
}
```

Пути `module` разрешаются относительно корня workspace, даже если manifest
лежит в подкаталоге. `export` по умолчанию равен `default`. Канонические пути,
включая цели symlink, должны оставаться внутри workspace. Все пути и ссылки
каталога проверяются до импорта модулей. Модули и проверки выполняются с правами
процесса: это не песочница для недоверенного кода и транзитивных импортов.
Проверяйте схемы перед регистрацией.

## Инструменты агента

| Инструмент | Назначение |
| --- | --- |
| `list_contracts` | ID и описания; страница по умолчанию 20, максимум 100 |
| `describe_contract` | Графы Contract IR для входа/выхода и поддержка экспорта |
| `export_json_schema` | Точный экспорт; по умолчанию input/Draft 2020-12, доступен Draft 7 |
| `validate_data` | Проверка JSON с parsed output или native issues |
| `compare_contracts` | Сравнение зарегистрированных версий; по умолчанию backward/input |
| `export_tool_definition` | Экспорт инструмента из явного каталога |

Ответы проверки — `{ok, operation, result}` либо `{ok:false, operation, error}`
в structured content и эквивалентном JSON-тексте. Неверные данные и несовместимые
контракты являются завершёнными отчётами. Проверяйте `result.valid` и решения
миграции, включая manual review. Неизвестные ID и неподдерживаемый экспорт дают
`isError:true`. Неверные аргументы инструмента дают ошибку протокола.
Инструменты не обновляют baseline и не вызывают бизнес-обработчики приложения.

## Инструменты приложения

```js
import { object, string, number } from '@safe-shape/core';
import { defineMcpTool, safeToMcpToolDefinition, createValidatedMcpHandler } from '@safe-shape/mcp';

const tool = defineMcpTool({
  name: 'text_length', description: 'Измерить длину текста',
  input: object({ text: string() }), output: object({ length: number() })
});
const exported = safeToMcpToolDefinition(tool);
if (!exported.success) throw new Error('Tool is not exactly exportable');
const handle = createValidatedMcpHandler(tool, ({ text }) => ({ length: text.length }));
const result = await handle({ text: 'hello' });
```

Зарегистрируйте описание и обработчик в MCP-сервере приложения. Сервер проверки
не регистрирует бизнес-обработчик автоматически. Неверные аргументы блокируют
исполнение, неверный результат блокирует успешный ответ. Автоматических повторов
нет. Async-правила и преобразования сохраняют вывод типов входа/выхода.
Runtime-проверка нужна и после точного экспорта. Opaque refinements/outputs дают
ошибку экспорта без ослабления схемы. Базовые MCP-описания и успешные structured
results требуют корневого объекта.

Успех возвращает проверенный structured content и JSON-текст. Предупреждения
отдельно находятся в `_meta['safe-shape/warnings']`, массивы `input`/`output`.
Ошибки исполнения дают текст диагностики и `isError:true`, без structured error,
нарушающего схему успеха. Сырые исключения и stack traces не возвращаются.
Native diagnostics могут содержать чувствительные авторские данные; передавайте
их только авторизованному клиенту. Сериализация отвергает циклы, bigint,
undefined, нечисловые/бесконечные числа, getters, классы и разреженные массивы.

## Лимиты и отмена

Необязательные ключи manifest `limits`: `requestBytes` (1048576), `depth` (128),
`responseBytes` (4194304), `concurrency` (16), `deadlineMs` (30000).
Значения — положительные safe integers; deadline должен помещаться в диапазон
таймера Node. Ответы не обрезаются. Если лимит не вмещает диагностику, транспорт
закрывается. Размер/глубина stdio проверяются до JSON parsing в SDK.

Отмена и deadline кооперативны: они не останавливают синхронный код, не завершают
принудительно async-правила и не откатывают побочные эффекты. Ёмкость занята,
пока callback не завершится. Обработчик получает AbortSignal.

## Проверка

Запустите `node examples/mcp-tool-boundary.mjs` и `node examples/mcp-workflow.mjs`.
Второй пример — stdio smoke test с официальным SDK-клиентом, а не реальным агентом.
Базовая проверка совместимости — MCP 2025-06-18; версии SDK/протокола и реально
проверенные клиенты фиксируются отдельно в release evidence.

См. [API](api/mcp.md) и [процесс релиза](release.md).
