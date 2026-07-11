import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const value = await readFile(new URL("../src/value.txt", import.meta.url), "utf8").then((item) => item.trim(), () => null);
await mkdir(process.env.TY_CONTEXT_ARTIFACT_DIR, { recursive: true });
await writeFile(path.join(process.env.TY_CONTEXT_ARTIFACT_DIR, "product-result.json"), JSON.stringify({ value }));
