import { lstat, readFile, readdir, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { sha256Hex } from "./composite-campaign-codec.js";
import type { FrozenVerificationSpecV3 } from "./long-task-contract-schema.js";
import type { ArtifactManifestV2 } from "./long-task-run-result.js";

const MAX_ARTIFACTS = 1000; const MAX_TOTAL = 100 * 1024 * 1024;
export async function collectFrozenArtifacts(spec: FrozenVerificationSpecV3, artifactRoot: string, commandStartedAt: string): Promise<ArtifactManifestV2> {
  const rootReal = await realpath(artifactRoot); const artifacts: ArtifactManifestV2["artifacts"] = []; const caseFolded = new Set<string>(); let total = 0;
  async function visit(dir: string, relative = ""): Promise<void> { for (const entry of await readdir(dir, { withFileTypes: true })) { const rel = relative ? `${relative}/${entry.name}` : entry.name; const folded = rel.toLocaleLowerCase("en-US"); if (caseFolded.has(folded)) throw new Error(`artifact_case_collision:${rel}`); caseFolded.add(folded); const file = path.join(dir, entry.name); const link = await lstat(file); if (link.isSymbolicLink()) throw new Error(`artifact_symlink_escape:${rel}`); if (entry.isDirectory()) { await visit(file, rel); continue; } if (!entry.isFile()) throw new Error(`artifact_special_file:${rel}`); const actual = await realpath(file); if (actual !== rootReal && !actual.startsWith(`${rootReal}${path.sep}`)) throw new Error(`artifact_outside_run_dir:${rel}`); if (!matchesAny(rel, spec.artifact_globs)) throw new Error(`undeclared_artifact_path:${rel}`); const info = await stat(file); if (info.nlink > 1) throw new Error(`artifact_hardlink_escape:${rel}`); if (info.mtimeMs < Date.parse(commandStartedAt) - 1000) throw new Error(`artifact_predates_command:${rel}`); total += info.size; if (artifacts.length >= MAX_ARTIFACTS || total > MAX_TOTAL) throw new Error(`artifact_limits_exceeded:${spec.id}`); artifacts.push({ path: rel, sha256: sha256Hex(await readFile(file)), size: info.size, mtime: info.mtime.toISOString() }); } }
  await visit(artifactRoot); artifacts.sort((a, b) => a.path.localeCompare(b.path)); return { spec_id: spec.id, artifacts };
}
function matchesAny(value: string, globs: string[]): boolean { return globs.some((glob) => new RegExp(`^${glob.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*")}$`, "i").test(value)); }
