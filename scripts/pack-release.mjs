import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectDirectory = dirname(dirname(fileURLToPath(import.meta.url)));
const outputDirectory = join(projectDirectory, "release-artifacts");
const npmCacheDirectory = join(projectDirectory, ".npm-cache");
const packageDirectories = [
  "packages/core",
  "packages/compat",
  "packages/http",
  "packages/json-schema",
  "packages/typescript",
  "packages/validation",
  "packages/cli",
  "packages/safe-shape",
].map((packagePath) => join(projectDirectory, packagePath));

rmSync(outputDirectory, { recursive: true, force: true });
mkdirSync(outputDirectory, { recursive: true });

for (const packageDirectory of packageDirectories) {
  execFileSync(
    "npm",
    ["--cache", npmCacheDirectory, "pack", "--pack-destination", outputDirectory],
    { cwd: packageDirectory, stdio: "inherit" },
  );
}

const packages = packageDirectories.map((packageDirectory) =>
  JSON.parse(readFileSync(join(packageDirectory, "package.json"), "utf8")),
);
console.log(
  `Prepared release artifacts for ${packages
    .map(({ name, version }) => `${name}@${version}`)
    .join(", ")}.`,
);
