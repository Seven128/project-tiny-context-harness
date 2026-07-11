import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const raw = await readFile(new URL("../src/value.txt", import.meta.url), "utf8").catch(() => "");
const output = path.join(process.env.TY_CONTEXT_ARTIFACT_DIR, "dist", "built-value.mjs");
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `export const value=${JSON.stringify(raw.trim() || null)};\n`);
const { value } = await import(pathToFileURL(output));
await writeFile(path.join(process.env.TY_CONTEXT_ARTIFACT_DIR, "product-result.json"), JSON.stringify({ value }));
