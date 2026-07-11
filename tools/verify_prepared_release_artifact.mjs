#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const argv=process.argv.slice(2); const value=(flag)=>{const i=argv.indexOf(flag);if(i<0||!argv[i+1])throw new Error(`${flag} requires a value`);return argv[i+1];};
const version=value("--version"); const supplied=value("--tarball"); const attestation=JSON.parse(await readFile(path.join(root,"docs","launch",`release-artifact-${version}.json`),"utf8"));
if(attestation.schema_version!=="ty-context-release-artifact-v1"||attestation.package_name!=="project-tiny-context-harness"||attestation.version!==version)throw new Error("Prepared release attestation identity mismatch");
const tarball=path.resolve(root,supplied); if(path.basename(tarball)!==attestation.filename)throw new Error(`Prepared tarball filename mismatch: expected ${attestation.filename}`);
const actual=createHash("sha256").update(await readFile(tarball)).digest("hex"); if(actual!==attestation.sha256)throw new Error(`Prepared tarball SHA-256 mismatch: expected ${attestation.sha256}, got ${actual}`);
console.log(`prepared release artifact verified version=${version} sha256=${actual}`);
