import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const packageRoot = process.cwd();
const cliPath = resolve(packageRoot, "dist", "cli.js");
const fixturePath = resolve(packageRoot, "tests", "fixtures", "user-schema.mjs");
const packageManifest = JSON.parse(
  await readFile(resolve(packageRoot, "package.json"), "utf8"),
) as { readonly version: string };

test("prints help", async () => {
  const { stdout } = await runCli(["--help"]);

  assert.equal(stdout.startsWith(`safe-shape ${packageManifest.version}\n`), true);
  assert.match(stdout, /schema export/);
  assert.match(stdout, /schema validate/);
  assert.match(stdout, /schema types/);
  assert.match(stdout, /contract snapshot/);
  assert.match(stdout, /contract check/);
});

test("prints machine-readable doctor output", async () => {
  const { stdout } = await runCli(["--json", "doctor"]);
  const payload = JSON.parse(stdout) as {
    ok: boolean;
    version: string;
    auth_required: boolean;
  };

  assert.equal(payload.ok, true);
  assert.equal(payload.version, packageManifest.version);
  assert.equal(payload.auth_required, false);
});

test("exports JSON Schema from a schema module", async () => {
  const { stdout } = await runCli([
    "--json",
    "schema",
    "export",
    "--module",
    fixturePath,
    "--export",
    "userSchema",
  ]);
  const payload = JSON.parse(stdout) as { ok: boolean; schema: unknown };

  assert.deepEqual(payload, {
    ok: true,
    command: "schema export",
    module: fixturePath,
    export: "userSchema",
    schema: {
      type: "object",
      properties: {
        id: { type: "string" },
        role: {
          anyOf: [{ const: "admin" }, { const: "member" }],
        },
        age: { type: "number" },
      },
      required: ["id", "role"],
      additionalProperties: false,
    },
  });
});

test("exports recursive JSON Schema definitions", async () => {
  const { stdout } = await runCli([
    "--json",
    "schema",
    "export",
    "--module",
    fixturePath,
    "--export",
    "treeSchema",
  ]);
  const payload = JSON.parse(stdout) as { ok: boolean; schema: unknown };

  assert.deepEqual(payload, {
    ok: true,
    command: "schema export",
    module: fixturePath,
    export: "treeSchema",
    schema: {
      $ref: "#/$defs/TreeNode",
      $defs: {
        TreeNode: {
          type: "object",
          properties: {
            children: {
              type: "array",
              items: { $ref: "#/$defs/TreeNode" },
            },
            name: { type: "string" },
          },
          required: ["children", "name"],
          additionalProperties: false,
        },
      },
    },
  });
});

test("exports recursive Draft 7 JSON Schema through the dialect URI", async () => {
  const { stdout } = await runCli([
    "--json",
    "schema",
    "export",
    "--module",
    fixturePath,
    "--export",
    "treeSchema",
    "--schema",
    "http://json-schema.org/draft-07/schema#",
    "--id",
    "https://example.com/contracts/tree",
  ]);
  const payload = JSON.parse(stdout) as { ok: boolean; schema: unknown };

  assert.deepEqual(payload, {
    ok: true,
    command: "schema export",
    module: fixturePath,
    export: "treeSchema",
    schema: {
      $schema: "http://json-schema.org/draft-07/schema#",
      $id: "https://example.com/contracts/tree",
      $ref: "#/definitions/TreeNode",
      definitions: {
        TreeNode: {
          type: "object",
          properties: {
            children: {
              type: "array",
              items: { $ref: "#/definitions/TreeNode" },
            },
            name: { type: "string" },
          },
          required: ["children", "name"],
          additionalProperties: false,
        },
      },
    },
  });
});

