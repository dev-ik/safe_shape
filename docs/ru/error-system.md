# Система ошибок

[English](../error-system.md) | **Русский**

Issue содержит severity error, code, path, expected, received, message,
необязательные suggestion, ruleId, params, branches. Warning — отдельный
нефатальный канал. ValidationError наследует native Error, хранит замороженные
issues/warnings. SafeParse возвращает его, parse выбрасывает. С 3.2 вложенный
обход переносит диагностику, создавая Error один раз на публичной границе;
message/stack доступны без изменения глобальных настроек stack.

Коды: invalid_type, invalid_literal, invalid_enum, invalid_string_pattern,
invalid_string_format, forbidden_value, invalid_tuple_length, invalid_union,
invalid_discriminator, intersection_conflict, too_small, too_large, not_integer,
not_multiple_of, transform_failed, missing_property, unexpected_property, custom.
Пути состоят из строк/чисел и неизменяемы.

Refine может назначить относительный path одной custom-ошибке; refineWithIssues
добавляет несколько по порядку. Вложенные схемы и HTTP дописывают префиксы.
Invalid_union сохраняет zero-based index и полный immutable список каждой ветви;
пути остаются от корня, вложенные unions образуют дерево. Discriminated union
указывает invalid_discriminator по тегу, а после выбора возвращает исходные ошибки
ветви. Intersection_conflict означает успешные, но несовместимые выходы сторон.

Ошибки pattern/format могут соседствовать с длиной. Not_multiple_of означает
отказ точной десятичной делимости. Record key использует строковые коды и
фактический ключ в path; ошибки значения не подавляются.
Форматтеры показывают union summary и вложенные секции; проекции для форм не
уплощают ветви автоматически. См. [parser](parser.md) и [production](production-boundaries.md).
