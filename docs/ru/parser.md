# Parsing

[English](../parser.md) | **Русский**

Поток: вход → parser → результат → диагностика.
SafeParse возвращает ParseResult; parse — данные либо ValidationError.
SafeParseAsync возвращает Promise результата, parseAsync — Promise данных либо
отклонение. Sync-вход отклоняет вложенные async-правила TypeError до parsing;
Standard Schema выбирает выполнение по схеме.

Неожиданные JavaScript-исключения, например getter, требуют границы приложения:
safeParse не является глобальным catch-all. См. [production](production-boundaries.md).

Внутренний обход создаёт корневой ParseContext, проверяет каждый контракт,
добавляет child-context для поля/индекса и собирает issues со стабильными путями.
С 3.2 native ValidationError создаётся один раз на публичной границе с обычным
message/stack и immutable-диагностикой. Успех может содержать warnings, отказ
сохраняет их в error.warnings. Warning не превращает невалидный вход в успех.
Pipe запускает следующую стадию только после успеха и сохраняет пути/порядок warnings.
ParseContext и промежуточные результаты — private, публичные типы описаны в [core](api/core.md).

В версии 3.3.0 завершённое обнаружение async кешируется только для корня
неизменяемого графа. Частичный рекурсивный обход не кешируется. Слои без checks
повторно используют уже неизменяемый результат; публичная семантика сохраняется.