test("exports enum unknown and never schemas through the CLI", async () => {
  const { stdout } = await runCli([
    "--json",
    "schema",
    "export",
    "--module",
    fixturePath,
    "--export",
    "productionPrimitivesSchema",
  ]);
  const payload = JSON.parse(stdout) as { ok: boolean; schema: unknown };

  assert.deepEqual(payload, {
    ok: true,
    command: "schema export",
    module: fixturePath,
    export: "productionPrimitivesSchema",
    schema: {
      type: "object",
      properties: {
        impossible: { not: {} },
        payload: {},
        status: { enum: ["draft", "published", 1] },
      },
      required: ["payload", "status"],
      additionalProperties: false,
    },
  });
});

test("exports discriminated unions and intersections through the CLI", async () => {
  const { stdout } = await runCli([
    "--json",
    "schema",
    "export",
    "--module",
    fixturePath,
    "--export",
    "structuredCompositionSchema",
  ]);
  const payload = JSON.parse(stdout) as { ok: boolean; schema: unknown };

  assert.deepEqual(payload, {
    ok: true,
    command: "schema export",
    module: fixturePath,
    export: "structuredCompositionSchema",
    schema: {
      type: "object",
      properties: {
        event: {
          oneOf: [
            {
              type: "object",
              properties: { id: { type: "string" }, type: { const: "created" } },
              required: ["id", "type"],
              additionalProperties: false,
            },
            {
              type: "object",
              properties: { id: { type: "string" }, type: { const: "deleted" } },
              required: ["id", "type"],
              additionalProperties: false,
            },
          ],
        },
        name: {
          allOf: [
            { type: "string", minLength: 2 },
            { type: "string", maxLength: 100 },
          ],
        },
      },
      required: ["event", "name"],
      additionalProperties: false,
    },
  });
});

test("exports string patterns and exact formats through the CLI", async () => {
  const { stdout } = await runCli([
    "--json",
    "schema",
    "export",
    "--module",
    fixturePath,
    "--export",
    "formattedStringsSchema",
  ]);
  const payload = JSON.parse(stdout) as { ok: boolean; schema: unknown };

  assert.deepEqual(payload, {
    ok: true,
    command: "schema export",
    module: fixturePath,
    export: "formattedStringsSchema",
    schema: {
      type: "object",
      properties: {
        code: { type: "string", pattern: "^[A-Z]{3}$" },
        id: {
          type: "string",
          format: "uuid",
          pattern: "^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$",
        },
      },
      required: ["code", "id"],
      additionalProperties: false,
    },
  });
});

test("exports multipleOf and record propertyNames through the CLI", async () => {
  const { stdout } = await runCli([
    "--json",
    "schema",
    "export",
    "--module",
    fixturePath,
    "--export",
    "constrainedRecordSchema",
  ]);
  const payload = JSON.parse(stdout) as { ok: boolean; schema: unknown };

  assert.deepEqual(payload, {
    ok: true,
    command: "schema export",
    module: fixturePath,
    export: "constrainedRecordSchema",
    schema: {
      type: "object",
      properties: {
        amount: { type: "number", minimum: 0, multipleOf: 0.01 },
        labels: {
          type: "object",
          additionalProperties: { type: "boolean" },
          propertyNames: { type: "string", minLength: 2, pattern: "^[a-z]+$" },
        },
      },
      required: ["amount", "labels"],
      additionalProperties: false,
    },
  });
});

test("exports and validates explicit object unknown-property policies", async () => {
  const exported = await runCli([
    "--json",
    "schema",
    "export",
    "--module",
    fixturePath,
    "--export",
    "objectPoliciesSchema",
  ]);
  const exportPayload = JSON.parse(exported.stdout) as {
    schema: { properties: Record<string, { additionalProperties: boolean }> };
  };
  assert.equal(exportPayload.schema.properties.stripped?.additionalProperties, true);
  assert.equal(exportPayload.schema.properties.open?.additionalProperties, true);

  const inputPath = await writeJsonFixture("object-policies.json", {
    stripped: { id: "one", removed: true },
    open: { id: "two", preserved: true },
  });
  const validated = await runCli([
    "--json",
    "schema",
    "validate",
    "--module",
    fixturePath,
    "--export",
    "objectPoliciesSchema",
    "--input",
    inputPath,
  ]);
  const validationPayload = JSON.parse(validated.stdout) as { data: unknown };
  assert.deepEqual(validationPayload.data, {
    stripped: { id: "one" },
    open: { id: "two", preserved: true },
  });
});

