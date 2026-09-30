import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";

export function checkTranslations(root) {
  const failures = [];
  const inventory = JSON.parse(readFileSync(join(root, "docs/translations.json"), "utf8"));
  const covered = new Set();
  const read = (path) => readFileSync(join(root, path), "utf8");
  const digest = (text) => createHash("sha256").update(text).digest("hex");
  const target = (from, to) => relative(dirname(from), to).split(sep).join("/");
  for (const pair of inventory.pairs) {
    if (covered.has(pair.english)) failures.push(`Duplicate translation source: ${pair.english}`);
    covered.add(pair.english);
    for (const [path, hash, other] of [[pair.english, pair.englishSha256, pair.russian], [pair.russian, pair.russianSha256, pair.english]]) {
      if (!existsSync(join(root, path))) {
        failures.push(`Missing translation file: ${path}`);
        continue;
      }
      const text = read(path);
      if (digest(text) !== hash) failures.push(`Translation review required for ${pair.english} ↔ ${pair.russian}: ${path} changed`);
      if (!text.includes(`](${target(path, other)})`)) failures.push(`${path} must link to ${other}`);
    }
  }
  for (const entry of inventory.englishOnly) {
    if (covered.has(entry.path)) failures.push(`Duplicate documentation classification: ${entry.path}`);
    covered.add(entry.path);
    if (!entry.reason?.trim() || !existsSync(join(root, entry.path))) failures.push(`Invalid English-only exception: ${entry.path}`);
    if (/^docs\/api\//.test(entry.path) || /^packages\//.test(entry.path)) failures.push(`Current API and package guides require translation: ${entry.path}`);
  }
  const required = ["README.md",
    ...["docs", "docs/api"].flatMap((dir) => readdirSync(join(root, dir)).filter((file) => file.endsWith(".md")).map((file) => `${dir}/${file}`)),
    ...readdirSync(join(root, "packages")).map((pkg) => `packages/${pkg}/README.md`),
  ];
  for (const path of required) if (!covered.has(path)) failures.push(`Documentation needs a Russian counterpart or explicit archival classification: ${path}`);
  return failures;
}
