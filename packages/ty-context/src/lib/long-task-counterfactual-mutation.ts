import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { canonicalJson, sha256Hex } from "./composite-campaign-codec.js";
import type { CompiledContractV3, CounterfactualControlV3, ImplementationBindingV3 } from "./long-task-contract-schema.js";
import type { CounterfactualMutationEffectV3 } from "./long-task-run-result.js";

export interface AppliedCounterfactualMutationV3 {
  mutation_effects: CounterfactualMutationEffectV3[];
  finding_codes: string[];
}

export async function applyCounterfactualMutation(contract:CompiledContractV3,control:CounterfactualControlV3,root:string):Promise<AppliedCounterfactualMutationV3>{
  const effects:CounterfactualMutationEffectV3[]=[];const codes:string[]=[];const mutation=control.mutation;const obligation=contract.obligations.find((item)=>item.id===control.obligation_ids[0]);
  if(!obligation)return failed("counterfactual_wrong_binding_target");
  if(mutation.type==="remove_binding_targets"){
    for(const id of mutation.binding_ids){const binding=ownedBinding(obligation.implementation_bindings,id);if(!binding||!(binding.kind==="file"||binding.kind==="path_glob")){codes.push("counterfactual_wrong_binding_target");continue;}for(const file of await matchingFiles(root,binding.target,binding.kind==="file")){const before=await fileHash(file.absolute);await rm(file.absolute);effects.push({path:file.relative,before_sha256:before,after:"deleted"});}}
  }else{
    const binding=ownedBinding(obligation.implementation_bindings,mutation.binding_id);const fixture=contract.counterexample_fixtures.find((item)=>item.id===mutation.fixture_id);
    if(!binding||!fixture||!targetCovered(contract,binding,obligation.id,mutation.target_path)){codes.push("counterfactual_wrong_binding_target");}
    else if(mutation.type==="rename_route_fixture"){
      await readFile(inside(root,fixture.path));const target=inside(root,mutation.target_path);const before=await readFile(target);const text=before.toString("utf8");const count=text.split(mutation.from_route).length-1;
      if(count!==1)codes.push("counterfactual_mutation_no_effect");else{const after=Buffer.from(text.replace(mutation.from_route,mutation.to_route));await writeFile(target,after);effects.push({path:normalize(mutation.target_path),before_sha256:sha256Hex(before),after_sha256:sha256Hex(after)});}
    }else{
      const source=await readFile(inside(root,fixture.path));const target=inside(root,mutation.target_path);const before=await optionalHash(target);await mkdir(path.dirname(target),{recursive:true});await writeFile(target,source);const after=sha256Hex(source);if(before===after)codes.push("counterfactual_mutation_no_effect");else effects.push({path:normalize(mutation.target_path),before_sha256:before,after_sha256:after});
    }
  }
  if(effects.length===0&&!codes.includes("counterfactual_wrong_binding_target")&&!codes.includes("counterfactual_mutation_no_effect"))codes.push("counterfactual_mutation_no_effect");
  return {mutation_effects:effects.sort((a,b)=>a.path.localeCompare(b.path)),finding_codes:[...new Set(codes)].sort()};
  function failed(code:string):AppliedCounterfactualMutationV3{return {mutation_effects:[],finding_codes:[code]};}
}

export async function hashCounterfactualTree(root:string):Promise<string>{const rows:Array<[string,string]>=[];async function visit(dir:string,relative=""):Promise<void>{for(const entry of (await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const rel=relative?`${relative}/${entry.name}`:entry.name;const file=path.join(dir,entry.name);if(entry.isSymbolicLink())throw new Error(`counterfactual_copy_link_rejected:${rel}`);if(entry.isDirectory())await visit(file,rel);else if(entry.isFile())rows.push([rel,await fileHash(file)]);else throw new Error(`counterfactual_copy_special_file_rejected:${rel}`);}}await visit(root);return sha256Hex(canonicalJson(rows));}

function ownedBinding(bindings:ImplementationBindingV3[],id:string):ImplementationBindingV3|undefined{return bindings.find((item)=>item.id===id);}
function targetCovered(contract:CompiledContractV3,binding:ImplementationBindingV3,obligationId:string,target:string):boolean{const normalized=normalize(target);if(binding.kind==="file"&&normalize(binding.target)===normalized)return true;if(binding.kind==="path_glob"&&path.matchesGlob(normalized,normalize(binding.target)))return true;return contract.verification_specs.some((spec)=>spec.claims.obligation_ids.includes(obligationId)&&spec.claims.binding_ids.includes(binding.id)&&spec.input_paths.some((input)=>path.matchesGlob(normalized,normalize(input))));}
async function matchingFiles(root:string,target:string,exact:boolean):Promise<Array<{absolute:string;relative:string}>>{const result:Array<{absolute:string;relative:string}>=[];async function visit(dir:string,relative=""):Promise<void>{for(const entry of await readdir(dir,{withFileTypes:true})){const rel=relative?`${relative}/${entry.name}`:entry.name;const file=path.join(dir,entry.name);if(entry.isDirectory())await visit(file,rel);else if(entry.isFile()&&(exact?rel===normalize(target):path.matchesGlob(rel,normalize(target))))result.push({absolute:file,relative:rel});}}await visit(root);return result.sort((a,b)=>a.relative.localeCompare(b.relative));}
function inside(root:string,relative:string):string{const normalized=normalize(relative);if(path.isAbsolute(relative)||normalized===".."||normalized.startsWith("../"))throw new Error(`counterfactual_path_escape:${relative}`);const resolved=path.resolve(root,...normalized.split("/"));if(resolved!==path.resolve(root)&&!resolved.startsWith(`${path.resolve(root)}${path.sep}`))throw new Error(`counterfactual_path_escape:${relative}`);return resolved;}
async function fileHash(file:string):Promise<string>{const info=await stat(file);if(!info.isFile())throw new Error(`counterfactual_target_not_file:${file}`);return sha256Hex(await readFile(file));}
async function optionalHash(file:string):Promise<string|null>{try{return await fileHash(file);}catch(error){if((error as NodeJS.ErrnoException).code==="ENOENT")return null;throw error;}}
function normalize(value:string):string{return value.replace(/\\/g,"/").replace(/^\.\//,"");}