test("writes exported JSON Schema to a file", async () => {
  const outputDir = resolve(packageRoot, ".tmp", "cli-test");
  const outputPath = resolve(outputDir, "user.schema.json");
  await rm(outputDir, { force: true, recursive: true });
  await mkdir(outputDir, { recursive: true });

  const { stdout } = await runCli([
    "--json",
    "schema",
    "export",
    "--module",
    fixturePath,
    "--export",
    "userSchema",
    "--out",
    outputPath,
  ]);
  const payload = JSON.parse(stdout) as { ok: boolean; output_path: string; bytes: number };
  const file = JSON.parse(await readFile(outputPath, "utf8")) as { type: string };

  assert.equal(payload.ok, true);
  assert.equal(payload.output_path, outputPath);
  assert.equal(payload.bytes > 0, true);
  assert.equal(file.type, "object");
});

test("exports annotated schemas to JSON Schema through the CLI", async () => {
  const { stdout } = await runCli([
    "--json",
    "schema",
    "export",
    "--module",
    fixturePath,
    "--export",
    "annotatedUserSchema",
  ]);
  const payload = JSON.parse(stdout) as { ok: boolean; schema: unknown };

  assert.deepEqual(payload, {
    ok: true,
    command: "schema export",
    module: fixturePath,
    export: "annotatedUserSchema",
    schema: {
      type: "object",
      title: "User",
      description: "User resource.",
      properties: {
        id: {
          type: "string",
          title: "User id",
          description: "Stable public user identifier.",
          examples: ["user_1"],
        },
        role: {
          anyOf: [{ const: "admin" }, { const: "member" }],
        },
      },
      required: ["id", "role"],
      additionalProperties: false,
    },
  });
});

test("reports unrepresentable JSON Schema behavior with machine-readable issues", async () => {
  await assert.rejects(
    runCli([
      "--json",
      "schema",
      "export",
      "--module",
      fixturePath,
      "--export",
      "refinedSchema",
    ]),
    (error) => {
      const payload = JSON.parse(getStderr(error)) as {
        ok: boolean;
        error: {
          code: string;
          issues: readonly {
            code: string;
            path: readonly (string | number)[];
            side: string;
            target: string;
          }[];
        };
      };

      assert.equal(payload.ok, false);
      assert.equal(payload.error.code, "json_schema_export_failed");
      assert.deepEqual(payload.error.issues, [{
        code: "json_schema.refinement.unrepresentable",
        severity: "error",
        message: "Refinement \"non-empty/v1\" cannot be represented in JSON Schema.",
        path: ["properties", "name"],
        side: "input",
        target: "draft-2020-12",
        details: { refinement_id: "non-empty/v1" },
      }]);
      return true;
    },
  );
});

test("validates JSON input through a schema module", async () => {
  const inputPath = await writeJsonFixture("valid-user.json", {
    id: "user_1",
    role: "admin",
  });

  const { stdout } = await runCli([
    "--json",
    "schema",
    "validate",
    "--module",
    fixturePath,
    "--export",
    "userSchema",
    "--input",
    inputPath,
  ]);
  const payload = JSON.parse(stdout) as { ok: boolean; valid: boolean; data: unknown };

  assert.deepEqual(payload, {
    ok: true,
    command: "schema validate",
    module: fixturePath,
    export: "userSchema",
    input: inputPath,
    valid: true,
    data: {
      id: "user_1",
      role: "admin",
    },
  });
});

