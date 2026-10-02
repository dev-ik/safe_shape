import { readFile, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { apiContract, compareApiSnapshots, createApiSnapshot, parseApiSnapshot, toOpenApi, type ApiContract } from "@safe-shape/api";

export async function runApiCommand(command: string, flags: Readonly<Record<string, string | boolean>>): Promise<{ payload: unknown; text: string; exitCode: number }> {
  const allowed = ["json", "module", "export", "out", ...(command === "export" ? ["title", "version"] : command === "check" ? ["against"] : [])];
  if (Object.keys(flags).some((flag) => !allowed.includes(flag))) throw new TypeError("Unsupported flag for API command.");
  function flag(name: string, required = false): string | undefined {
    const value = flags[name];
    if (value !== undefined && typeof value !== "string") throw new TypeError(`--${name} requires a value.`);
    if (required && (value === undefined || !value.length)) throw new TypeError(`Missing required flag: --${name}.`);
    return value;
  }
  const modulePath = flag("module", true)!;
  const out = flag("out");
  const against = command === "check" ? flag("against", true)! : undefined;
  if (against !== undefined && out !== undefined) {
    if (resolve(against) === resolve(out)) throw new TypeError("Check output must not overwrite the baseline.");
    const baselineStat = await stat(resolve(against));
    let outputStat;
    try { outputStat = await stat(resolve(out)); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    if (outputStat && outputStat.dev === baselineStat.dev && outputStat.ino === baselineStat.ino) throw new TypeError("Check output must not overwrite the baseline.");
  }
  const exportName = flag("export") ?? "default";
  const module = await import(pathToFileURL(resolve(modulePath)).href) as Record<string, unknown>;
  if (!Object.hasOwn(module, exportName)) throw new TypeError(`Module does not export "${exportName}".`);
  const value = module[exportName] as ApiContract | undefined;
  if (!value || typeof value !== "object" || !Object.hasOwn(value, "endpoints")) throw new TypeError("Selected export is not an API catalog.");
  const api = apiContract(value.endpoints);
  let artifact: unknown;
  let key: string;
  let exitCode = 0;
  if (command === "export") {
    artifact = toOpenApi(api, { title: flag("title", true)!, version: flag("version", true)! });
    key = "document";
  } else if (command === "snapshot") {
    artifact = createApiSnapshot(api);
    key = "snapshot";
  } else if (command === "check") {
    const previous = parseApiSnapshot(JSON.parse(await readFile(resolve(against!), "utf8")));
    artifact = compareApiSnapshots(previous, createApiSnapshot(api));
    key = "report";
    exitCode = (artifact as { compatible: boolean }).compatible ? 0 : 2;
  } else {
    throw new TypeError("Unknown API command.");
  }
  if (out !== undefined) await writeFile(resolve(out), JSON.stringify(artifact, null, 2) + "\n", "utf8");
  return {
    payload: { ok: true, command: `api ${command}`, [key]: artifact, ...(out === undefined ? {} : { out: resolve(out) }) },
    text: out === undefined ? JSON.stringify(artifact, null, 2) : `Wrote ${key} to ${resolve(out)}.`, exitCode,
  };
}
