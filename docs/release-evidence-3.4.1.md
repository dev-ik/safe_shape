# SafeShape 3.4.1 release evidence

**English** | [Русский](ru/release-evidence-3.4.1.md)

Status: published and registry-verified on 2026-10-02. Publication is explicitly authorized. Runtime source is unchanged from 3.4.0; package metadata and READMEs changed. Local gate, source CI, publication and registry checks passed. Independent developer walkthrough is not performed. The pre-existing local edit to docs/implementation-plan-3.1.md is excluded.

## Qualification

`npm run prepare:release` passed on Node 20.10.0 on 2026-10-02: build, documentation (244 Markdown files), typecheck, 307 workspace tests, examples, benchmarks, installed consumers, quality checks, migration tests, both dependency audits with zero vulnerabilities, pack checks and nine archives. EN/RU README code samples match; the client and CLI examples passed independently.

Source commit `d3973d3539bc8556ebf3959077e9ad4187cfde25` passed [CI on Node 20.10.0 and 24](https://github.com/dev-ik/safe_shape/actions/runs/36991106005). Tag v3.4.1 points to this tested commit. Npm publication and registry verification passed.

## Publication and installed consumers

[Publish workflow](https://github.com/dev-ik/safe_shape/actions/runs/36992695426) passed and created the [GitHub release](https://github.com/dev-ik/safe_shape/releases/tag/v3.4.1) with nine archives and SHA256SUMS. Eight packages have GitHub Actions npm provenance. The API package was published with account authorization and browser 2FA; its version has no provenance attestation. Future API trusted publishing remains separately configurable.

All nine registry versions and latest tags are 3.4.1, and all declare keywords. Downloaded tarballs passed registry SHA-1 and qualified-archive SHA-256 checks. Both READMEs in each published archive match the local source exactly and contain npm-safe links. All 45 distinct linked repository files are accessible through the pinned v3.4.1 tag. All 96 packaged dist files match 3.4.0 byte-for-byte.

A clean npm install of safe-shape@3.4.1 installed all nine packages and audited with zero vulnerabilities. The installed consumer passed the API workflow, README client example, CLI doctor, README API export/snapshot/check commands, and browser entry bundling with esbuild platform=browser. Npm initially reported processing delays; verification passed after metadata became available. Independent developer walkthrough was not performed.

## Archive SHA-256

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