test("validates JSON input from stdin", async () => {
  const { stdout } = await runCliWithInput(
    [
      "--json",
      "schema",
      "validate",
      "--module",
      fixturePath,
      "--export",
      "userSchema",
      "--input",
      "-",
    ],
    JSON.stringify({ id: "user_2", role: "member" }),
  );
  const payload = JSON.parse(stdout) as { ok: boolean; input: string; valid: boolean; data: unknown };

  assert.deepEqual(payload, {
    ok: true,
    command: "schema validate",
    module: fixturePath,
    export: "userSchema",
    input: "stdin",
    valid: true,
    data: {
      id: "user_2",
      role: "member",
    },
  });
});

test("returns validation issues for invalid JSON input", async () => {
  const inputPath = await writeJsonFixture("invalid-user.json", {
    id: 42,
    role: "owner",
  });

  await assert.rejects(
    runCli([
      "--json",
      "schema",
      "validate",
      "--module",
      fixturePath,
      "--export",
      "userSchema",
      "--input",
      inputPath,
    ]),
    (error) => {
      const stdout = getStdout(error);
      const payload = JSON.parse(stdout) as {
        ok: boolean;
        valid: boolean;
        issues: readonly {
          readonly code: string;
          readonly path: readonly unknown[];
          readonly branches?: readonly {
            readonly index: number;
            readonly issues: readonly { readonly code: string; readonly path: readonly unknown[] }[];
          }[];
        }[];
      };

      assert.equal(payload.ok, false);
      assert.equal(payload.valid, false);
      assert.equal(payload.issues.length, 2);
      assert.deepEqual(payload.issues.map((issue) => issue.path), [["id"], ["role"]]);
      assert.deepEqual(payload.issues[1]?.branches, [
        {
          index: 0,
          issues: [{
            code: "invalid_literal",
            path: ["role"],
            expected: "\"admin\"",
            received: "string",
            message: "Expected literal \"admin\".",
            suggestion: "Pass the exact literal value.",
          }],
        },
        {
          index: 1,
          issues: [{
            code: "invalid_literal",
            path: ["role"],
            expected: "\"member\"",
            received: "string",
            message: "Expected literal \"member\".",
            suggestion: "Pass the exact literal value.",
          }],
        },
      ]);
      return true;
    },
  );
});

test("preserves addressable custom diagnostics in JSON validation output", async () => {
  const inputPath = await writeJsonFixture("invalid-period.json", {
    start: 5,
    end: 2,
  });

  await assert.rejects(
    runCli([
      "--json",
      "schema",
      "validate",
      "--module",
      fixturePath,
      "--export",
      "addressableDiagnosticsSchema",
      "--input",
      inputPath,
    ]),
    (error) => {
      const payload = JSON.parse(getStdout(error)) as {
        valid: boolean;
        issues: readonly { readonly code: string; readonly path: readonly unknown[] }[];
      };

      assert.equal(payload.valid, false);
      assert.deepEqual(payload.issues.map((issue) => [issue.code, issue.path]), [
        ["custom", ["start"]],
        ["custom", ["end"]],
      ]);
      return true;
    },
  );
});

test("writes validation reports to a file", async () => {
  const inputPath = await writeJsonFixture("valid-report-user.json", {
    id: "user_3",
    role: "admin",
  });
  const outputDir = resolve(packageRoot, ".tmp", "cli-test");
  const outputPath = resolve(outputDir, "validation-report.json");

  const { stdout } = await runCli([
    "--json",
    "schema",
    "validate",
    "--module",
    fixturePath,
    "--export",
    "userSchema",
    "--input",
    inputPath,
    "--out",
    outputPath,
  ]);
  const payload = JSON.parse(stdout) as {
    ok: boolean;
    valid: boolean;
    output_path: string;
    bytes: number;
  };
  const file = JSON.parse(await readFile(outputPath, "utf8")) as { ok: boolean; valid: boolean };

  assert.equal(payload.ok, true);
  assert.equal(payload.valid, true);
  assert.equal(payload.output_path, outputPath);
  assert.equal(payload.bytes > 0, true);
  assert.deepEqual(file, {
    ok: true,
    command: "schema validate",
    module: fixturePath,
    export: "userSchema",
    input: inputPath,
    valid: true,
    data: {
      id: "user_3",
      role: "admin",
    },
  });
});

