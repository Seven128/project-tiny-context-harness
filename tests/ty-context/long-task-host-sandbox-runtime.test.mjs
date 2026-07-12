import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { access, copyFile, mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { nodeModuleEntrypointArgv } from "../../packages/ty-context/dist/lib/long-task-sandbox-node.js";

const helper = process.env.TY_CONTEXT_HOST_HELPER_BIN;

test("Windows Host helper has no unmanifested adjacent runtime dependency", { skip: !helper || process.platform !== "win32", timeout: 30_000 }, async () => {
  const { resolveWindowsPeRuntimeV1 } = await import("../../packages/ty-context/dist/lib/long-task-windows-pe-runtime.js");
  const dependencies = await resolveWindowsPeRuntimeV1(helper);
  const systemRoot = path.resolve(process.env.SystemRoot, "System32").toLocaleLowerCase("en-US");
  assert.ok(dependencies.length > 0);
  assert.ok(dependencies.every((item) => path.resolve(item.path).toLocaleLowerCase("en-US").startsWith(`${systemRoot}${path.sep}`)), JSON.stringify(dependencies));
  assert.ok(dependencies.every((item) => path.basename(item.path).toLocaleLowerCase("en-US") !== "libunwind.dll"));
});

test("AppContainer launcher starts a system-native process", { skip: !helper || process.platform !== "win32", timeout: 30_000 }, async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ltw-host-native-sandbox-"));
  const executable = path.join(process.env.SystemRoot, "System32", "cmd.exe");
  const policyFile = path.join(root, "policy.json");
  await writeFile(policyFile, canonical({ schema_version: "ty-context-host-sandbox-v1", executable, cwd: root, read_paths: [root], write_paths: [root], timeout_ms: 5000, network: "none", allow_child_process: false }));
  const result = await run(helper, ["sandbox", "--policy", policyFile, "--", executable, "/d", "/c", "exit 0", "--permission"]);
  assert.equal(result.code, 0, result.stderr);
});

test("Host policy rejects the obsolete split browser sandbox path", { skip: !helper, timeout: 30_000 }, async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ltw-host-browser-kind-"));
  const executable = process.platform === "win32" ? path.join(process.env.SystemRoot, "System32", "cmd.exe") : process.execPath;
  const policyFile = path.join(root, "policy.json");
  await writeFile(policyFile, canonical({
    schema_version: "ty-context-host-sandbox-v1",
    process_kind: "browser",
    executable,
    cwd: root,
    read_paths: [root],
    write_paths: [root],
    timeout_ms: 5000,
    network: "loopback",
    allow_child_process: true,
    process_limit: 8
  }));
  const command = process.platform === "win32" ? [executable, "/d", "/c", "exit 0"] : [executable, "-e", "process.exit(0)"];
  const result = await run(helper, ["sandbox", "--policy", policyFile, "--", ...command]);
  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /policy_values/u);
});

