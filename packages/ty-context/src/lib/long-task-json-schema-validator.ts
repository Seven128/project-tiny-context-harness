import { canonicalJson } from "./composite-campaign-codec.js";

type Schema = Record<string, unknown>;

export function assertCompositeSourceSchema(value: unknown, schema: Schema, label: string): void {
  const errors: string[] = [];
  validate(value, schema, schema, label, errors);
  if (errors.length) throw new Error(normalize(errors.sort()[0]));
}

function normalize(error:string):string{
  if(/\$plan\/plan_items:uniqueItems$/.test(error))return "duplicate_plan_item";
  if(/\/oracle\/entrypoint:pattern$|\/(?:cwd|target|path|input_paths|artifact_globs)(?:\/\d+)?:pattern$/.test(error))return `unsafe_path:${error}`;
  return `source_schema_invalid:${error}`;
}

function validate(value: unknown, schema: Schema, root: Schema, path: string, errors: string[]): void {
  if (typeof schema.$ref === "string") { validate(value, resolve(root, schema.$ref), root, path, errors); return; }
  if (Array.isArray(schema.allOf)) for (const item of schema.allOf) validate(value, item as Schema, root, path, errors);
  if (Array.isArray(schema.oneOf)) {
    const matches=schema.oneOf.filter((item)=>passes(value,item as Schema,root)).length;
    if(matches!==1)errors.push(`${path}:oneOf:${matches}`);
  }
  if (Array.isArray(schema.anyOf) && !schema.anyOf.some((item)=>passes(value,item as Schema,root))) errors.push(`${path}:anyOf`);
  if (schema.not && passes(value,schema.not as Schema,root)) errors.push(`${path}:not`);
  if (schema.if && passes(value,schema.if as Schema,root)) { if(schema.then)validate(value,schema.then as Schema,root,path,errors); }
  else if (schema.else) validate(value,schema.else as Schema,root,path,errors);
  if ("const" in schema && canonicalJson(value)!==canonicalJson(schema.const)) errors.push(`${path}:const`);
  if (Array.isArray(schema.enum) && !schema.enum.some((item)=>canonicalJson(item)===canonicalJson(value))) errors.push(`${path}:enum`);
  if (schema.type && !matchesType(value,schema.type)) { errors.push(`${path}:type`); return; }
  if (typeof value === "string") validateString(value,schema,path,errors);
  if (typeof value === "number") validateNumber(value,schema,path,errors);
  if (Array.isArray(value)) validateArray(value,schema,root,path,errors);
  else if (value!==null&&typeof value==="object") validateObject(value as Record<string,unknown>,schema,root,path,errors);
}

function validateString(value:string,schema:Schema,path:string,errors:string[]):void{
  const length=[...value].length;
  if(typeof schema.minLength==="number"&&length<schema.minLength)errors.push(`${path}:minLength`);
  if(typeof schema.maxLength==="number"&&length>schema.maxLength)errors.push(`${path}:maxLength`);
  if(typeof schema.pattern==="string"&&!new RegExp(schema.pattern,"u").test(value))errors.push(`${path}:pattern`);
  if(value!==value.normalize("NFC")||value!==value.trim()||/\0|[\u0001-\u0009\u000b\u000c\u000e-\u001f\u007f]/u.test(value))errors.push(`${path}:normalized_string`);
  if(Buffer.byteLength(value,"utf8")>8192)errors.push(`${path}:utf8_limit`);
}
function validateNumber(value:number,schema:Schema,path:string,errors:string[]):void{
  if(!Number.isFinite(value)||Object.is(value,-0))errors.push(`${path}:finite_number`);
  if(typeof schema.minimum==="number"&&value<schema.minimum)errors.push(`${path}:minimum`);
  if(typeof schema.maximum==="number"&&value>schema.maximum)errors.push(`${path}:maximum`);
}
function validateArray(value:unknown[],schema:Schema,root:Schema,path:string,errors:string[]):void{
  if(typeof schema.maxItems==="number"&&value.length>schema.maxItems)errors.push(`${path}:maxItems`);
  if(schema.uniqueItems===true){const keys=value.map((item)=>canonicalJson(item));if(new Set(keys).size!==keys.length)errors.push(`${path}:uniqueItems`);}
  if(schema.items&&typeof schema.items==="object")value.forEach((item,index)=>validate(item,schema.items as Schema,root,`${path}/${index}`,errors));
}
function validateObject(value:Record<string,unknown>,schema:Schema,root:Schema,path:string,errors:string[]):void{
  const properties=(schema.properties&&typeof schema.properties==="object"?schema.properties:{}) as Record<string,Schema>;
  const required=Array.isArray(schema.required)?schema.required as string[]:[];
  for(const key of required)if(!(key in value))errors.push(`${path}/${key}:required`);
  if(schema.additionalProperties===false)for(const key of Object.keys(value))if(!(key in properties))errors.push(`${path}/${key}:unknown_field`);
  for(const [key,child] of Object.entries(properties))if(key in value)validate(value[key],child,root,`${path}/${key}`,errors);
}
function matchesType(value:unknown,type:unknown):boolean{
  const types=Array.isArray(type)?type:[type];return types.some((item)=>item==="null"?value===null:item==="array"?Array.isArray(value):item==="object"?value!==null&&typeof value==="object"&&!Array.isArray(value):item==="integer"?Number.isInteger(value):typeof value===item);
}
function passes(value:unknown,schema:Schema,root:Schema):boolean{const errors:string[]=[];validate(value,schema,root,"$",errors);return errors.length===0;}
function resolve(root:Schema,ref:string):Schema{if(!ref.startsWith("#/"))throw new Error(`source_schema_external_ref_forbidden:${ref}`);let current:unknown=root;for(const token of ref.slice(2).split("/")){if(!current||typeof current!=="object")throw new Error(`source_schema_ref_missing:${ref}`);current=(current as Record<string,unknown>)[token.replace(/~1/g,"/").replace(/~0/g,"~")];}if(!current||typeof current!=="object"||Array.isArray(current))throw new Error(`source_schema_ref_missing:${ref}`);return current as Schema;}