test("reports malformed JSON input as a machine-readable error", async () => {
  const outputDir = resolve(packageRoot, ".tmp", "cli-test");
  const inputPath = resolve(outputDir, "malformed.json");
  await mkdir(outputDir, { recursive: true });
  await writeFile(inputPath, "{ nope", "utf8");

  await assert.rejects(
    runCli([
      "--json",
      "schema",
      "validate",
      "--module",
      fixturePath,
      "--export",
      "userSchema",
      "--input",
      inputPath,
    ]),
    (error) => {
      const stderr = getStderr(error);
      const payload = JSON.parse(stderr) as { ok: boolean; error: { code: string } };

      assert.equal(payload.ok, false);
      assert.equal(payload.error.code, "invalid_json");
      return true;
    },
  );
});

test("generates TypeScript types from a schema module", async () => {
  const { stdout } = await runCli([
    "--json",
    "schema",
    "types",
    "--module",
    fixturePath,
    "--export",
    "profileSchema",
    "--name",
    "Profile",
  ]);
  const payload = JSON.parse(stdout) as { ok: boolean; source: string };

  assert.deepEqual(payload, {
    ok: true,
    command: "schema types",
    module: fixturePath,
    export: "profileSchema",
    type: "Profile",
    source: `export type Profile = {
  id: string;
  tags: ReadonlyArray<string>;
  coordinates: readonly [number, number];
  flags: Readonly<Record<string, boolean>>;
  bio?: string | null;
  score: unknown;
};
`,
  });
});

test("generates TypeScript types from annotated schemas through the CLI", async () => {
  const { stdout } = await runCli([
    "--json",
    "schema",
    "types",
    "--module",
    fixturePath,
    "--export",
    "annotatedUserSchema",
    "--name",
    "User",
  ]);
  const payload = JSON.parse(stdout) as { ok: boolean; source: string };

  assert.deepEqual(payload, {
    ok: true,
    command: "schema types",
    module: fixturePath,
    export: "annotatedUserSchema",
    type: "User",
    source: `export type User = {
  id: string;
  role: "admin" | "member";
};
`,
  });
});

test("writes generated TypeScript types to a file", async () => {
  const outputDir = resolve(packageRoot, ".tmp", "cli-test");
  const outputPath = resolve(outputDir, "profile.d.ts");
  await rm(outputDir, { force: true, recursive: true });
  await mkdir(outputDir, { recursive: true });

  const { stdout } = await runCli([
    "--json",
    "schema",
    "types",
    "--module",
    fixturePath,
    "--export",
    "profileSchema",
    "--name",
    "Profile",
    "--out",
    outputPath,
  ]);
  const payload = JSON.parse(stdout) as { ok: boolean; output_path: string; bytes: number };
  const file = await readFile(outputPath, "utf8");

  assert.equal(payload.ok, true);
  assert.equal(payload.output_path, outputPath);
  assert.equal(payload.bytes, Buffer.byteLength(file));
  assert.match(file, /export type Profile/);
});

test("rejects invalid generated TypeScript type names", async () => {
  await assert.rejects(
    runCli([
      "--json",
      "schema",
      "types",
      "--module",
      fixturePath,
      "--export",
      "profileSchema",
      "--name",
      "not-valid",
    ]),
    (error) => {
      const stderr = getStderr(error);
      const payload = JSON.parse(stderr) as { ok: boolean; error: { code: string } };

      assert.equal(payload.ok, false);
      assert.equal(payload.error.code, "invalid_type_name");
      return true;
    },
  );
});