test("AppContainer loopback policy allows only loopback and blocks reachable LAN plus external addresses", { skip: !helper || process.platform !== "win32", timeout: 90_000 }, async (context) => {
  const lanAddress = Object.values(os.networkInterfaces()).flat().find((entry) => entry && entry.family === "IPv4" && !entry.internal)?.address;
  if (!lanAddress) { context.skip("no non-loopback IPv4 interface"); return; }
  const root = await mkdtemp(path.join(os.tmpdir(), "ltw-host-loopback-policy-"));
  const readable = path.join(root, "read"); const writable = path.join(root, "write");
  await Promise.all([mkdir(readable), mkdir(writable)]);
  const sandboxNode = path.join(readable, "node.exe");
  await copyFile(process.execPath, sandboxNode);
  const script = path.join(readable, "network-probe.mjs");
  await writeFile(script, `import net from "node:net";
const [loopbackPort,lanAddress,lanPort]=process.argv.slice(2);
function probe(host,port){return new Promise(resolve=>{let settled=false;const socket=net.createConnection({host,port:Number(port)});const finish=value=>{if(settled)return;settled=true;clearTimeout(timer);socket.destroy();resolve(value)};const timer=setTimeout(()=>finish(false),750);socket.once("connect",()=>finish(true));socket.once("error",()=>finish(false));});}
const result={loopback:await probe("127.0.0.1",loopbackPort),lan:await probe(lanAddress,lanPort),external:await probe("1.1.1.1",443)};
process.stdout.write(JSON.stringify(result));
`);
  const loopback = net.createServer((socket) => socket.end());
  const lan = net.createServer((socket) => socket.end());
  await Promise.all([listen(loopback, "127.0.0.1"), listen(lan, "0.0.0.0")]);
  try {
    assert.equal(await canConnect(lanAddress, lan.address().port), true, "control connection must prove the LAN listener is reachable outside the sandbox");
    const policyFile = path.join(root, "policy.json");
    await writeFile(policyFile, canonical({ schema_version: "ty-context-host-sandbox-v1", process_kind: "command", executable: sandboxNode, cwd: readable, read_paths: [readable], write_paths: [writable], timeout_ms: 15_000, network: "loopback", allow_child_process: false, process_limit: 1 }));
    const result = await run(helper, ["sandbox", "--policy", policyFile, "--", sandboxNode, ...nodeModuleEntrypointArgv(script, [String(loopback.address().port), lanAddress, String(lan.address().port)])]);
    assert.equal(result.code, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), { loopback: true, lan: false, external: false });
  } finally { loopback.close(); lan.close(); }
});

test("AppContainer command token runs at low or untrusted integrity", { skip: !helper || process.platform !== "win32", timeout: 45_000 }, async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ltw-host-integrity-"));
  const executable = path.join(process.env.SystemRoot, "System32", "whoami.exe");
  const policyFile = path.join(root, "policy.json");
  await writeFile(policyFile, canonical({ schema_version: "ty-context-host-sandbox-v1", process_kind: "command", executable, cwd: root, read_paths: [root], write_paths: [root], timeout_ms: 10_000, network: "none", allow_child_process: false, process_limit: 1 }));
  const result = await run(helper, ["sandbox", "--policy", policyFile, "--", executable, "/groups", "/fo", "csv", "/nh"]);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /S-1-16-(?:0|4096)\b/u);
  assert.doesNotMatch(result.stdout, /S-1-16-(?:8192|12288|16384)\b/u);
});

test("Windows ACL preparation rejects a junction that escapes declared roots", { skip: !helper || process.platform !== "win32", timeout: 45_000 }, async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ltw-host-reparse-"));
  const readable = path.join(root, "read"); const writable = path.join(root, "write"); const outside = await mkdtemp(path.join(os.tmpdir(), "ltw-host-reparse-outside-"));
  await Promise.all([mkdir(readable), mkdir(writable)]);
  await symlink(outside, path.join(readable, "escape"), "junction");
  const executable = path.join(process.env.SystemRoot, "System32", "cmd.exe");
  const policyFile = path.join(root, "policy.json");
  await writeFile(policyFile, canonical({ schema_version: "ty-context-host-sandbox-v1", process_kind: "command", executable, cwd: readable, read_paths: [readable], write_paths: [writable], timeout_ms: 5000, network: "none", allow_child_process: false, process_limit: 1 }));
  const result = await run(helper, ["sandbox", "--policy", policyFile, "--", executable, "/d", "/c", "exit 0"]);
  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /sandbox_reparse_escape/u);
});

