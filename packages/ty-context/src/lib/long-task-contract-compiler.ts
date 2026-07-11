import { constants } from "node:fs";
import { access, mkdir, readFile, readdir, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalJson, sha256Hex } from "./composite-campaign-codec.js";
import { parseLongTaskSources } from "./long-task-contract-parser.js";
import { validateLongTaskCoverage } from "./long-task-contract-coverage.js";
import { resolveInside } from "./long-task-path-policy.js";
import type { CompiledContractV2, FrozenVerificationSpecV2, VerifierTrustInput } from "./long-task-contract-schema.js";

export async function compileLongTaskContract(workdir: string, repositoryRoot = process.cwd()): Promise<CompiledContractV2> {
  const root = path.resolve(repositoryRoot); const task = path.resolve(workdir);
  const bundle = await parseLongTaskSources(task); const coverage = validateLongTaskCoverage(bundle);
  if (!coverage.passed) throw new Error(`Long-task contract coverage failed:\n${coverage.errors.join("\n")}`);
  const sources: CompiledContractV2["sources"] = {};
  for (const [key, file] of Object.entries(bundle.source_paths)) sources[key] = { path: relative(root, file), sha256: await hashFile(file) };
  const contextFiles = await listFiles(path.join(root, "project_context"));
  const contextHashes: Record<string, string> = Object.fromEntries(await Promise.all(contextFiles.map(async (file) => [relative(root, file), await hashFile(file)] as const)));
  const verifier_identity = await verifierIdentity(root);
  const verification_specs: FrozenVerificationSpecV2[] = [];
  for (const spec of bundle.checklist.acceptance_criteria.flatMap((ac) => ac.verification_specs)) {
    const owner = bundle.checklist.acceptance_criteria.find((ac) => ac.verification_specs.some((candidate) => candidate.id === spec.id))!;
    const executable_path = await resolveExecutable(spec.executable, root);
    const oracle_sha256: Record<string, string> = {};
    for (const oracle of spec.oracle_paths) { const absolute = resolveInside(root, oracle, `${spec.id}.oracle`); oracle_sha256[oracle] = await hashFile(absolute); }
    verification_specs.push({ ...spec, normalized_sha256: sha256Hex(canonicalJson(spec)), executable_path, executable_sha256: await hashFile(executable_path), oracle_sha256, global_invariant: spec.input_paths.includes("**") || owner.proof_surfaces.some((surface) => surface === "security_boundary" || surface === "population_coverage") });
  }
  const requirement_graph = Object.fromEntries(bundle.product.requirements.map((req) => [req.id, { obligation_ids: bundle.plan.plan_items.flatMap((pi) => pi.obligations).filter((ob) => ob.source_requirement_ids.includes(req.id)).map((ob) => ob.id).sort() }]));
  const obligation_graph = Object.fromEntries(bundle.plan.plan_items.flatMap((pi) => pi.obligations).map((ob) => [ob.id, { requirement_ids: [...ob.source_requirement_ids].sort(), ac_ids: [...ob.related_ac_ids].sort() }]));
  const acceptance_graph = Object.fromEntries(bundle.checklist.acceptance_criteria.map((ac) => [ac.id, { obligation_ids: [...ac.obligation_refs].sort(), verification_spec_ids: ac.verification_specs.map((spec) => spec.id).sort() }]));
  const unsigned = { schema_version: "compiled-long-task-contract-v2" as const, repository_root: root, workdir: task, sources, context_snapshot: { files: Object.keys(contextHashes).sort(), sha256: sortRecord(contextHashes) }, requirement_graph, obligation_graph, acceptance_graph, verification_specs: verification_specs.sort((a, b) => a.id.localeCompare(b.id)), verifier_identity };
  const contract: CompiledContractV2 = { ...unsigned, contract_sha256: sha256Hex(canonicalJson(unsigned)) };
  await atomicJson(path.join(task, "compiled-contract.json"), contract); return contract;
}

