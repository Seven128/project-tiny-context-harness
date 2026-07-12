import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { chmod, chown, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tarball = path.resolve(requiredOption("--candidate-tarball"));
const hostRelease = path.resolve(requiredOption("--host-release"));
const hostReleaseSha256 = requiredOption("--host-release-sha256");
const filter = option("--case");
if (process.platform !== "linux" || process.getuid?.() !== 0) throw new Error("composite_v3_black_box_runner_requires_linux_root");
const candidateIdentity = unprivilegedIdentity();
if (!/^[a-f0-9]{64}$/u.test(hostReleaseSha256) || createHash("sha256").update(await readFile(hostRelease)).digest("hex") !== hostReleaseSha256) throw new Error("host_release_sha256_mismatch");
const root = await mkdtemp(path.join(os.tmpdir(), "tyc-v3-black-box-runner-"));
await chmod(root, 0o755);
const candidate = path.join(root, "candidate.tgz"); await copyFile(tarball, candidate); await chmod(candidate, 0o644);
const candidateHome = path.join(root, "candidate-home"); await mkdir(candidateHome); await chown(candidateHome, candidateIdentity.uid, candidateIdentity.gid); await chmod(candidateHome, 0o700);
const install = path.join(root, "base-candidate");
const ready = path.join(root, "managed-host-ready.json");
let service;
try {
  await installCandidate(install, candidate);
  const packageRoot = path.join(install, "node_modules", "project-tiny-context-harness");
  service = spawn(process.execPath, [path.join(repo, "tests", "ty-context", "managed-host-candidate-linux-service.mjs")], {
    stdio: ["ignore", "ignore", "inherit"],
    env: { ...process.env, TY_CONTEXT_BLACK_BOX_BASE_PACKAGE_ROOT: packageRoot, TY_CONTEXT_HOST_RELEASE_ARCHIVE: hostRelease, TY_CONTEXT_MANAGED_HOST_READY: ready, TY_CONTEXT_BLACK_BOX_CANDIDATE_UID: String(candidateIdentity.uid), TY_CONTEXT_BLACK_BOX_CANDIDATE_GID: String(candidateIdentity.gid) }
  });
  await waitForReady(ready, service);
  const args = ["--test", "--test-concurrency=1"];
  if (filter) args.push(`--test-name-pattern=^${escapeRegex(filter)}$`);
  args.push(path.join(repo, "tests", "ty-context", "composite-long-task-v3-black-box.test.mjs"));
  const result = await run(process.execPath, args, { PATH: process.env.PATH, HOME: candidateHome, TMPDIR: os.tmpdir(), CI: "1", NO_COLOR: "1", TY_CONTEXT_BLACK_BOX_CANDIDATE_TARBALL: candidate, TY_CONTEXT_MANAGED_HOST_READY: ready, ...(process.env.TY_CONTEXT_BLACK_BOX_KEEP === "1" ? { TY_CONTEXT_BLACK_BOX_KEEP: "1" } : {}) }, repo, 30*60_000, candidateIdentity);
  process.stdout.write(result.stdout);process.stderr.write(result.stderr);
  if (result.status !== 0) throw new Error(`composite_v3_black_box_failed:${result.status}`);
  if (!filter && !/(?:skipped|skip)\s+0/iu.test(result.stdout)) throw new Error("composite_v3_black_box_unexecuted_or_skipped");
  process.stdout.write(`candidate_sha256=${createHash("sha256").update(await readFile(tarball)).digest("hex")}\n`);
} finally {
  if (service?.exitCode === null) { service.kill("SIGTERM"); await Promise.race([new Promise((resolve)=>service.once("exit",resolve)),new Promise((resolve)=>setTimeout(resolve,3000))]); }
  await rm(root, { recursive: true, force: true });
}

async function installCandidate(directory, candidate) { await mkdir(directory,{recursive:true});await writeFile(path.join(directory,"package.json"),JSON.stringify({name:"black-box-base-candidate",private:true,version:"1.0.0"}));const result=await run("npm",["install","--ignore-scripts","--no-audit","--no-fund","--package-lock=false",candidate],process.env,directory,10*60_000);if(result.status!==0)throw new Error(`candidate_install_failed:${result.stderr}`); }
async function waitForReady(file, child) { for(let attempt=0;attempt<600;attempt+=1){if(child.exitCode!==null)throw new Error(`candidate_host_exited:${child.exitCode}`);try{await readFile(file);return;}catch{}await new Promise((resolve)=>setTimeout(resolve,25));}throw new Error("candidate_host_not_ready"); }
function run(file,args,env,cwd=repo,timeout=30*60_000,identity){return new Promise((resolve,reject)=>{const child=spawn(file,args,{cwd,env,shell:false,windowsHide:true,stdio:["ignore","pipe","pipe"],...(identity?{uid:identity.uid,gid:identity.gid}:{})});const stdout=[];const stderr=[];let settled=false;const finish=(error,value)=>{if(settled)return;settled=true;clearTimeout(timer);error?reject(error):resolve(value);};child.stdout.on("data",(chunk)=>stdout.push(Buffer.from(chunk)));child.stderr.on("data",(chunk)=>stderr.push(Buffer.from(chunk)));child.once("error",finish);child.once("exit",(code,signal)=>finish(undefined,{status:code??-1,signal,stdout:Buffer.concat(stdout).toString("utf8"),stderr:Buffer.concat(stderr).toString("utf8")}));const timer=setTimeout(()=>{child.kill();finish(new Error(`runner_timeout:${path.basename(file)}`));},timeout);timer.unref();});}
function option(name){const index=process.argv.indexOf(name);return index<0?undefined:process.argv[index+1];}
function requiredOption(name){const value=option(name);if(!value)throw new Error(`missing_${name.slice(2).replace(/-/gu,"_")}`);return value;}
function unprivilegedIdentity(){const uid=Number(process.env.TY_CONTEXT_BLACK_BOX_CANDIDATE_UID??process.env.SUDO_UID);const gid=Number(process.env.TY_CONTEXT_BLACK_BOX_CANDIDATE_GID??process.env.SUDO_GID);if(!Number.isInteger(uid)||uid<=0||!Number.isInteger(gid)||gid<=0)throw new Error("composite_v3_black_box_unprivileged_identity_required");return {uid,gid};}
function escapeRegex(value){return value.replace(/[.*+?^${}()|[\]\\]/gu,"\\$&");}
