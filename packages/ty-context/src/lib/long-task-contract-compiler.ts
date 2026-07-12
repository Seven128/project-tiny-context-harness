import { mkdir, open, readFile, readdir, rename, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalJson, sha256Hex } from "./composite-campaign-codec.js";
import { parseLongTaskSources } from "./long-task-contract-parser.js";
import { validateLongTaskCoverage } from "./long-task-contract-coverage.js";
import { resolveInside } from "./long-task-path-policy.js";
import { COMPOSITE_V3_SCHEMA_SET_SHA256 } from "./long-task-contract-schema-registry.js";
import type { CompiledContractGraphsV3, CompiledContractV3, FrozenVerificationSpecV3, LongTaskSourceBundleV3, VerificationClaimsV3, VerifierTrustInput } from "./long-task-contract-schema.js";
import { assertLongTaskCompilationAllowed, readActiveLongTaskBinding } from "./long-task-active-task.js";
import { invalidateLongTaskFinalAuthority } from "./long-task-final-receipt.js";

export async function compileLongTaskContract(workdir: string, repositoryRoot = process.cwd(), options: { write?: boolean } = {}): Promise<CompiledContractV3> {
  const root = path.resolve(repositoryRoot);
  const task = path.resolve(workdir);
  const bundle = await parseLongTaskSources(task);
  const coverage = validateLongTaskCoverage(bundle);
  if (!coverage.passed) throw new Error(`Long-task contract coverage failed:\n${coverage.errors.join("\n")}`);
  validateWorkdirSeparation(bundle,root,task);
  const sources: CompiledContractV3["sources"] = {};
  for (const [key, file] of Object.entries(bundle.source_paths)) sources[key] = { path: relative(root, file), sha256: await hashFile(file) };
  const contextFiles = await listFiles(path.join(root, "project_context"));
  const contextHashes = Object.fromEntries(await Promise.all(contextFiles.map(async (file) => [relative(root, file), await hashFile(file)] as const)));
  await validateContextReferences(bundle, root, new Set(Object.keys(contextHashes)));
  const verifier_identity = await verifierIdentity(root);
  const verification_specs: FrozenVerificationSpecV3[] = [];
  for (const spec of bundle.checklist.verification_specs) {
    const executable_path = process.execPath;
    const oracle_sha256: Record<string, string> = {};
    const oraclePaths=[spec.oracle.entrypoint];
    for (const oracle of oraclePaths) oracle_sha256[oracle] = await hashFile(resolveInside(root, oracle, `${spec.id}.oracle`));
    verification_specs.push({
      ...spec,
      positive_assertions: spec.positive_assertions.map((assertion)=>({...assertion,oracle_check_id:assertion.observation_id})),
      negative_assertions: spec.negative_assertions.map((assertion)=>({...assertion,oracle_check_id:assertion.observation_id,forbidden:assertion.expected})),
      environment_requirements: spec.environment_requirements.map((requirement)=>({...requirement,required:true as const,local_alternatives:[...requirement.local_alternative_probe_ids]})),
      normalized_sha256: sha256Hex(canonicalJson(spec)),
      executable_path,
      executable_sha256: await hashFile(executable_path),
      argv: [spec.oracle.entrypoint],
      oracle_paths: oraclePaths,
      oracle_sha256: sortRecord(oracle_sha256),
      implementation_test_paths: spec.command_steps.filter((step)=>step.tool==="node_script"||step.tool==="playwright_test").map((step)=>step.target),
      invalid_completion_signals: [],
      global_invariant: spec.input_paths.includes("**") || spec.proof_capabilities.some((surface) => surface === "security_boundary" || surface === "population_coverage")
    });
  }
  const obligations = bundle.plan.plan_items.flatMap((item) => item.obligations);
  const bindings = obligations.flatMap((item) => item.implementation_bindings);
  const shortcuts = obligations.flatMap((item) => item.forbidden_shortcuts);
  const graphs = compileGraphs(bundle);
  const unsigned = {
    schema_version: "compiled-long-task-contract-v3" as const,
    repository_root: root,
    workdir: task,
    sources: sortRecord(sources),
    context_snapshot: { files: Object.keys(contextHashes).sort(), sha256: sortRecord(contextHashes) },
    owner_surfaces: sortById(bundle.product.owner_surfaces),
    requirements: sortById(bundle.product.requirements),
    product_boundaries: sortById(bundle.product.boundaries),
    non_completing_outcomes: sortById(bundle.product.non_completing_outcomes),
    population_exclusion_rules: sortById(bundle.product.population_exclusion_rules),
    plan_items: sortById(bundle.plan.plan_items.map((item) => ({ id: item.id, title: item.title, implementation_notes: [...item.implementation_notes], obligation_ids: item.obligations.map((obligation) => obligation.id).sort() }))),
    obligations: sortById(obligations),
    bindings: sortById(bindings),
    forbidden_shortcuts: sortById(shortcuts),
    acceptance_criteria: sortById(bundle.checklist.acceptance_criteria),
    proof_requirements: sortById(bundle.checklist.proof_requirements),
    verification_specs: sortById(verification_specs),
    counterfactual_controls: sortById(bundle.plan.counterfactual_controls),
    counterexample_fixtures: sortById(bundle.checklist.counterexample_fixtures),
    environment_probes: sortById(bundle.checklist.environment_probes),
    graphs,
    verifier_identity
  };
  const contract: CompiledContractV3 = { ...unsigned, contract_sha256: sha256Hex(canonicalJson(unsigned)) };
  await assertLongTaskCompilationAllowed(contract);
  if (options.write !== false) await writeCompiledLongTaskContract(task, contract);
  return contract;
}

