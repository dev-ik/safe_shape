# Процесс выпуска

[English](../release.md) | **Русский**

Публикация пакетов выполняется после явного разрешения на релиз.

```sh
npm ci --prefix quality --ignore-scripts
npm run release:check
```

Gate включает metadata/package boundaries, документацию и EN/RU-покрытие,
build, typecheck, тесты, исполняемые примеры, benchmarks, установку tarballs,
quality fixtures, migration tooling, audits обоих lockfiles и pack dry-run.
CI использует тот же gate. Consumer-проектам достаточно [проверки контрактов](ci.md).

Prepare:release выполняет проверки и создаёт архивы в release-artifacts.
Для итерации доступен `node scripts/release-check.mjs`. Все workspace-пакеты
имеют одну версию; patch — совместимые исправления, minor — дополнения,
major — breaking API. Публичные возможности требуют RFC, архитектурные решения — ADR,
API — тестов и актуальной документации на обоих языках.

## Публикация

Перед публикацией проверьте [готовность](publish-readiness.md). Порядок зависимостей:
core → compat → http → json-schema → typescript → validation → cli → safe-shape.

Workflow `Publish npm packages` запускается вручную на точном теге v<version>.
Он проверяет релиз, создаёт детерминированные архивы, публикует по зависимостям
и прикрепляет архивы к GitHub Release; до npm они сохраняются также как Actions
artifact на семь дней. Уже опубликованные версии пропускаются при повторном запуске.

GitHub Environment должен называться npm. Для каждого npm-пакета настройте
trusted publisher: dev-ik/safe_shape, workflow publish.yml, environment npm,
allowed action npm publish. Используется OIDC, NPM_TOKEN не требуется.

После успешного prepare:release и разрешения зафиксируйте подготовленную версию,
отправьте нужную ветку, создайте/отправьте аннотированный тег v<version> и запустите
workflow на нём в фазе release. Gate сверяет ref с версиями всех пакетов.
Не включайте посторонние изменения при staging.

Compat-only — восстановление старого частично опубликованного тега: запуск из
основной ветки с точным release_ref. Публикуются только отсутствующие core/compat,
GitHub Release не создаётся. Для обычного релиза этот режим не используется.

## Локальные инструменты и свидетельства

`npm run cli:doctor` работает без глобального link. `npm run link:cli` нужен
только для явной локальной глобальной установки. CLI build задаёт executable
0755 на POSIX, metadata gate проверяет права; consumer-check запускает реальный binary.

Quality tooling изолирован. Нужен локальный baseline-тег v3.1.0; CI получает
теги, проверяет Node 20.10.0/24 и сохраняет JSON report. Local success не означает
remote CI или независимый developer walkthrough. Новые изменения требуют
проверки именно итогового versioned candidate, а не старых результатов.
