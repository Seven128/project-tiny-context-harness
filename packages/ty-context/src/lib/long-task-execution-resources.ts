import type { BrowserLayerHandleV3 } from "./long-task-browser-layer.js";
import { prepareBrowserLayer } from "./long-task-browser-layer.js";
import type { CompiledContractV3, FrozenVerificationSpecV3 } from "./long-task-contract-schema.js";
import type { DependencyLayerHandleV3 } from "./long-task-dependency-layer.js";
import { prepareDependencyLayer } from "./long-task-dependency-layer.js";
import { LongTaskRedactorV3 } from "./long-task-redaction.js";
import type { ResolvedLongTaskSecretsV3 } from "./long-task-secret-provider.js";
import { resolveLongTaskSecrets } from "./long-task-secret-provider.js";

export interface LongTaskExecutionResourcesV3 { dependency_layer:DependencyLayerHandleV3|null; browser_layer:BrowserLayerHandleV3|null; secrets:ResolvedLongTaskSecretsV3; redactor:LongTaskRedactorV3 }
export async function prepareLongTaskExecutionResources(contract:CompiledContractV3,sourceRoot:string,specs:FrozenVerificationSpecV3[],runId:string,snapshotSha256:string):Promise<LongTaskExecutionResourcesV3>{const dependency=await prepareDependencyLayer(sourceRoot,contract.dependency_plan);const browser=await prepareBrowserLayer(contract.dependency_plan,dependency,specs);const declaredSecretRefs=new Set(contract.environment_probes.filter((probe)=>probe.kind==="secret_ref").map((probe)=>probe.target));const used=new Set(specs.flatMap((spec)=>[...spec.environment_refs,...spec.command_steps.flatMap((step)=>step.environment_refs)]));const refs=[...declaredSecretRefs].filter((ref)=>used.has(ref)).sort();const secrets=refs.length?await resolveLongTaskSecrets(contract.repository_root,refs,`${runId}\0${snapshotSha256}`):{values:{},refs:[]};const missing=secrets.refs.filter((item)=>!item.present).map((item)=>item.name);if(missing.length)throw new Error(`secret_provider_unavailable:missing:${missing.join(",")}`);return {dependency_layer:dependency,browser_layer:browser,secrets,redactor:new LongTaskRedactorV3(secrets.values)};}