export async function writeCompiledLongTaskContract(workdir: string, contract: CompiledContractV3): Promise<void> {
  if (path.resolve(workdir) !== contract.workdir) throw new Error("active_contract_changed:write_workdir");
  await assertLongTaskCompilationAllowed(contract);
  if (!await readActiveLongTaskBinding(contract.repository_root)) await invalidateLongTaskFinalAuthority(contract.repository_root, contract.workdir);
  await atomicJson(path.join(workdir, "compiled-contract.json"), contract);
}

export async function readCompiledLongTaskContract(workdir: string): Promise<CompiledContractV3> {
  const value = JSON.parse(await readFile(path.join(workdir, "compiled-contract.json"), "utf8")) as CompiledContractV3;
  if (value.schema_version !== "compiled-long-task-contract-v3") throw new Error("source_schema_unsupported:compiled-contract-v3-required");
  const { contract_sha256, ...unsigned } = value;
  if (sha256Hex(canonicalJson(unsigned)) !== contract_sha256) throw new Error("compiled-contract.json integrity mismatch");
  return value;
}

export async function assertLongTaskContractFresh(contract: CompiledContractV3): Promise<void> {
  for (const item of Object.values(contract.sources)) if (await hashFile(path.join(contract.repository_root, item.path)) !== item.sha256) throw new Error(`source_changed_after_compile:${item.path}`);
  const currentContext = (await listFiles(path.join(contract.repository_root, "project_context"))).map((file) => relative(contract.repository_root, file));
  if (canonicalJson(currentContext) !== canonicalJson(contract.context_snapshot.files)) throw new Error("context_changed_after_compile:file_set");
  for (const [file, hash] of Object.entries(contract.context_snapshot.sha256)) if (await hashFile(path.join(contract.repository_root, file)) !== hash) throw new Error(`context_changed_after_compile:${file}`);
  if (await hashFile(contract.verifier_identity.cli_path) !== contract.verifier_identity.cli_sha256 || await completionGateBundleHash(contract.repository_root) !== contract.verifier_identity.hook_bundle_sha256) throw new Error("verifier_changed_after_compile:identity");
  for (const spec of contract.verification_specs) {
    if (await hashFile(spec.executable_path) !== spec.executable_sha256) throw new Error(`verifier_changed_after_compile:${spec.id}`);
    for (const [file, hash] of Object.entries(spec.oracle_sha256)) if (await hashFile(path.join(contract.repository_root, file)) !== hash) throw new Error(`oracle_changed_after_compile:${file}`);
  }
}