test("writes deterministic contract snapshots", async () => {
  const outputDir = resolve(packageRoot, ".tmp", "contract-snapshot-test");
  const outputPath = resolve(outputDir, "user.contract.json");
  await rm(outputDir, { force: true, recursive: true });
  await mkdir(outputDir, { recursive: true });

  const { stdout } = await runCli([
    "--json",
    "contract",
    "snapshot",
    "--module",
    fixturePath,
    "--export",
    "annotatedUserSchema",
    "--id",
    "user",
    "--out",
    outputPath,
  ]);
  const payload = JSON.parse(stdout) as {
    ok: boolean;
    contract_id: string;
    fingerprint: string;
    output_path: string;
  };
  const snapshot = JSON.parse(await readFile(outputPath, "utf8")) as {
    format: string;
    id: string;
    fingerprint: string;
    contract: { metadata?: Record<string, unknown> };
  };

  assert.equal(payload.ok, true);
  assert.equal(payload.contract_id, "user");
  assert.equal(payload.output_path, outputPath);
  assert.match(payload.fingerprint, /^sha256:[a-f0-9]{64}$/);
  assert.equal(snapshot.format, "safe-shape.contract/v1");
  assert.equal(snapshot.id, "user");
  assert.equal("examples" in (snapshot.contract.metadata ?? {}), false);
});

test("checks compatible contracts against a stored snapshot", async () => {
  const outputDir = resolve(packageRoot, ".tmp", "contract-check-safe-test");
  const snapshotPath = resolve(outputDir, "user.contract.json");
  await rm(outputDir, { force: true, recursive: true });
  await mkdir(outputDir, { recursive: true });

  await runCli([
    "contract",
    "snapshot",
    "--module",
    fixturePath,
    "--export",
    "userSchemaV1",
    "--id",
    "user",
    "--out",
    snapshotPath,
  ]);
  const { stdout } = await runCli([
    "--json",
    "contract",
    "check",
    "--module",
    fixturePath,
    "--export",
    "userSchema",
    "--against",
    snapshotPath,
  ]);
  const payload = JSON.parse(stdout) as {
    ok: boolean;
    compatible: boolean;
    status: string;
    findings: readonly { readonly code: string }[];
  };

  assert.equal(payload.ok, true);
  assert.equal(payload.compatible, true);
  assert.equal(payload.status, "safe");
  assert.equal(payload.findings[0]?.code, "object.property.added.optional");
});

test("writes and checks recursive v2 contract snapshots by graph side", async () => {
  const outputDir = resolve(packageRoot, ".tmp", "contract-check-v2-test");
  const snapshotPath = resolve(outputDir, "tree.contract.json");
  await rm(outputDir, { force: true, recursive: true });
  await mkdir(outputDir, { recursive: true });

  const snapshotRun = await runCli([
    "--json",
    "contract",
    "snapshot",
    "--module",
    fixturePath,
    "--export",
    "treeSchema",
    "--id",
    "tree",
    "--format",
    "v2",
    "--out",
    snapshotPath,
  ]);
  const snapshotPayload = JSON.parse(snapshotRun.stdout) as { format: string };
  const snapshot = JSON.parse(await readFile(snapshotPath, "utf8")) as { format: string };
  assert.equal(snapshotPayload.format, "safe-shape.contract/v2");
  assert.equal(snapshot.format, "safe-shape.contract/v2");

  const { stdout } = await runCli([
    "--json",
    "contract",
    "check",
    "--module",
    fixturePath,
    "--export",
    "treeSchema",
    "--against",
    snapshotPath,
    "--side",
    "output",
  ]);
  const payload = JSON.parse(stdout) as {
    format: string;
    side: string;
    status: string;
    migration: { decision: string };
  };
  assert.equal(payload.format, "safe-shape.contract/v2");
  assert.equal(payload.side, "output");
  assert.equal(payload.status, "safe");
  assert.equal(payload.migration.decision, "compatible");
});

