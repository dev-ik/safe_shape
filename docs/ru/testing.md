# Тестирование

[English](../testing.md) | **Русский**

Используются unit, integration, type, regression и генеративные проверки.
После build установите pinned quality tooling через
`npm ci --prefix quality --ignore-scripts`, затем `npm run quality:check`.
Release gate включает эту команду. Отчёт .tmp/quality/report.json содержит версии,
source/patch identity, сырые замеры и отдельно незавершённые внешние проверки.
Для baseline нужен локальный тег v3.1.0.

Compat generated.test.ts использует фиксированный seed 0x5afe31, 42 схемы
ограниченной вложенной грамматики и 119 значений. Проверяются safe-доказательства
трёх режимов/двух сторон и согласованность v1/v2 input. Выходы проверяются отдельно
для identity-грамматики; transforms/policies имеют специальные тесты.
Минимальная equal-literal regression сохранена отдельно (RFC 0043).

Core inference.types.ts проверяет позитивные/негативные примеры strict и exact
optional properties. Quality компилирует установленные declarations TypeScript
5.9.2 и 7.0.2: это проверенные версии, не обещание для всех промежуточных.
Browser-targeted form bundle исполняет реальный Standard Schema resolver в VM
без Node globals. Это не реальное взаимодействие с браузером и не
[независимый walkthrough (EN)](../../quality/WALKTHROUGH.md).

В 3.3 дополнительно проверяются output bounds, callback non-execution,
консервативные решения связей, рекурсия, сохранение exact-mode и installed journey.
Performance claims требуют повторяемых парных замеров с исходами и диагностикой.