export async function readCompiledLongTaskContract(workdir: string): Promise<CompiledContractV2> { const value = JSON.parse(await readFile(path.join(workdir, "compiled-contract.json"), "utf8")) as CompiledContractV2; if (value.schema_version !== "compiled-long-task-contract-v2") throw new Error("Unsupported compiled contract schema"); const { contract_sha256, ...unsigned } = value; if (sha256Hex(canonicalJson(unsigned)) !== contract_sha256) throw new Error("compiled-contract.json integrity mismatch"); return value; }
export async function assertLongTaskContractFresh(contract: CompiledContractV2): Promise<void> { for (const item of Object.values(contract.sources)) if (await hashFile(path.join(contract.repository_root, item.path)) !== item.sha256) throw new Error(`source_changed_after_compile:${item.path}`); const currentContext=(await listFiles(path.join(contract.repository_root,"project_context"))).map((file)=>relative(contract.repository_root,file)); if (canonicalJson(currentContext)!==canonicalJson(contract.context_snapshot.files)) throw new Error("context_changed_after_compile:file_set"); for (const [file, hash] of Object.entries(contract.context_snapshot.sha256)) if (await hashFile(path.join(contract.repository_root, file)) !== hash) throw new Error(`context_changed_after_compile:${file}`); if (await hashFile(contract.verifier_identity.cli_path)!==contract.verifier_identity.cli_sha256 || await hashTree(path.join(contract.repository_root,".codex/hooks"))!==contract.verifier_identity.hook_bundle_sha256) throw new Error("verifier_changed_after_compile:identity"); for (const spec of contract.verification_specs) { if (await hashFile(spec.executable_path) !== spec.executable_sha256) throw new Error(`verifier_changed_after_compile:${spec.id}`); for (const [file, hash] of Object.entries(spec.oracle_sha256)) if (await hashFile(path.join(contract.repository_root, file)) !== hash) throw new Error(`oracle_changed_after_compile:${file}`); } }

async function verifierIdentity(root: string): Promise<VerifierTrustInput> { const packageFile = fileURLToPath(new URL("../../package.json", import.meta.url)); const packageJson = JSON.parse(await readFile(packageFile, "utf8")) as { name: string; version: string }; const cli = fileURLToPath(new URL("../cli.js", import.meta.url)); return { package_name: "project-tiny-context-harness", package_version: packageJson.version, cli_path: cli, cli_sha256: await maybeHash(cli), hook_bundle_sha256: await hashTree(path.join(root, ".codex/hooks")) }; }
async function resolveExecutable(executable: string, root: string): Promise<string> { if (executable === "node" || executable === path.basename(process.execPath)) return process.execPath; if (executable.includes("/") || executable.includes("\\")) { const candidate = resolveInside(root, executable, "executable"); await access(candidate, constants.X_OK); return candidate; } throw new Error(`Executable ${executable} is not pinned; use node or a repository-relative executable path`); }
async function listFiles(root: string): Promise<string[]> { const result: string[] = []; async function visit(dir: string): Promise<void> { for (const entry of await readdir(dir, { withFileTypes: true })) { const file = path.join(dir, entry.name); if (entry.isSymbolicLink()) throw new Error(`Context symlink is not allowed: ${file}`); if (entry.isDirectory()) await visit(file); else if (entry.isFile()) result.push(file); } } try { await visit(root); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; } return result.sort(); }
async function hashTree(root: string): Promise<string> { const files = await listFiles(root); const rows = await Promise.all(files.map(async (file) => [relative(root, file), await hashFile(file)])); return sha256Hex(canonicalJson(rows)); }
async function hashFile(file: string): Promise<string> { const info = await stat(file); if (!info.isFile()) throw new Error(`Expected regular file: ${file}`); return sha256Hex(await readFile(file)); }
async function maybeHash(file: string): Promise<string> { try { return await hashFile(file); } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return "unbuilt"; throw error; } }
async function atomicJson(file: string, value: unknown): Promise<void> { await mkdir(path.dirname(file), { recursive: true }); const temporary = `${file}.tmp-${process.pid}-${Date.now()}`; await writeFile(temporary, canonicalJson(value), { encoding: "utf8", flag: "wx" }); await rename(temporary, file); }
function relative(root: string, file: string): string { const value = path.relative(root, file).replace(/\\/g, "/"); if (value.startsWith("../") || path.isAbsolute(value)) throw new Error(`Path is outside repository: ${file}`); return value; }
function sortRecord<T>(value: Record<string, T>): Record<string, T> { return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))); }