test("returns exit code 2 and a report for breaking contract changes", async () => {
  const outputDir = resolve(packageRoot, ".tmp", "contract-check-breaking-test");
  const snapshotPath = resolve(outputDir, "user.contract.json");
  await rm(outputDir, { force: true, recursive: true });
  await mkdir(outputDir, { recursive: true });

  await runCli([
    "contract",
    "snapshot",
    "--module",
    fixturePath,
    "--export",
    "userSchemaV1",
    "--id",
    "user",
    "--out",
    snapshotPath,
  ]);

  await assert.rejects(
    runCli([
      "--json",
      "contract",
      "check",
      "--module",
      fixturePath,
      "--export",
      "userSchemaBreaking",
      "--against",
      snapshotPath,
    ]),
    (error) => {
      const payload = JSON.parse(getStdout(error)) as {
        ok: boolean;
        compatible: boolean;
        status: string;
        findings: readonly { readonly code: string }[];
        migration: {
          decision: string;
          migrationRequired: boolean;
          diagnostics: readonly { readonly code: string; readonly suggestion?: string }[];
        };
      };
      assert.equal((error as { code?: number }).code, 2);
      assert.equal(payload.ok, false);
      assert.equal(payload.compatible, false);
      assert.equal(payload.status, "breaking");
      assert.equal(payload.findings[0]?.code, "object.property.added.required");
      assert.equal(payload.migration.decision, "migration-required");
      assert.equal(payload.migration.migrationRequired, true);
      assert.equal(payload.migration.diagnostics[0]?.code, "object.property.added.required");
      assert.equal(typeof payload.migration.diagnostics[0]?.suggestion, "string");
      return true;
    },
  );
});

test("reports unproven contract changes as manual-review migrations", async () => {
  const outputDir = resolve(packageRoot, ".tmp", "contract-check-manual-review-test");
  const snapshotPath = resolve(outputDir, "profile.contract.json");
  await rm(outputDir, { force: true, recursive: true });
  await mkdir(outputDir, { recursive: true });

  await runCli([
    "contract",
    "snapshot",
    "--module",
    fixturePath,
    "--export",
    "profileSchema",
    "--id",
    "profile",
    "--out",
    snapshotPath,
  ]);

  await assert.rejects(
    runCli([
      "--json",
      "contract",
      "check",
      "--module",
      fixturePath,
      "--export",
      "profileSchema",
      "--against",
      snapshotPath,
    ]),
    (error) => {
      const payload = JSON.parse(getStdout(error)) as {
        status: string;
        migration: {
          decision: string;
          manualReviewRequired: boolean;
          diagnostics: readonly { readonly status: string }[];
        };
      };
      assert.equal((error as { code?: number }).code, 2);
      assert.equal(payload.status, "unknown");
      assert.equal(payload.migration.decision, "manual-review");
      assert.equal(payload.migration.manualReviewRequired, true);
      assert.equal(payload.migration.diagnostics[0]?.status, "unknown");
      return true;
    },
  );
});

test("rejects invalid contract formats and v1 side selection", async () => {
  await assert.rejects(
    runCli([
      "--json",
      "contract",
      "snapshot",
      "--module",
      fixturePath,
      "--format",
      "v3",
    ]),
    (error) => {
      const payload = JSON.parse(getStderr(error)) as { error: { code: string } };
      assert.equal(payload.error.code, "invalid_contract_format");
      return true;
    },
  );

  const outputDir = resolve(packageRoot, ".tmp", "contract-check-v1-side-test");
  const snapshotPath = resolve(outputDir, "user.contract.json");
  await rm(outputDir, { force: true, recursive: true });
  await mkdir(outputDir, { recursive: true });
  await runCli([
    "contract",
    "snapshot",
    "--module",
    fixturePath,
    "--export",
    "userSchema",
    "--out",
    snapshotPath,
  ]);
  await assert.rejects(
    runCli([
      "--json",
      "contract",
      "check",
      "--module",
      fixturePath,
      "--export",
      "userSchema",
      "--against",
      snapshotPath,
      "--side",
      "input",
    ]),
    (error) => {
      const payload = JSON.parse(getStderr(error)) as { error: { code: string } };
      assert.equal(payload.error.code, "invalid_contract_side");
      return true;
    },
  );
});

