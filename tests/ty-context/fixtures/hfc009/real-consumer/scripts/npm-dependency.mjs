import { chunk } from "lodash-es";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const raw = await readFile(new URL("../src/value.txt", import.meta.url), "utf8").catch(() => "");
const value = chunk([raw.trim()], 1).flat()[0] ?? null;
await mkdir(process.env.TY_CONTEXT_ARTIFACT_DIR, { recursive: true });
await writeFile(path.join(process.env.TY_CONTEXT_ARTIFACT_DIR, "product-result.json"), JSON.stringify({ value }));
