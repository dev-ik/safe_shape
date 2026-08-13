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

test("prints help", async () => {
  const { stdout } = await runCli(["--help"]);

  assert.match(stdout, /safe-shape 1\.0\.1/);
  assert.match(stdout, /schema export/);
  assert.match(stdout, /schema validate/);
  assert.match(stdout, /schema types/);
});

test("prints machine-readable doctor output", async () => {
  const { stdout } = await runCli(["--json", "doctor"]);
  const payload = JSON.parse(stdout) as { ok: boolean; auth_required: boolean };

  assert.equal(payload.ok, true);
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
        issues: readonly { readonly code: string; readonly path: readonly unknown[] }[];
      };

      assert.equal(payload.ok, false);
      assert.equal(payload.valid, false);
      assert.equal(payload.issues.length, 2);
      assert.deepEqual(payload.issues.map((issue) => issue.path), [["id"], ["role"]]);
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
