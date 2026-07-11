import { readFile } from "node:fs/promises";
import path from "node:path";
import type { FrozenVerificationSpecV2 } from "./long-task-contract-schema.js";
import type { ArtifactManifestV2, CommandRunV2, LongTaskFindingV2 } from "./long-task-run-result.js";

export async function scanLongTaskNegativeEvidence(spec: FrozenVerificationSpecV2, command: CommandRunV2, artifacts: ArtifactManifestV2, artifactRoot: string, evidencePath: string, reverifyCommand: string): Promise<LongTaskFindingV2[]> {
  const findings: LongTaskFindingV2[]=[]; const surfaces=[command.stdout_path,command.stderr_path,...artifacts.artifacts.filter((item)=>item.size<=1024*1024).map((item)=>path.join(artifactRoot,...item.path.split("/")))];
  for(const file of surfaces){let content="";try{content=await readFile(file,"utf8");}catch{continue;}for(const signal of spec.invalid_completion_signals)if(signal && content.toLocaleLowerCase().includes(signal.toLocaleLowerCase()))findings.push({category:"negative_evidence_hit",verification_spec_id:spec.id,expected:`invalid completion signal absent: ${signal}`,actual:{signal,file:path.basename(file)},evidence_path:evidencePath,forbidden_shortcut:signal,next_action:`Remove the invalid completion state and implement ${spec.id} fully`,reverify_command:reverifyCommand});}
  return findings;
}
