import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { FrozenVerificationSpecV3, OracleBundleV3 } from "./long-task-contract-schema.js";
import type { CommandRunV2 } from "./long-task-run-result.js";
import { canonicalJson, sha256Hex } from "./composite-campaign-codec.js";
import { verifyStoredOracleBundle } from "./long-task-oracle-bundle-store.js";
import { runSealedOracle } from "./long-task-oracle-runner.js";

export async function runFrozenCommand(spec:FrozenVerificationSpecV3,bundle:OracleBundleV3,oracleInput:unknown,snapshotRoot:string,outputRoot:string,artifactRoot:string,environmentOverrides:Readonly<Record<string,string>>={}):Promise<CommandRunV2>{
  const cwd=spec.cwd==="repo_root"?snapshotRoot:path.resolve(snapshotRoot,spec.cwd);if(cwd!==snapshotRoot&&!cwd.startsWith(`${snapshotRoot}${path.sep}`))throw new Error(`wrong_cwd:${spec.id}`);for(const key of Object.keys(environmentOverrides))if(!spec.environment_refs.includes(key))throw new Error(`undeclared_environment_ref:${spec.id}:${key}`);
  await mkdir(outputRoot,{recursive:true});const stdoutPath=path.join(outputRoot,"stdout.txt");const diagnosticPath=path.join(outputRoot,"diagnostic-stdout.txt");const stderrPath=path.join(outputRoot,"stderr.txt");const bundlePath=await verifyStoredOracleBundle(bundle);const processResult=await runSealedOracle(spec.executable_path,bundlePath,cwd,spec.timeout_ms,allowedEnvironment(artifactRoot,oracleInput,environmentOverrides));
  await writeFile(stdoutPath,processResult.protocol);await writeFile(diagnosticPath,processResult.stdout);await writeFile(stderrPath,processResult.stderr);return {spec_id:spec.id,executable:spec.executable_path,argv:[bundlePath],cwd,exit_code:processResult.exit_code,stdout_path:stdoutPath,stdout_sha256:sha256Hex(processResult.protocol),stderr_path:stderrPath,stderr_sha256:sha256Hex(processResult.stderr),started_at:processResult.started_at,completed_at:processResult.completed_at};
}
function allowedEnvironment(artifactRoot:string,oracleInput:unknown,overrides:Readonly<Record<string,string>>):NodeJS.ProcessEnv{const result:NodeJS.ProcessEnv={};for(const key of ["PATH","Path","PATHEXT","SYSTEMROOT","WINDIR","HOME","USERPROFILE","TMP","TEMP","CI","LANG","LC_ALL"])if(process.env[key]!==undefined)result[key]=process.env[key];result.TY_CONTEXT_ORACLE_PROTOCOL="ty-context-observation-v2";result.TY_CONTEXT_ARTIFACT_DIR=artifactRoot;result.TY_CONTEXT_ORACLE_INPUT_B64=Buffer.from(canonicalJson(oracleInput),"utf8").toString("base64url");for(const [key,value] of Object.entries(overrides))result[key]=value;return result;}