test("reports native constraint narrowing through contract check", async () => {
  const outputDir = resolve(packageRoot, ".tmp", "contract-check-constraint-test");
  const snapshotPath = resolve(outputDir, "name.contract.json");
  await rm(outputDir, { force: true, recursive: true });
  await mkdir(outputDir, { recursive: true });

  await runCli([
    "contract",
    "snapshot",
    "--module",
    fixturePath,
    "--export",
    "constrainedNameV1",
    "--id",
    "name",
    "--out",
    snapshotPath,
  ]);

  await assert.rejects(
    runCli([
      "--json",
      "contract",
      "check",
      "--module",
      fixturePath,
      "--export",
      "constrainedNameV2",
      "--against",
      snapshotPath,
    ]),
    (error) => {
      const payload = JSON.parse(getStdout(error)) as {
        status: string;
        findings: readonly { readonly code: string }[];
      };
      assert.equal(payload.status, "breaking");
      assert.equal(payload.findings[0]?.code, "string.length.changed");
      return true;
    },
  );
});

test("rejects tampered contract snapshots as operational errors", async () => {
  const snapshotPath = await writeJsonFixture("tampered-contract.json", {
    format: "safe-shape.contract/v1",
    id: "user",
    fingerprint: "sha256:tampered",
    contract: { kind: "string" },
  });

  await assert.rejects(
    runCli([
      "--json",
      "contract",
      "check",
      "--module",
      fixturePath,
      "--export",
      "userSchema",
      "--against",
      snapshotPath,
    ]),
    (error) => {
      const payload = JSON.parse(getStderr(error)) as { error: { code: string } };
      assert.equal(payload.error.code, "invalid_contract_snapshot");
      return true;
    },
  );
});

test("prints machine-readable errors under --json", async () => {
  await assert.rejects(
    runCli([
      "--json",
      "schema",
      "export",
      "--module",
      fixturePath,
      "--export",
      "missingSchema",
    ]),
    (error) => {
      const stderr = getStderr(error);
      const payload = JSON.parse(stderr) as { ok: boolean; error: { code: string } };

      assert.equal(payload.ok, false);
      assert.equal(payload.error.code, "missing_export");
      return true;
    },
  );
});

async function runCli(args: readonly string[]) {
  return await execFileAsync(process.execPath, [cliPath, ...args], {
    cwd: packageRoot,
  });
}

async function runCliWithInput(args: readonly string[], input: string): Promise<{ readonly stdout: string; readonly stderr: string }> {
  return await new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [cliPath, ...args], {
      cwd: packageRoot,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolvePromise({ stdout, stderr });
        return;
      }

      const error = new Error(`Command failed with exit code ${code}`) as Error & {
        stdout: string;
        stderr: string;
      };
      error.stdout = stdout;
      error.stderr = stderr;
      reject(error);
    });

    child.stdin.end(input);
  });
}

async function writeJsonFixture(fileName: string, value: unknown): Promise<string> {
  const outputDir = resolve(packageRoot, ".tmp", "cli-test");
  const inputPath = resolve(outputDir, fileName);
  await mkdir(outputDir, { recursive: true });
  await writeFile(inputPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return inputPath;
}

function getStdout(error: unknown): string {
  if (typeof error === "object" && error !== null && "stdout" in error) {
    return String(error.stdout);
  }

  throw error;
}

function getStderr(error: unknown): string {
  if (typeof error === "object" && error !== null && "stderr" in error) {
    return String(error.stderr);
  }

  throw error;
}