test("real Host sandbox blocks undeclared filesystem and network despite widened Node flags", { skip: !helper, timeout: 60_000 }, async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ltw-host-sandbox-"));
  const readable = path.join(root, "read"); const writable = path.join(root, "write");
  const outside = path.join(root, "outside");
  await Promise.all([mkdir(readable), mkdir(writable), mkdir(outside)]);
  await writeFile(path.join(readable, "input.txt"), "inside");
  await writeFile(path.join(outside, "secret.txt"), "host-secret");
  const sandboxNode = path.join(readable, process.platform === "win32" ? "node.exe" : "node");
  await copyFile(process.execPath, sandboxNode);
  const output = path.join(writable, "result.json");
  const escaped = path.join(outside, "escaped.txt");
  const script = path.join(readable, "probe.mjs");
  await writeFile(script, `import {readFile,writeFile} from "node:fs/promises";import net from "node:net";
const [input,secret,output,escaped,port]=process.argv.slice(2);
const insideRead=await readFile(input,"utf8").then(()=>true,()=>false);
const outsideRead=await readFile(secret,"utf8").then(()=>true,()=>false);
const outsideWrite=await writeFile(escaped,"bad").then(()=>true,()=>false);
const network=await new Promise(resolve=>{const s=net.createConnection({host:"127.0.0.1",port:Number(port)});const t=setTimeout(()=>{s.destroy();resolve(false)},1000);s.once("connect",()=>{clearTimeout(t);s.destroy();resolve(true)});s.once("error",()=>{clearTimeout(t);resolve(false)})});
await writeFile(output,JSON.stringify({insideRead,outsideRead,outsideWrite,network,insideWrite:true}));
`);
  const server = net.createServer((socket) => socket.end());
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const port = server.address().port;
  const policyFile = path.join(root, "policy.json");
  const policy = { schema_version: "ty-context-host-sandbox-v1", executable: sandboxNode, cwd: readable, read_paths: [readable], write_paths: [writable], timeout_ms: 15_000, network: "none", allow_child_process: false };
  await writeFile(policyFile, canonical(policy));
  const argv = [
    "sandbox", "--policy", policyFile, "--", sandboxNode, "--preserve-symlinks", "--preserve-symlinks-main", "--permission",
    `--allow-fs-read=${readable}`, `--allow-fs-read=${outside}`, `--allow-fs-write=${writable}`, `--allow-fs-write=${outside}`,
    ...nodeModuleEntrypointArgv(script, [path.join(readable, "input.txt"), path.join(outside, "secret.txt"), output, escaped, String(port)])
  ];
  try {
    const result = await run(helper, argv);
    assert.equal(result.code, 0, result.stderr);
    assert.deepEqual(JSON.parse(await readFile(output, "utf8")), { insideRead: true, outsideRead: false, outsideWrite: false, network: false, insideWrite: true });
    await assert.rejects(access(escaped));
  } finally { server.close(); }
});

test("real Host sandbox transports Oracle protocol through Host-owned files without inherited handles", { skip: !helper, timeout: 60_000 }, async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ltw-host-oracle-transport-"));
  const readable = path.join(root, "read"); const writable = path.join(root, "write");
  await Promise.all([mkdir(readable), mkdir(writable)]);
  const sandboxNode = path.join(readable, process.platform === "win32" ? "node.exe" : "node");
  await copyFile(process.execPath, sandboxNode);
  const script = path.join(readable, "oracle.mjs");
  await writeFile(script, `import {writeFileSync} from "node:fs";
writeFileSync(process.env.TY_CONTEXT_ORACLE_PROTOCOL_FILE,JSON.stringify({schema_version:"ty-context-observation-v2",ok:true}));
writeFileSync(process.env.TY_CONTEXT_ORACLE_DIAGNOSTIC_FILE,"oracle-diagnostic");
`);
  const protocolOutput = path.join(writable, "protocol.json");
  const diagnosticOutput = path.join(writable, "diagnostic.txt");
  const policyFile = path.join(root, "policy.json");
  const policy = { schema_version: "ty-context-host-sandbox-v1", executable: sandboxNode, cwd: readable, read_paths: [readable], write_paths: [writable], protocol_output: protocolOutput, diagnostic_output: diagnosticOutput, timeout_ms: 15_000, network: "none", allow_child_process: false };
  await writeFile(policyFile, canonical(policy));
  const result = await run(helper, ["sandbox", "--policy", policyFile, "--", sandboxNode, "--preserve-symlinks", "--preserve-symlinks-main", "--permission", `--allow-fs-read=${readable}`, `--allow-fs-write=${writable}`, ...nodeModuleEntrypointArgv(script)]);
  assert.equal(result.code, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), { schema_version: "ty-context-observation-v2", ok: true });
  assert.equal(result.stderr, "oracle-diagnostic");
});

