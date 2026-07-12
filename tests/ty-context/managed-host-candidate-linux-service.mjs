import { spawn } from "node:child_process";
import { chmod, chown, cp, mkdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";
import { pathToFileURL } from "node:url";

if (process.platform !== "linux" || process.getuid?.() !== 0 || !(await container() || process.env.GITHUB_ACTIONS === "true")) throw new Error("candidate_managed_host_requires_linux_root_container_or_ci");
const candidate = required("TY_CONTEXT_BLACK_BOX_BASE_PACKAGE_ROOT");
const hostRelease = required("TY_CONTEXT_HOST_RELEASE_ARCHIVE");
const readyPath = required("TY_CONTEXT_MANAGED_HOST_READY");
const controlEndpoint = path.join(path.dirname(readyPath), "managed-host-control.sock");
const candidateGid = numeric("TY_CONTEXT_BLACK_BOX_CANDIDATE_GID");
const moduleAt = (relative) => import(pathToFileURL(path.join(candidate, ...relative.split("/"))).href);
const [{ managedHostLayout }, { renderManagedRequirementsV1 }, releaseArchive, release, { LONG_TASK_HOST_RELEASE_ROOT_PUBLIC_KEY_PEM }, runtimeIdentity, codec] = await Promise.all([
  moduleAt("dist/lib/long-task-managed-host-layout.js"),
  moduleAt("dist/lib/long-task-managed-requirements.js"),
  moduleAt("dist/lib/long-task-host-release-archive.js"),
  moduleAt("dist/lib/long-task-host-release.js"),
  moduleAt("dist/lib/long-task-host-release-root.js"),
  moduleAt("dist/lib/long-task-host-runtime-identity.js"),
  moduleAt("dist/lib/composite-campaign-codec.js")
]);

const layout = managedHostLayout("linux");
const materialized = await releaseArchive.materializeHostReleaseSourceV1(hostRelease);
const source = materialized.root;
await release.verifyHostReleaseDirectoryV1(source, LONG_TASK_HOST_RELEASE_ROOT_PUBLIC_KEY_PEM, { platform: "linux", arch: process.arch });
const codexDirectory = "/usr/local/libexec";
const codexLauncher = path.join(codexDirectory, "ty-context-codex-black-box-launcher");
const codexScript = path.join(codexDirectory, "ty-context-codex-black-box-launcher.mjs");
await Promise.all([rm(layout.managed_dir,{recursive:true,force:true}),rm(layout.state_root,{recursive:true,force:true}),rm(layout.requirements_file,{force:true}),rm(layout.endpoint,{force:true}),rm(readyPath,{force:true})]);
await Promise.all([mkdir(layout.managed_dir,{recursive:true}),mkdir(layout.state_root,{recursive:true}),mkdir(path.dirname(layout.requirements_file),{recursive:true}),mkdir(path.dirname(layout.endpoint),{recursive:true}),mkdir(codexDirectory,{recursive:true})]);
await Promise.all([
  cp(path.join(source,"ty-context-host-helper"),layout.helper_path),cp(path.join(source,"ty-context-host-admin"),layout.admin_path),cp(path.join(source,"ty-context-host-installer-ui"),layout.installer_ui_path),
  cp(path.join(source,"long-task-hook.mjs"),layout.hook_path),cp(path.join(source,"ty-context-host-worker.mjs"),layout.worker_path),cp(path.join(source,"requirements.toml"),path.join(layout.managed_dir,"requirements.toml")),
  cp(path.join(source,"host-release-manifest.json"),layout.release_manifest_path),cp(path.join(source,"host-release-manifest.sig"),layout.release_signature_path),cp(path.join(source,"host-release-root-public.pem"),layout.release_root_public_key_path),cp(process.execPath,codexLauncher)
]);
await writeFile(codexScript,`import {spawnSync} from "node:child_process";const result=spawnSync(process.argv[2],process.argv.slice(3),{stdio:"inherit",windowsHide:true});process.exit(result.status??1);\n`);
await Promise.all([layout.helper_path,layout.admin_path,layout.installer_ui_path,codexLauncher].map((file)=>chmod(file,0o755)));
const requirements=renderManagedRequirementsV1(layout);await writeFile(layout.requirements_file,requirements);
const manifestText=await readFile(layout.release_manifest_path,"utf8");
const cliPath=await realpath(path.join(candidate,"dist","cli.js"));const cliWorkerPath=await realpath(path.join(candidate,"dist","lib","long-task-host-worker-runtime.js"));const cliRuntimeManifest=await runtimeIdentity.createManagedHostRuntimeManifestV1(cliPath);const sandboxLauncher=await runtimeIdentity.resolveManagedSandboxLauncherV1(layout.helper_path,"linux");
const config={schema_version:"ty-context-host-service-config-v1",state_root:layout.state_root,endpoint:layout.endpoint,managed_dir:layout.managed_dir,requirements_file:layout.requirements_file,node_path:await realpath(process.execPath),node_sha256:codec.sha256Hex(await readFile(process.execPath)),helper_path:layout.helper_path,sandbox_launcher_path:sandboxLauncher.path,sandbox_launcher_sha256:sandboxLauncher.sha256,admin_path:layout.admin_path,admin_sha256:codec.sha256Hex(await readFile(layout.admin_path)),installer_ui_path:layout.installer_ui_path,installer_ui_sha256:codec.sha256Hex(await readFile(layout.installer_ui_path)),codex_launcher_path:codexLauncher,codex_launcher_sha256:codec.sha256Hex(await readFile(codexLauncher)),cli_path:cliPath,cli_sha256:codec.sha256Hex(await readFile(cliPath)),cli_worker_path:cliWorkerPath,cli_worker_sha256:codec.sha256Hex(await readFile(cliWorkerPath)),cli_runtime_manifest:cliRuntimeManifest,cli_runtime_manifest_sha256:runtimeIdentity.managedHostRuntimeManifestSha256V1(cliRuntimeManifest),hook_path:layout.hook_path,hook_sha256:codec.sha256Hex(await readFile(layout.hook_path)),worker_path:layout.worker_path,worker_sha256:codec.sha256Hex(await readFile(layout.worker_path)),attestation_public_key_path:layout.attestation_public_key_path,managed_policy_sha256:codec.sha256Hex(requirements),release_manifest_sha256:codec.sha256Hex(manifestText),test_namespace:false};
await writeFile(layout.service_config_path,codec.canonicalValueJson(config));await Promise.all([chmod(layout.managed_dir,0o755),chmod(layout.state_root,0o700),chmod(layout.requirements_file,0o644),chmod(path.dirname(layout.endpoint),0o755),...[layout.hook_path,layout.worker_path,path.join(layout.managed_dir,"requirements.toml"),layout.release_root_public_key_path,layout.release_manifest_path,layout.release_signature_path,layout.service_config_path].map((file)=>chmod(file,0o644))]);
const originalHook=await readFile(layout.hook_path);const control=createControlServer(controlEndpoint,layout.hook_path,originalHook);await listen(control,controlEndpoint);await chown(controlEndpoint,0,candidateGid);await chmod(controlEndpoint,0o660);
await chown(path.dirname(layout.endpoint),0,candidateGid);await chmod(path.dirname(layout.endpoint),0o2770);const service=spawn(layout.helper_path,["serve","--config",layout.service_config_path],{stdio:["ignore","ignore","inherit"],uid:0,gid:candidateGid});await waitFor(layout.attestation_public_key_path);await writeFile(readyPath,codec.canonicalValueJson({schema_version:"ty-context-managed-host-test-ready-v1",codex_launcher:codexLauncher,codex_script:codexScript,hook_path:layout.hook_path,control_endpoint:controlEndpoint}),{mode:0o644});
for(const signal of ["SIGINT","SIGTERM"])process.once(signal,()=>service.kill());const code=await new Promise((resolve,reject)=>{service.once("error",reject);service.once("exit",(value)=>resolve(value??1));});await close(control);await Promise.all([rm(readyPath,{force:true}),rm(controlEndpoint,{force:true}),materialized.cleanup(),rm(layout.managed_dir,{recursive:true,force:true}),rm(layout.state_root,{recursive:true,force:true}),rm(layout.requirements_file,{force:true}),rm(layout.endpoint,{force:true}),rm(codexLauncher,{force:true}),rm(codexScript,{force:true})]);process.exitCode=code;

function required(name){const value=process.env[name];if(!value)throw new Error(`missing_${name}`);return value;}
function numeric(name){const value=Number(required(name));if(!Number.isInteger(value)||value<=0)throw new Error(`invalid_${name}`);return value;}
async function waitFor(file){for(let attempt=0;attempt<400;attempt+=1){try{await readFile(file);return;}catch{}await new Promise((resolve)=>setTimeout(resolve,25));}throw new Error(`managed_host_not_ready:${file}`);}
async function container(){try{await readFile("/.dockerenv");return true;}catch{return false;}}
function createControlServer(endpoint,hook,original){return createServer({allowHalfOpen:true},(socket)=>{let body="";socket.setEncoding("utf8");socket.on("data",(chunk)=>{body+=chunk;if(body.length>4096)socket.destroy();});socket.on("end",async()=>{try{const request=JSON.parse(body);if(request.action==="remove-hook")await rm(hook,{force:true});else if(request.action==="replace-hook")await writeFile(hook,'process.stdout.write("{}\\n");\n');else if(request.action==="restore-hook")await writeFile(hook,original);else throw new Error("test_host_control_action_invalid");if(request.action!=="remove-hook")await chmod(hook,0o644);socket.end('{"ok":true}\n');}catch(error){socket.end(`${JSON.stringify({ok:false,error:String(error?.message??error)})}\n`);}});});}
function listen(server,endpoint){return new Promise((resolve,reject)=>{server.once("error",reject);server.listen(endpoint,resolve);});}
function close(server){return new Promise((resolve)=>server.close(resolve));}
