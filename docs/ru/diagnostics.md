# Диагностика

[English](../diagnostics.md) | **Русский**

Ошибка должна объяснять что, где и почему произошло и как исправить.
Нативный Diagnostic — Issue | Warning со структурным path; FormattedDiagnostic
содержит отображаемый путь и не меняет исходную диагностику.

Поля: code, path, message, expected, received, severity error/warning;
необязательные suggestion, ruleId, immutable JSON params и рекурсивные branches.

API: createDiagnostic, createFormattedDiagnostic, createDiagnostics,
formatIssuePath, formatDiagnostic, formatIssues, formatValidationError,
formatDiagnostics, formatWarnings, groupIssuesByPath, toFieldErrors.

Пути: корень input; поле input.user.email; индекс input.users[0].email;
нестандартное имя input["content-type"]. Форматирование показывает место,
нарушение, ожидаемое/полученное, подсказку и стабильный code.
Форматтер сообщения передаётся на вызов; default неизменен, глобальной локали
и состояния в схеме нет.

Warnings не проваливают validation: при успехе они в result.warnings, при отказе —
error.warnings отдельно от issues. GroupIssuesByPath сохраняет структурное равенство,
порядок первого появления путей/ошибок и исходные issue objects, замораживая
копии контейнеров. ToFieldErrors даёт ключи users[0].email и корень _root;
коллизии разных путей вызывают ошибку, не перезаписывают сообщения.
Обычные union branches остаются вложенными, автоматического выбора ветви нет.
См. [core](api/core.md) для custom/async APIs и params.