function compileGraphs(bundle: LongTaskSourceBundleV3): CompiledContractGraphsV3 {
  const planItems = bundle.plan.plan_items;
  const obligations = planItems.flatMap((item) => item.obligations);
  const proofs = bundle.checklist.proof_requirements;
  return {
    requirements: sortRecord(Object.fromEntries(bundle.product.requirements.map((requirement) => {
      const linked = obligations.filter((obligation) => obligation.source_requirement_ids.includes(requirement.id));
      return [requirement.id, {
        plan_item_ids: planItems.filter((item) => item.obligations.some((obligation) => obligation.source_requirement_ids.includes(requirement.id))).map((item) => item.id).sort(),
        obligation_ids: linked.map((item) => item.id).sort(),
        boundary_ids: bundle.product.boundaries.filter((item) => item.requirement_refs.includes(requirement.id)).map((item) => item.id).sort(),
        non_completing_outcome_ids: bundle.product.non_completing_outcomes.filter((item) => item.requirement_refs.includes(requirement.id)).map((item) => item.id).sort(),
        population_exclusion_rule_ids: bundle.product.population_exclusion_rules.filter((item) => item.requirement_refs.includes(requirement.id)).map((item) => item.id).sort()
      }];
    }))),
    plan_items: sortRecord(Object.fromEntries(planItems.map((item) => [item.id, { obligation_ids: item.obligations.map((obligation) => obligation.id).sort() }]))),
    obligations: sortRecord(Object.fromEntries(obligations.map((obligation) => [obligation.id, {
      requirement_ids: [...obligation.source_requirement_ids].sort(),
      binding_ids: obligation.implementation_bindings.map((binding) => binding.id).sort(),
      ac_ids: [...obligation.related_ac_ids].sort(),
      proof_requirement_ids: proofs.filter((proof) => proof.obligation_refs.includes(obligation.id)).map((proof) => proof.id).sort(),
      counterfactual_control_ids: [...obligation.counterfactual_control_ids].sort(),
      forbidden_shortcut_ids: obligation.forbidden_shortcuts.map((shortcut) => shortcut.id).sort()
    }]))),
    acceptance_criteria: sortRecord(Object.fromEntries(bundle.checklist.acceptance_criteria.map((criterion) => [criterion.id, { obligation_ids: [...criterion.obligation_refs].sort(), proof_requirement_ids: [...criterion.proof_requirement_refs].sort(), verification_spec_ids: [...criterion.verification_spec_ids].sort() }]))),
    proof_requirements: sortRecord(Object.fromEntries(proofs.map((proof) => [proof.id, { obligation_ids: [...proof.obligation_refs].sort(), owner_surface_ids: [...proof.owner_surface_refs].sort(), verification_spec_ids: [...proof.verification_spec_ids].sort() }]))),
    verification_specs: sortRecord(Object.fromEntries(bundle.checklist.verification_specs.map((spec) => [spec.id, sortClaims(spec.claims)])))
  };
}

async function validateContextReferences(bundle: LongTaskSourceBundleV3, root: string, contextFiles: Set<string>): Promise<void> {
  for (const requirement of bundle.product.requirements) for (const ref of requirement.context_refs ?? []) {
    const resolved = resolveInside(root, ref, `${requirement.id}.context_ref`);
    const relativePath = relative(root, resolved);
    if (!contextFiles.has(relativePath)) throw new Error(`context_ref_invalid:${requirement.id}:${ref}`);
  }
}

