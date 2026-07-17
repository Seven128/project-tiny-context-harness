import { stat } from "node:fs/promises";
import path from "node:path";

export async function nearestRunnerFile(
  start: string,
  repository: string,
  name: string,
): Promise<string | null> {
  let current = path.resolve(start);
  const root = path.resolve(repository);
  for (;;) {
    const candidate = path.join(current, name);
    if ((await stat(candidate).catch(() => null))?.isFile()) return candidate;
    if (current === root) return null;
    const parent = path.dirname(current);
    if (parent === current || !parent.startsWith(root)) return null;
    current = parent;
  }
}

export async function npmCliPath(): Promise<string> {
  const candidates = [
    process.env.npm_execpath,
    path.join(
      path.dirname(process.execPath),
      "node_modules",
      "npm",
      "bin",
      "npm-cli.js",
    ),
  ].filter((candidate): candidate is string => Boolean(candidate));
  for (const candidate of candidates)
    if ((await stat(candidate).catch(() => null))?.isFile()) return candidate;
  throw new Error("npm_cli_not_found_for_package_script_runner");
}

export async function npxCliPath(): Promise<string> {
  const candidates = [
    process.env.npm_execpath
      ? path.join(path.dirname(process.env.npm_execpath), "npx-cli.js")
      : null,
    path.join(
      path.dirname(process.execPath),
      "node_modules",
      "npm",
      "bin",
      "npx-cli.js",
    ),
  ].filter((candidate): candidate is string => Boolean(candidate));
  for (const candidate of candidates)
    if ((await stat(candidate).catch(() => null))?.isFile()) return candidate;
  throw new Error("npx_cli_not_found_for_playwright_runner");
}
