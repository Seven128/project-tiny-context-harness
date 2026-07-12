import { execFile, spawn } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createConnection } from "node:net";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { writeHappyV3Contract } from "./long-task-v3-fixtures.mjs";

const exec = promisify(execFile);
const packageName = "project-tiny-context-harness";

export async function createBlackBoxRuntime(row, testContext, options = {}) {
  const tarball = required("TY_CONTEXT_BLACK_BOX_CANDIDATE_TARBALL");
  const readyFile = required("TY_CONTEXT_MANAGED_HOST_READY");
  const root = await mkdtemp(path.join(os.tmpdir(), `tyc-v3-bb-${row.id}-`));
  if (process.platform !== "win32") await chmod(root, 0o711);
  const repository = path.join(root, "project");
  const install = path.join(root, "candidate");
  await Promise.all([installCandidate(install, tarball), mkdir(repository, { recursive: true })]);
  const workdir = await writeHappyV3Contract(repository, options.mutate ?? (() => {}));
  const packageRoot = path.join(install, "node_modules", packageName);
  const packageJson = JSON.parse(await readFile(path.join(packageRoot, "package.json"), "utf8"));
  if (packageJson.name !== packageName || packageJson.bin?.["ty-context"] !== "dist/cli.js") throw new Error("black_box_candidate_bin_invalid");
  const cliPath = path.join(packageRoot, "dist", "cli.js");
  const ready = JSON.parse(await readFile(readyFile, "utf8"));
  testContext.after(() => process.env.TY_CONTEXT_BLACK_BOX_KEEP === "1"
    ? undefined
    : rm(root, { recursive: true, force: true }));
  const runtime = {
    row, root, repository, workdir, install, packageRoot, cliPath, ready,
    async cli(subcommand, extra = [], settings = {}) {
      if (settings.heartbeat !== false) await managedHook(ready, repository, "SessionStart", { source: "resume" });
      return run(process.execPath, [cliPath, "composite-long-task", subcommand, settings.workdir ?? workdir, ...extra], repository, settings.timeout_ms ?? 180_000);
    },
    async hook(event, input = {}) { return managedHook(ready, repository, event, input); },
    async hostControl(action) { return hostControl(ready, action); },
    async commit(message = "black-box fixture update") {
      await exec("git", ["add", "-A"], { cwd: repository, windowsHide: true });
      const status = await exec("git", ["status", "--porcelain"], { cwd: repository, windowsHide: true });
      if (status.stdout.trim()) await exec("git", ["commit", "-m", message], { cwd: repository, windowsHide: true });
    },
    async write(relative, content) { const file = path.join(repository, ...relative.split("/")); await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, content); return file; },
    async read(relative) { return readFile(path.join(repository, ...relative.split("/")), "utf8"); },
    path(relative) { return path.join(repository, ...relative.split("/")); },
    taskPath(relative) { return path.join(workdir, ...relative.split("/")); }
  };
  if (options.prepare) await options.prepare(runtime);
  return runtime;
}

export function parseFinal(runtime) {
  return readFile(runtime.taskPath("final-result.json"), "utf8").then((text) => JSON.parse(text).payload);
}

export function parseStatus(runtime) {
  return readFile(runtime.taskPath("current-status.json"), "utf8").then(JSON.parse);
}

export function findingCodes(payload) {
  return new Set((payload?.findings ?? []).flatMap((finding) => [finding.code, finding.category]).filter(Boolean));
}

async function installCandidate(root, tarball) {
  await mkdir(root, { recursive: true });
  await writeFile(path.join(root, "package.json"), JSON.stringify({ name: "black-box-candidate-install", private: true, version: "1.0.0" }));
  await exec("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", "--package-lock=false", tarball], { cwd: root, windowsHide: true, timeout: 10 * 60_000, maxBuffer: 8 * 1024 * 1024 });
}

async function managedHook(ready, repository, event, input = {}) {
  const payload = {
    hook_event_name: event,
    session_id: `black-box-${process.pid}`,
    turn_id: `${event}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    cwd: repository,
    source: input.source ?? "startup",
    stop_hook_active: input.stop_hook_active ?? false,
    last_assistant_message: input.last_assistant_message ?? null
  };
  const result = await run(ready.codex_launcher, [ready.codex_script, process.execPath, ready.hook_path], repository, 240_000, JSON.stringify(payload));
  if (result.status !== 0) throw new Error(`managed_test_hook_failed:${result.stderr}`);
  return JSON.parse(result.stdout || "{}");
}

function hostControl(ready, action) {
  if (!ready.control_endpoint) throw new Error("black_box_host_control_unavailable");
  return new Promise((resolve, reject) => { const socket=createConnection(ready.control_endpoint);let body="";const timer=setTimeout(()=>socket.destroy(new Error("black_box_host_control_timeout")),5000);socket.setEncoding("utf8");socket.on("connect",()=>socket.end(`${JSON.stringify({action})}\n`));socket.on("data",(chunk)=>{body+=chunk;if(body.length>4096)socket.destroy(new Error("black_box_host_control_oversize"));});socket.on("error",reject);socket.on("close",()=>{clearTimeout(timer);try{const value=JSON.parse(body);value.ok?resolve(value):reject(new Error(value.error??"black_box_host_control_failed"));}catch(error){reject(error);}}); });
}

function run(file, args, cwd, timeout, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(file, args, { cwd, shell: false, windowsHide: true, env: { ...process.env, NO_COLOR: "1" }, stdio: ["pipe", "pipe", "pipe"] });
    const stdout = []; const stderr = []; let settled = false;
    const finish = (error, value) => { if (settled) return; settled = true; clearTimeout(timer); error ? reject(error) : resolve(value); };
    child.stdout.on("data", (chunk) => stdout.push(Buffer.from(chunk)));
    child.stderr.on("data", (chunk) => stderr.push(Buffer.from(chunk)));
    child.once("error", (error) => finish(error));
    child.once("exit", (code, signal) => finish(undefined, { status: code ?? -1, signal, stdout: Buffer.concat(stdout).toString("utf8").trim(), stderr: Buffer.concat(stderr).toString("utf8").trim() }));
    const timer = setTimeout(() => { child.kill(); finish(new Error(`black_box_command_timeout:${path.basename(file)}`)); }, timeout); timer.unref();
    child.stdin.end(input ?? "");
  });
}

function required(name) { const value = process.env[name]; if (!value) throw new Error(`missing_${name}`); return value; }