async function verifierIdentity(root: string): Promise<VerifierTrustInput> { const packageFile=fileURLToPath(new URL("../../package.json",import.meta.url));const packageJson=JSON.parse(await readFile(packageFile,"utf8")) as {name:string;version:string};const cli=fileURLToPath(new URL("../cli.js",import.meta.url));return {package_name:"project-tiny-context-harness",package_version:packageJson.version,cli_path:cli,cli_sha256:await maybeHash(cli),hook_bundle_sha256:await completionGateBundleHash(root),schema_set_sha256:COMPOSITE_V3_SCHEMA_SET_SHA256}; }
async function listFiles(root:string):Promise<string[]>{const result:string[]=[];async function visit(dir:string):Promise<void>{for(const entry of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isSymbolicLink())throw new Error(`Context symlink is not allowed: ${file}`);if(entry.isDirectory())await visit(file);else if(entry.isFile())result.push(file);}}try{await visit(root);}catch(error){if((error as NodeJS.ErrnoException).code!=="ENOENT")throw error;}return result.sort();}
async function completionGateBundleHash(root:string):Promise<string>{const config=await hashFile(path.join(root,".codex","hooks.json"));const script=await hashFile(path.join(root,".codex","hooks","long-task-hook.mjs"));return sha256Hex(`${config}:${script}`);}
async function hashFile(file:string):Promise<string>{const info=await stat(file);if(!info.isFile())throw new Error(`Expected regular file: ${file}`);return sha256Hex(await readFile(file));}
async function maybeHash(file:string):Promise<string>{try{return await hashFile(file);}catch(error){if((error as NodeJS.ErrnoException).code==="ENOENT")return "unbuilt";throw error;}}
async function atomicJson(file:string,value:unknown):Promise<void>{await mkdir(path.dirname(file),{recursive:true});const temporary=`${file}.tmp-${process.pid}-${Date.now()}`;const handle=await open(temporary,"wx");try{await handle.writeFile(canonicalJson(value),"utf8");await handle.sync();}finally{await handle.close();}await rename(temporary,file);}
function relative(root:string,file:string):string{const value=path.relative(root,file).replace(/\\/g,"/");if(value.startsWith("../")||path.isAbsolute(value))throw new Error(`Path is outside repository: ${file}`);return value;}
function sortRecord<T>(value:Record<string,T>):Record<string,T>{return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)));}
function sortById<T extends {id:string}>(value:T[]):T[]{return [...value].sort((a,b)=>a.id.localeCompare(b.id));}
function sortClaims(claims:VerificationClaimsV3):VerificationClaimsV3{return {requirement_ids:[...claims.requirement_ids].sort(),plan_item_ids:[...claims.plan_item_ids].sort(),obligation_ids:[...claims.obligation_ids].sort(),binding_ids:[...claims.binding_ids].sort(),ac_ids:[...claims.ac_ids].sort(),proof_requirement_ids:[...claims.proof_requirement_ids].sort()};}
function validateWorkdirSeparation(bundle:LongTaskSourceBundleV3,root:string,task:string):void{const workdir=relative(root,task);if(!workdir)throw new Error("protected_path_declared:workdir_must_not_be_repository_root");const declared=[...bundle.plan.plan_items.flatMap((item)=>item.obligations.flatMap((obligation)=>obligation.implementation_bindings.filter((binding)=>binding.kind==="file"||binding.kind==="path_glob").map((binding)=>binding.target))),...bundle.checklist.verification_specs.flatMap((spec)=>[spec.oracle.entrypoint,...spec.input_paths,...spec.command_steps.filter((step)=>step.tool==="node_script"||step.tool==="playwright_test").map((step)=>step.target)])];if(declared.some((value)=>pathPrefixesOverlap(value,workdir)))throw new Error(`protected_path_declared:active_workdir:${workdir}`);}
function pathPrefixesOverlap(left:string,right:string):boolean{const clean=(value:string)=>value.replace(/[?*{[].*$/u,"").replace(/\/$/u,"");const a=clean(left);const b=clean(right);return !!a&&!!b&&(a===b||a.startsWith(`${b}/`)||b.startsWith(`${a}/`));}
