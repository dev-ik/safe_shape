# Свидетельства проверок SafeShape 3.4

[English](../release-evidence-3.4.md) | **Русский**

Статус: qualified, npm publication заблокирована авторизацией. Владелец явно разрешил проверки и выпуск 3.4.0. Локальные проверки и CI release-source прошли; публикация и проверка установки из registry ещё ожидаются.
Независимый developer walkthrough не выполнен и не отмечен как пройденный.
Automated tests и consumer journeys — отдельные свидетельства.

## Candidate

Все девять пакетов имеют версию 3.4.0. RFC 0050 и ADR 0038 описывают совместимый
API workflow; существующие core/HTTP API и snapshot defaults сохранены.
Существовавшая локальная правка docs/implementation-plan-3.1.md не относится к
релизу и исключена из release commits. Исторические архивы 3.3 сохранены локально
перед генерацией новых release artifacts.

## Локальные проверки

`npm run prepare:release` прошёл на Node 20.10.0 2026-10-02: build, workspace release checks, документация, typecheck, unit tests, examples, benchmarks, installed consumers, quality comparison, migration tests, оба dependency audits и package dry runs. Workspace unit tests: 307 passed, zero failures. API suite: 18 тестов, без ошибок и пропусков. Оба audit сообщили ноль vulnerabilities. Созданы девять release archives. Registry verification ожидается после публикации.

## CI release-source

Commit `248934eac9a4aaac43b3ddcd7fd197fe2a547599` прошёл полный release gate на Node 20.10.0 и 24: [CI run](https://github.com/dev-ik/safe_shape/actions/runs/36980783407). Release tag указывает на этот проверенный commit.

## Блокер публикации

Новый @safe-shape/api отсутствует в npm и требует первой публикации с авторизацией, после которой можно настроить trusted publishing. `npm whoami --cache .npm-cache` вернул 401 2026-10-02. При этих проверках пакеты 3.4.0 не публиковались. Проверки установки из registry невозможны до публикации.

## SHA-256 архивов

```text
1c53cb02937c971782eb8927908172bdd7f431a3741070c1f0ab7a0f8bbedf8a  safe-shape-3.4.0.tgz
ea3043e8b7e44f14588a19fc074784cf2fd3930c99405d9a909499080ad5ecc7  safe-shape-api-3.4.0.tgz
4b6ffa1a1d0172d050a44a769b0d49b61ca5e24e8950063655e22b32929d5c87  safe-shape-cli-3.4.0.tgz
a0d2a96d2561ca253a3f0716835481a6abefd8912155afe944743f66410f1d78  safe-shape-compat-3.4.0.tgz
b80a3736e5a17b300cb44d3d680ff7d3051f479fa0c77a7ccfd20c4435742a0d  safe-shape-core-3.4.0.tgz
b35a4d21aea7c781a6371c341eb81352a92ba2b570889b8e0d80ffe41d68bbac  safe-shape-http-3.4.0.tgz
770c11657db7fe870863d9306ef69897d0718e0168efb61998c41a4d12bffbe1  safe-shape-json-schema-3.4.0.tgz
0f0345b29d4415b5fccff3c1b1bc3ad2085d9d156e46d3a6c39e14c447c9f710  safe-shape-typescript-3.4.0.tgz
7f03babf215e11eb0b2e086ece05cf69928084c19c62e45ef8f730fa0e8862f8  safe-shape-validation-3.4.0.tgz
```
