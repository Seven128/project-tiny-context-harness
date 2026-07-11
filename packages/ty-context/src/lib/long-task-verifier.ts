import { cp, mkdir, mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { canonicalJson, sha256Hex } from "./composite-campaign-codec.js";
import { collectFrozenArtifacts } from "./long-task-artifact-collector.js";
import { evaluateFrozenAssertions } from "./long-task-assertion-evaluator.js";
import { runFrozenCommand } from "./long-task-command-runner.js";
import { assertLongTaskContractFresh, readCompiledLongTaskContract } from "./long-task-contract-compiler.js";
import { createLongTaskSnapshot, hashLongTaskWorkspace } from "./long-task-snapshot.js";
import type { CompiledContractV3 } from "./long-task-contract-schema.js";
import type { EnvironmentManifestV2, LongTaskFindingV2, SnapshotHandle, VerificationRunResultV2, VerificationSpecResultV2 } from "./long-task-run-result.js";
import { decideLongTaskImpact } from "./long-task-impact.js";
import { scanLongTaskNegativeEvidence } from "./long-task-negative-evidence.js";

export interface VerifyLongTaskOptions {
  contract?: CompiledContractV3;
  snapshot?: SnapshotHandle;
  run_id?: string;
}

export interface FrozenSpecExecutionRequest {
  contract: CompiledContractV3;
  source_root: string;
  workdir: string;
  run_root: string;
  spec_ids: string[];
  run_id: string;
  snapshot_sha256: string;
  environment_overrides?: Readonly<Record<string,string>>;
}

export async function executeFrozenVerificationSpecs(request: FrozenSpecExecutionRequest): Promise<VerificationSpecResultV2[]> {
  const selected = request.contract.verification_specs.filter((spec) => request.spec_ids.includes(spec.id));
  if (selected.length === 0) throw new Error("No frozen verification specs selected");
  const results: VerificationSpecResultV2[] = [];
  for (const spec of selected) {
    const specRoot = await mkdtemp(path.join(os.tmpdir(), `ty-context-spec-${spec.id}-`));
    const artifactRoot = path.join(request.run_root, "artifacts", spec.id);
    const commandRoot = path.join(request.run_root, "command-runs", spec.id);
    await mkdir(artifactRoot, { recursive: true });
    try {
      await cp(request.source_root, specRoot, { recursive: true });
      try {
        const bundle=request.contract.oracle_bundles.find((item)=>item.spec_id===spec.id);if(!bundle)throw new Error(`oracle_bundle_missing:${spec.id}`);
        const oracleInput={schema_version:"ty-context-oracle-input-v2",spec_id:spec.id,snapshot_root:specRoot,artifact_root:artifactRoot,command_steps:[],environment_refs_present:Object.keys(request.environment_overrides??{}).sort(),run_identity:{run_id:request.run_id,snapshot_sha256:request.snapshot_sha256,dependency_layer_key:"none",environment_manifest_sha256:"pending"}};
        const command = await runFrozenCommand(spec,bundle,oracleInput,specRoot,commandRoot,artifactRoot,request.environment_overrides);
        const artifacts = await collectFrozenArtifacts(spec, artifactRoot, command.started_at);
        await writeFile(path.join(commandRoot, "command.json"), canonicalJson(command));
        await writeFile(path.join(commandRoot, "artifacts.json"), canonicalJson(artifacts));
        const evidence = path.relative(request.workdir, commandRoot).replace(/\\/g, "/");
        const reverify = `ty-context composite-long-task verify ${quote(request.workdir)} --spec ${spec.id}`;
        const artifactIds = new Set([...artifacts.artifacts.map((item) => item.path), ...spec.command_steps.flatMap((step) => step.output_artifact_ids)]);
        const evaluated = await evaluateFrozenAssertions(spec, command, evidence, reverify, artifactIds);
        evaluated.findings.push(...await scanLongTaskNegativeEvidence(spec, command, artifacts, artifactRoot, evidence, reverify));
        if (evaluated.findings.length > 0) evaluated.status = "failed";
        results.push(evaluated);
      } catch (error) {
        results.push(failedSpec(spec.id, error, path.relative(request.workdir, commandRoot).replace(/\\/g, "/"), request.workdir));
      }
    } finally {
      await rm(specRoot, { recursive: true, force: true });
    }
  }
  return results;
}

export async function verifyLongTask(workdir: string, specIds?: string[], options: VerifyLongTaskOptions = {}): Promise<VerificationRunResultV2> {
  const contract = options.contract ?? await readCompiledLongTaskContract(workdir);
  await assertLongTaskContractFresh(contract);
  const runId = options.run_id ?? `RUN-${new Date().toISOString().replace(/[-:.TZ]/g, "")}-${process.pid}-${contract.contract_sha256.slice(0, 8)}`;
  const runRoot = path.join(workdir, "runs", runId);
  await mkdir(runRoot, { recursive: true });
  const source = options.snapshot ?? await createLongTaskSnapshot(contract.repository_root, contract, runId);
  const ownsSource = options.snapshot === undefined;
  const workspaceBefore = source.manifest.snapshot_sha256;
  const startedAt = new Date().toISOString();
  const environment = await environmentManifest(source.root);
  try {
    const automatic = specIds ? undefined : decideLongTaskImpact(contract, await gitChangedPaths(contract.repository_root));
    const selectedIds = specIds ?? automatic!.verification_spec_ids;
    const specResults = await executeFrozenVerificationSpecs({ contract, source_root: source.root, workdir, run_root: runRoot, spec_ids: selectedIds,run_id:runId,snapshot_sha256:source.manifest.snapshot_sha256 });
    const findings = specResults.flatMap((result) => enrichFindings(contract, result.spec_id, result.findings));
    try { await assertLongTaskContractFresh(contract); }
    catch (error) { findings.push(integrityFinding(runId, workdir, error)); }
    const workspaceAfter = await hashLongTaskWorkspace(contract.repository_root, contract);
    if (workspaceAfter !== workspaceBefore) findings.push(workspaceChanged(runId, workdir, workspaceBefore, workspaceAfter));
    const result: VerificationRunResultV2 = { schema_version: "long-task-verification-run-v2", run_id: runId, contract_sha256: contract.contract_sha256, snapshot: source.manifest, environment, spec_results: specResults, findings, started_at: startedAt, completed_at: new Date().toISOString() };
    await writeFile(path.join(runRoot, "snapshot-manifest.json"), canonicalJson(source.manifest));
    await writeFile(path.join(runRoot, "environment-manifest.json"), canonicalJson(environment));
    await writeFile(path.join(runRoot, "verification-result.json"), canonicalJson(result));
    return result;
  } finally {
    if (ownsSource) await source.dispose();
  }
}

function failedSpec(specId: string, error: unknown, evidencePath: string, workdir: string): VerificationSpecResultV2 {
  const actual = message(error); const category = actual.split(":",1)[0] || "verification_execution_failed";
  return { spec_id: specId, status: "failed", assertion_results: {}, population_results: {}, observations: {}, findings: [{ category, verification_spec_id: specId, expected: "frozen verification spec completes and emits trusted observations", actual, evidence_path: evidencePath, next_action: `Fix ${specId} verifier or implementation failure`, reverify_command: `ty-context composite-long-task verify ${quote(workdir)} --spec ${specId}` }] };
}
function integrityFinding(runId:string,workdir:string,error:unknown):LongTaskFindingV2{return {category:"frozen_identity_changed_during_verify",expected:"source, Context, oracle, executable and verifier hashes remain frozen",actual:message(error),evidence_path:`runs/${runId}/snapshot-manifest.json`,next_action:"Restore frozen verifier/oracle/source identities and recompile before continuing",reverify_command:`ty-context composite-long-task verify ${quote(workdir)}`};}
function workspaceChanged(runId:string,workdir:string,before:string,after:string):LongTaskFindingV2{return {category:"worktree_changed_during_verify",expected:before,actual:after,evidence_path:`runs/${runId}/snapshot-manifest.json`,next_action:"Stabilize the product workspace and rerun verification",reverify_command:`ty-context composite-long-task verify ${quote(workdir)}`};}
function enrichFindings(contract:CompiledContractV3,specId:string,findings:LongTaskFindingV2[]):LongTaskFindingV2[]{const ac=contract.acceptance_criteria.find((criterion)=>criterion.verification_spec_ids.includes(specId));if(!ac)return findings;const bindings=ac.obligation_refs.flatMap((obligation_id)=>{const obligation=contract.obligations.find((item)=>item.id===obligation_id);const requirements=obligation?.source_requirement_ids??[];return requirements.length?requirements.map((requirement_id)=>({requirement_id,obligation_id,ac_id:ac.id})):[{obligation_id,ac_id:ac.id}];});return findings.flatMap((finding)=>bindings.map((binding)=>({...finding,...binding})));}
async function gitChangedPaths(root:string):Promise<string[]>{return new Promise((resolve)=>{const child=spawn("git",["status","--porcelain=v1","-z","--untracked-files=all"],{cwd:root,shell:false,windowsHide:true});const chunks:Buffer[]=[];child.stdout.on("data",(chunk:Buffer)=>chunks.push(chunk));child.on("error",()=>resolve([]));child.on("close",(code)=>{if(code!==0){resolve([]);return;}resolve(Buffer.concat(chunks).toString("utf8").split("\0").filter(Boolean).map((field)=>field.slice(3).replace(/.* -> /,"").replace(/\\/g,"/")));});});}
async function environmentManifest(snapshotRoot:string):Promise<EnvironmentManifestV2>{return {node:process.version,platform:process.platform,arch:process.arch,release:os.release(),executable:process.execPath,executable_sha256:sha256Hex(await readFile(process.execPath)),cwd:snapshotRoot,environment_keys:["PATH","Path","PATHEXT","SYSTEMROOT","WINDIR","HOME","USERPROFILE","TMP","TEMP","CI","LANG","LC_ALL"].filter((key)=>process.env[key]!==undefined).sort()};}
function quote(value:string):string{return /\s/.test(value)?JSON.stringify(value):value;}
function message(error:unknown):string{return error instanceof Error?error.message:String(error);}
