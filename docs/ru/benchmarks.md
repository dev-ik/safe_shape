# Измерения производительности

[English](../benchmarks.md) | **Русский**

```sh
npm run build
npm run benchmarks:check
```

Независимый от сторонних библиотек smoke-runner пишет .tmp/benchmarks/report.json.
Он проверяет исход каждого сценария: primitive/форматированные strings, точные
multipleOf, record keys, reject/strip/passthrough, unions/discriminated unions,
сбор ветвей отказа, intersections, Standard Schema, arrays и рекурсию.
Diagnostics v2 добавляет passing/emitted warnings, отдельно быстрый путь и
выделения. Группировка/проекция форм измеряется на 200 разных путях.

Compatibility-сценарии проверяют safe widening, breaking narrowing v1 и рекурсивное
widening v2 на каждой итерации. Ошибочная семантика не может выглядеть ускорением.
Контрпримеры, connection checks и pipelines имеют предварительно заданные
пятисекундные fixture-бюджеты. Прочие smoke timings — свидетельство выполнения;
quality harness отдельно контролирует latency/memory/compiler/bundle regression.

## Исторические данные

RC 2.0 от 18 августа 2026: Node 20.10.0, macOS arm64; 15 parse-сценариев изменились
примерно от -8,2% до +4,4% против предыдущего замера. V1 widening — 40866 ops/sec,
v1 narrowing — 41065, v2 recursive widening — 11343. Это исторические показатели,
не универсальная гарантия для других машин.

[Замеры 3.2.0 (EN)](../release-polish-3.2.0.md) сохраняют сравнение с Zod,
новые composition/pipeline сценарии и bundle. Zod оставался быстрее в parse-нагрузках;
выполнение собственных regression budgets не доказывает паритет.
Для следующей 3.3 см. [текущее свидетельство (EN)](../release-evidence-3.3.md).
