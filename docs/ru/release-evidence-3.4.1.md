# Свидетельства релиза SafeShape 3.4.1

[English](../release-evidence-3.4.1.md) | **Русский**

Статус: опубликован и проверен через registry 2026-10-02. Публикация явно разрешена. Runtime source совпадает с 3.4.0; изменены metadata и README пакетов. Локальный gate, source CI, публикация и registry checks прошли. Независимый developer walkthrough не проводился. Существующая локальная правка docs/implementation-plan-3.1.md исключена.

## Проверки

`npm run prepare:release` прошёл на Node 20.10.0 2026-10-02: build, документация (244 Markdown files), typecheck, 307 workspace tests, examples, benchmarks, installed consumers, quality checks, migration tests, оба dependency audits с нулём vulnerabilities, pack checks и девять архивов. EN/RU README code samples совпадают; примеры клиента и CLI прошли отдельно.

Source commit `d3973d3539bc8556ebf3959077e9ad4187cfde25` прошёл [CI на Node 20.10.0 и 24](https://github.com/dev-ik/safe_shape/actions/runs/36991106005). Tag v3.4.1 указывает на этот проверенный commit. Npm publication и registry verification прошли.

## Публикация и installed consumers

[Publish workflow](https://github.com/dev-ik/safe_shape/actions/runs/36992695426) прошёл и создал [GitHub release](https://github.com/dev-ik/safe_shape/releases/tag/v3.4.1) с девятью архивами и SHA256SUMS. Восемь пакетов имеют npm provenance от GitHub Actions. API-пакет опубликован с авторизацией аккаунта и browser 2FA; у его версии нет provenance attestation. Trusted publishing API для будущих выпусков остаётся отдельной настройкой.

Версии и latest tags всех девяти registry-пакетов — 3.4.1; все содержат keywords. Загруженные tarballs прошли registry SHA-1 и qualified-archive SHA-256 проверки. Оба README каждого опубликованного архива точно совпадают с локальными исходниками и содержат npm-safe links. Все 45 уникальных файлов по ссылкам доступны в pinned v3.4.1 tag. Все 96 packaged dist files побайтово совпадают с 3.4.0.

Чистый npm install safe-shape@3.4.1 установил все девять пакетов; audit сообщил ноль vulnerabilities. Installed consumer прошёл API workflow, README client example, CLI doctor, README API export/snapshot/check commands и сборку browser entry через esbuild platform=browser. Npm сначала сообщал задержку processing; verification прошла после появления metadata. Независимый developer walkthrough не проводился.

## SHA-256 архивов

```text
4cc16792a62bfadf058157112c43b43513dfcc3ddaed4fbfbc6b3e6f132f2900  safe-shape-3.4.1.tgz
cc10930822e63e16b838019015d7dbdda917db85003451e0bd67a62a0a104175  safe-shape-api-3.4.1.tgz
294985ba18066ad242ccf7982ab01b076bcc0fda7c45774ddf3ffe98549bb556  safe-shape-cli-3.4.1.tgz
7de868b96ef793c28eab8022f049ed505b439905f0f717aff47d53af90f7e278  safe-shape-compat-3.4.1.tgz
0111e31a144d8037c4025db603044977aa8e3f38c68d463633d872e6f81cf905  safe-shape-core-3.4.1.tgz
723ccacafbc418638866ec6eda3cea475c7b5341346cb630e8cd1855e3ca7ec8  safe-shape-http-3.4.1.tgz
7fc7a32ae5f3aeb0d7a2e464dab27bb3c20a16ca7294b88de01aec4da806e164  safe-shape-json-schema-3.4.1.tgz
b20434627bc093503f36f3f61471217cbb90dafe0606a5082e51bb4d46e14543  safe-shape-typescript-3.4.1.tgz
47c2cbebb996c740dfe418cf228efcabaf1bc3231f523407edf3eb62cc93f64e  safe-shape-validation-3.4.1.tgz
```
