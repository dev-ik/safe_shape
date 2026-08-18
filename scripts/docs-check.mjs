import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ignoredDirectories = new Set([
  ".git",
  ".history",
  ".npm-cache",
  ".tmp",
  "node_modules",
  "release-artifacts",
]);
const markdownFiles = listMarkdownFiles(root);
const failures = [];

for (const file of markdownFiles) {
  checkLocalTargets(file);
}

const languagePairs = [
  ["README.md", "README.ru.md"],
  ["docs/README.md", "docs/ru/README.md"],
  ["docs/quick-start.md", "docs/ru/quick-start.md"],
  ["docs/migration-1-to-2.md", "docs/ru/migration-1-to-2.md"],
];

for (const [englishPath, russianPath] of languagePairs) {
  checkLanguagePair(englishPath, russianPath);
}

const version = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
assert(
  read("README.md").includes(`SafeShape is on the \`${version}\` stable release line.`),
  `README.md project status must match package version ${version}`,
);
assert(
  read("README.ru.md").includes(`SafeShape находится на стабильной версии \`${version}\`.`),
  `README.ru.md project status must match package version ${version}`,
);

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`docs-check: ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log(`docs-check: ok (${markdownFiles.length} Markdown files)`);
}

function listMarkdownFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) return [];

    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) return listMarkdownFiles(entryPath);
    return entry.isFile() && entry.name.endsWith(".md") ? [entryPath] : [];
  });
}

function checkLocalTargets(file) {
  const source = readFileSync(file, "utf8");
  const targets = [
    ...source.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g),
    ...source.matchAll(/<(?:img|source)\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi),
  ];

  for (const match of targets) {
    const rawTarget = match[1].trim().replace(/^<|>$/g, "").split(/\s+["']/u, 1)[0];
    if (!rawTarget || /^(?:[a-z]+:|#)/iu.test(rawTarget)) continue;

    let decodedTarget;
    try {
      decodedTarget = decodeURIComponent(rawTarget.split("#", 1)[0]);
    } catch {
      failures.push(`${display(file)} has an invalid encoded target: ${rawTarget}`);
      continue;
    }

    if (!decodedTarget) continue;
    const resolvedTarget = resolve(dirname(file), decodedTarget);
    assert(
      existsSync(resolvedTarget),
      `${display(file)} links to missing local target ${rawTarget}`,
    );
  }
}

function checkLanguagePair(englishPath, russianPath) {
  const englishTarget = relative(dirname(englishPath), russianPath).split(sep).join("/");
  const russianTarget = relative(dirname(russianPath), englishPath).split(sep).join("/");

  assert(read(englishPath).includes(`](${englishTarget})`), `${englishPath} must link to ${russianPath}`);
  assert(read(russianPath).includes(`](${russianTarget})`), `${russianPath} must link to ${englishPath}`);
}

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function display(path) {
  return relative(root, path).split(sep).join("/");
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}