test("real Host command sandbox captures stdio while blocking undeclared writes and network", { skip: !helper, timeout: 60_000 }, async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ltw-host-command-sandbox-"));
  const readable = path.join(root, "read"); const writable = path.join(root, "write"); const outside = path.join(root, "outside");
  await Promise.all([mkdir(readable), mkdir(writable), mkdir(outside)]);
  const sandboxNode = path.join(readable, process.platform === "win32" ? "node.exe" : "node");
  await copyFile(process.execPath, sandboxNode);
  const allowed = path.join(writable, "allowed.txt"); const escaped = path.join(outside, "escaped.txt");
  const script = path.join(readable, "command-probe.mjs");
  await writeFile(script, `import {writeFile} from "node:fs/promises";import {spawn} from "node:child_process";import net from "node:net";
const [allowed,escaped,port]=process.argv.slice(2);
console.error("command-probe:start");
const insideWrite=await writeFile(allowed,"ok").then(()=>true,()=>false);
console.error("command-probe:inside-write");
const outsideWrite=await writeFile(escaped,"bad").then(()=>true,()=>false);
console.error("command-probe:outside-write");
const network=await new Promise(resolve=>{const s=net.createConnection({host:"127.0.0.1",port:Number(port)});const t=setTimeout(()=>{s.destroy();resolve(false)},1000);s.once("connect",()=>{clearTimeout(t);s.destroy();resolve(true)});s.once("error",()=>{clearTimeout(t);resolve(false)})});
console.error("command-probe:network");
const child=await new Promise(resolve=>{const value=spawn(process.execPath,["-e","process.exit(0)"],{stdio:"inherit"});value.once("error",error=>{console.error("command-probe:child-error:"+error.code);resolve(false)});value.once("close",code=>{console.error("command-probe:child-close:"+code+":"+(code===0));resolve(code===0)});const timer=setTimeout(()=>{console.error("command-probe:child-timeout");value.kill();resolve(false)},5000);timer.unref()});
console.error("command-probe:child");
process.stdout.write(JSON.stringify({insideWrite,outsideWrite,network,child}));
`);
  const server = net.createServer((socket) => socket.end());
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const policyFile = path.join(root, "policy.json");
  const policy = { schema_version: "ty-context-host-sandbox-v1", process_kind: "command", executable: sandboxNode, cwd: readable, read_paths: [readable], write_paths: [writable], timeout_ms: 15_000, network: "none", allow_child_process: true, process_limit: 8 };
  await writeFile(policyFile, canonical(policy));
  try {
    const result = await run(helper, ["sandbox", "--policy", policyFile, "--", sandboxNode, "--preserve-symlinks-main", ...nodeModuleEntrypointArgv(script, [allowed, escaped, String(server.address().port)])]);
    assert.equal(result.code, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), { insideWrite: true, outsideWrite: false, network: false, child: true }, result.stderr);
    assert.equal(await readFile(allowed, "utf8"), "ok");
    await assert.rejects(access(escaped));
  } finally { server.close(); }
});

function run(file, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(file, args, { stdio: ["ignore", "pipe", "pipe"], windowsHide: true, env: { ...process.env, TY_CONTEXT_ORACLE_PROTOCOL_FD: "1", TY_CONTEXT_HOST_MAINTAINER_DEBUG: "1" } });
    const stdout = []; const stderr = [];
    child.stdout.on("data", (chunk) => stdout.push(chunk)); child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.once("error", reject); child.once("exit", (code) => resolve({ code, stdout: Buffer.concat(stdout).toString("utf8"), stderr: Buffer.concat(stderr).toString("utf8") }));
  });
}
function canonical(value) { return JSON.stringify(sort(value)); }
function sort(value) { if (Array.isArray(value)) return value.map(sort); if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sort(value[key])])); return value; }
function listen(server, host) { return new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, host, resolve); }); }
function canConnect(host, port) { return new Promise((resolve) => { const socket = net.createConnection({ host, port }); const timer = setTimeout(() => { socket.destroy(); resolve(false); }, 1000); socket.once("connect", () => { clearTimeout(timer); socket.destroy(); resolve(true); }); socket.once("error", () => { clearTimeout(timer); resolve(false); }); }); }
