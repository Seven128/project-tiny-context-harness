import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { canonicalJson, sha256Hex } from "./composite-campaign-codec.js";
import type { CompiledContractV3 } from "./long-task-contract-schema.js";
import type { SnapshotFileV2, SnapshotHandle, SnapshotManifestV2 } from "./long-task-run-result.js";

const EXCLUDED = new Set([".git", "node_modules", ".DS_Store"]);
const VERIFIER_OWNED_RUNTIME = new Set([".codex/ty-context-long-task-hook-heartbeat.json", ".codex/ty-context-active-long-task.json"]);

export async function createLongTaskSnapshot(projectRoot: string, contract: CompiledContractV3, runId: string): Promise<SnapshotHandle> {
  const source = path.resolve(projectRoot); if (source !== path.resolve(contract.repository_root)) throw new Error("Snapshot repository identity mismatch");
  const taskRelative = path.relative(source, path.resolve(contract.workdir)).replace(/\\/g, "/");
  const root = await mkdtemp(path.join(os.tmpdir(), `ty-context-${safe(runId)}-`)); const files: SnapshotFileV2[] = []; const inodeSeen = new Set<string>();
  async function copyDirectory(from: string, relative = ""): Promise<void> {
    for (const entry of await readdir(from, { withFileTypes: true })) {
      if (!relative && EXCLUDED.has(entry.name)) continue;
      const rel = relative ? `${relative}/${entry.name}` : entry.name;
      if (rel === taskRelative || rel.startsWith(`${taskRelative}/`) || rel.startsWith("tmp/ty-context/plan-acceptance/") || VERIFIER_OWNED_RUNTIME.has(rel)) continue;
      const sourcePath = path.join(from, entry.name); const targetPath = path.join(root, ...rel.split("/"));
      if (entry.isSymbolicLink()) throw new Error(`snapshot_symlink_rejected:${rel}`);
      if (entry.isDirectory()) { await mkdir(targetPath, { recursive: true }); await copyDirectory(sourcePath, rel); continue; }
      if (!entry.isFile()) throw new Error(`snapshot_special_file_rejected:${rel}`);
      const info = await stat(sourcePath,{bigint:true}); const inode = `${info.dev}:${info.ino}`; if (info.nlink > 1n || inodeSeen.has(inode)) throw new Error(`snapshot_hardlink_rejected:${rel}`); inodeSeen.add(inode);const mode=Number(info.mode);
      const content = await readFile(sourcePath); await mkdir(path.dirname(targetPath), { recursive: true }); await writeFile(targetPath, content, { mode }); files.push({ path: rel, type: "file", mode, size: content.length, sha256: sha256Hex(content) });
    }
  }
  try { await copyDirectory(source); files.sort((a, b) => a.path.localeCompare(b.path)); const git_head = await gitOutput(source, ["rev-parse", "HEAD"]); const submoduleText = await gitOutput(source, ["submodule", "status", "--recursive"]); const submodules = Object.fromEntries((submoduleText ?? "").split(/\r?\n/).filter(Boolean).map((line) => { const match = line.match(/^[-+ U]?([0-9a-f]{40,64})\s+([^\s]+)/i); if (!match) throw new Error(`snapshot_submodule_identity_invalid:${line}`); return [match[2].replace(/\\/g, "/"), match[1]]; })); const identity = { repository_root: source, git_head, submodules, files }; const manifest: SnapshotManifestV2 = { ...identity, snapshot_sha256: sha256Hex(canonicalJson(identity)) }; return { root, manifest, dispose: () => rm(root, { recursive: true, force: true }) }; } catch (error) { await rm(root, { recursive: true, force: true }); throw error; }
}

export async function hashLongTaskWorkspace(projectRoot: string, contract: CompiledContractV3): Promise<string> { const handle = await createLongTaskSnapshot(projectRoot, contract, "workspace-hash"); try { return handle.manifest.snapshot_sha256; } finally { await handle.dispose(); } }
function safe(value: string): string { return value.replace(/[^A-Za-z0-9._-]/g, "-").slice(0, 80); }
async function gitOutput(root: string, argv: string[]): Promise<string | null> { return new Promise((resolve, reject) => { const child = spawn("git", argv, { cwd: root, shell: false, windowsHide: true }); const chunks: Buffer[] = []; const errors: Buffer[] = []; child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk)); child.stderr.on("data", (chunk: Buffer) => errors.push(chunk)); child.on("error", reject); child.on("close", (code) => { if (code === 0) resolve(Buffer.concat(chunks).toString("utf8").trim() || null); else if (argv[0] === "rev-parse") reject(new Error(`snapshot_repository_identity_unavailable:${Buffer.concat(errors).toString("utf8").trim()}`)); else reject(new Error(`snapshot_submodule_identity_unavailable:${Buffer.concat(errors).toString("utf8").trim()}`)); }); }); }
