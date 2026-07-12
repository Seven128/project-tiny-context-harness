#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, realpath, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { inspectNpmTarball, readExternalAuditLock, verifyExternalAuditResult } from "./external_long_task_audit.mjs";

const DEFAULT_LAB_DIR = path.resolve("tmp/ty-context/consumer-lab/workspace");

export function parseArgs(argv) {
  const options = { sourceRoot: process.cwd(), labDir: DEFAULT_LAB_DIR, candidateTarball: "", candidateSha256: "", hostReleaseSha256: "", externalResult: "", resetLab: false, keepLab: false, reportOnly: false, jsonReport: "", markdownReport: "", help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (["--reset-lab", "--keep-lab", "--report-only", "--help"].includes(value)) { options[value.slice(2).replace(/-([a-z])/gu, (_, letter) => letter.toUpperCase())] = true; continue; }
    const key = { "--source-root": "sourceRoot", "--lab-dir": "labDir", "--candidate-tarball": "candidateTarball", "--candidate-sha256": "candidateSha256", "--host-release-sha256": "hostReleaseSha256", "--external-result": "externalResult", "--json-report": "jsonReport", "--markdown-report": "markdownReport" }[value];
    if (!key || !argv[index + 1]) throw new Error(`Unknown or incomplete option: ${value}`);
    options[key] = argv[++index];
  }
  for (const key of ["sourceRoot", "labDir", "candidateTarball", "externalResult", "jsonReport", "markdownReport"]) if (options[key]) options[key] = path.resolve(options[key]);
  if (options.candidateSha256 && !/^[a-f0-9]{64}$/u.test(options.candidateSha256)) throw new Error("--candidate-sha256 must be 64 lowercase hex characters");
  if (options.hostReleaseSha256 && !/^[a-f0-9]{64}$/u.test(options.hostReleaseSha256)) throw new Error("--host-release-sha256 must be 64 lowercase hex characters");
  return options;
}

export function summarizeChecks(checks) {
  const summary = { PASS: 0, BLOCKED: 0, FAIL: 0, worst: "PASS" };
  for (const check of checks) summary[check.status] += 1;
  summary.worst = summary.FAIL ? "FAIL" : summary.BLOCKED ? "BLOCKED" : "PASS";
  return summary;
}

export function classifyMissingTools(result) {
  if (result.status === 0) return { status: "PASS", details: "command passed" };
  const output = `${result.stdout}\n${result.stderr}`;
  if (output.includes("tools/") && (output.includes("No such file") || output.includes("can't open file"))) return { status: "FAIL", details: "consumer repo is missing package-managed tools/**" };
  return { status: "FAIL", details: trimOutput(output) || `exit ${result.status}` };
}

export function resolveInvocation(command, args, platform = process.platform, nodePath = process.execPath) {
  if (platform !== "win32" || !["npm", "npx"].includes(command)) return { command, args };
  const cli = path.win32.join(path.win32.dirname(nodePath), "node_modules", "npm", "bin", `${command}-cli.js`);
  return { command: nodePath, args: [cli, ...args] };
}

export async function runConsumerLabFullTest(rawOptions) {
  const options = { ...rawOptions, sourceRoot: path.resolve(rawOptions.sourceRoot ?? process.cwd()), labDir: path.resolve(rawOptions.labDir ?? DEFAULT_LAB_DIR) };
  for (const [name, value] of [["--candidate-tarball", options.candidateTarball], ["--candidate-sha256", options.candidateSha256], ["--host-release-sha256", options.hostReleaseSha256], ["--external-result", options.externalResult]]) if (!value) throw new Error(`${name} is required`);
  await assertSafeLab(options.labDir, options.sourceRoot, options.resetLab);
  const candidatePath = await realpath(options.candidateTarball); const candidateBytes = await readFile(candidatePath); const actualSha = sha256(candidateBytes);
  if (actualSha !== options.candidateSha256) throw new Error(`candidate sha256 mismatch: ${actualSha}`);
  const manifest = inspectNpmTarball(candidateBytes);
  if (manifest.name !== "project-tiny-context-harness" || manifest.bin?.["ty-context"] !== "dist/cli.js") throw new Error("candidate package identity invalid");
  const envelope = JSON.parse(await readFile(options.externalResult, "utf8")); const lock = await readExternalAuditLock();
  const external = verifyExternalAuditResult(envelope, { lock, candidateSha256: actualSha, candidateVersion: manifest.version, hostReleaseSha256: options.hostReleaseSha256, expectedPlatform: envelope.payload?.platform?.platform, expectedArch: envelope.payload?.platform?.arch });
  const startedAt = new Date().toISOString(); const checks = [];
  const add = (area, evidence, status, details) => checks.push({ area, evidence, status, details });
  add("Candidate", "exact package tarball identity", "PASS", `${manifest.name}@${manifest.version} sha256=${actualSha}`);
  add("Independent audit", "signed full external matrix", external.consumers.length === 6 && external.attacks.length === 8 ? "PASS" : "FAIL", `${external.attacks.length} attacks and ${external.consumers.length} real consumers`);
  if (options.resetLab) await rm(options.labDir, { recursive: true, force: true });
  await mkdir(options.labDir, { recursive: true }); await writeFile(path.join(options.labDir, ".ty-context-consumer-lab"), `${actualSha}\n`);
  await writeFile(path.join(options.labDir, "package.json"), `${JSON.stringify({ name: "ty-context-clean-consumer", version: "1.0.0", private: true }, null, 2)}\n`);
  commandCheck(add, options.labDir, "Install", "install exact candidate", "npm", ["install", "--save-dev", "--ignore-scripts", "--no-audit", "--no-fund", candidatePath]);
  const npx = (...args) => ["--no-install", "ty-context", ...args];
  commandCheck(add, options.labDir, "CLI", "init clean consumer", "npx", npx("init", "--adopt", "--harness-folder", ".codex"));
  commandCheck(add, options.labDir, "CLI", "doctor installed package", "npx", npx("doctor"));
  commandCheck(add, options.labDir, "CLI", "first managed source sync", "npx", npx("sync"));
  const firstDigest = await treeDigest(path.join(options.labDir, ".codex"));
  commandCheck(add, options.labDir, "CLI", "second managed source sync", "npx", npx("sync"));
  const secondDigest = await treeDigest(path.join(options.labDir, ".codex"));
  add("CLI", "second sync is a no-op", firstDigest === secondDigest ? "PASS" : "FAIL", `${firstDigest} -> ${secondDigest}`);
  commandCheck(add, options.labDir, "CLI", "upgrade idempotency", "npx", npx("upgrade"));
  commandCheck(add, options.labDir, "Validation", "validate-context", "npx", npx("validate-context"));
  commandCheck(add, options.labDir, "Validation", "validate-harness", "npx", npx("validate-harness"));
  const help = run("npx", npx("composite-long-task", "--help"), options.labDir);
  const publicCommands = ["init", "compile", "verify", "status", "final-gate", "stop-check", "render-goal"].every((value) => help.stdout.includes(value));
  add("Composite V3", "single strict public command surface", help.status === 0 && publicCommands && !/\b(force|reset|cancel-active|evidence|slice|epoch|derived)\b/u.test(help.stdout) ? "PASS" : "FAIL", trimOutput(`${help.stdout}\n${help.stderr}`));
  await verifyManagedAssets(options.labDir, add);
  const report = { startedAt, finishedAt: new Date().toISOString(), packageName: manifest.name, packageVersion: manifest.version, candidateSha256: actualSha, sourceRoot: options.sourceRoot, labDir: options.labDir, labCleanup: options.keepLab ? "kept" : "deleted", summary: summarizeChecks(checks), checks };
  const reportRoot = path.join(options.sourceRoot, "tmp", "ty-context", "consumer-lab", "latest"); const jsonPath = options.jsonReport || path.join(reportRoot, "report.json"); const markdownPath = options.markdownReport || path.join(reportRoot, "report.md");
  await mkdir(path.dirname(jsonPath), { recursive: true }); await mkdir(path.dirname(markdownPath), { recursive: true }); await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`); await writeFile(markdownPath, renderMarkdownReport(report));
  if (!options.keepLab) await rm(options.labDir, { recursive: true, force: true });
  return report;
}

async function verifyManagedAssets(labDir, add) {
  const packageRoot = path.join(labDir, "node_modules", "project-tiny-context-harness");
  const required = ["assets/managed-host-gate/long-task-hook.mjs", "assets/managed-host-gate/ty-context-host-worker.mjs", "assets/skills/composite-long-task-workflow/SKILL.md", "assets/skills/prepare-composite-long-task/SKILL.md"];
  const forbidden = ["assets/protected-harness-baseline.json", "assets/hooks/long-task-hook.mjs"];
  const missing = required.filter((relative) => !existsSync(path.join(packageRoot, ...relative.split("/")))); const present = forbidden.filter((relative) => existsSync(path.join(packageRoot, ...relative.split("/"))));
  add("Managed assets", "managed-only Host and Contract V3 Skills", missing.length === 0 && present.length === 0 ? "PASS" : "FAIL", `missing=${missing.join(",") || "none"}; forbidden=${present.join(",") || "none"}`);
  add("Managed assets", "sync installs no repository Hook fallback", !existsSync(path.join(labDir, ".codex", "hooks", "long-task-hook.mjs")) ? "PASS" : "FAIL", ".codex/hooks/long-task-hook.mjs must not exist");
}

function commandCheck(add, cwd, area, evidence, command, args) { const result = run(command, args, cwd); const classified = classifyMissingTools(result); add(area, evidence, classified.status, classified.details); }
function run(command, args, cwd) { const invocation = resolveInvocation(command, args); const result = spawnSync(invocation.command, invocation.args, { cwd, encoding: "utf8", env: { ...process.env, CI: "1" }, maxBuffer: 16 * 1024 * 1024 }); return { status: result.status ?? 1, stdout: result.stdout ?? "", stderr: result.stderr ?? (result.error ? String(result.error) : "") }; }
async function treeDigest(root) { const rows = []; async function visit(directory, relative = "") { for (const entry of await readdir(directory, { withFileTypes: true }).catch(() => [])) { const rel = relative ? `${relative}/${entry.name}` : entry.name; const file = path.join(directory, entry.name); if (entry.isDirectory()) await visit(file, rel); else if (entry.isFile()) rows.push([rel, sha256(await readFile(file))]); } } await visit(root); return sha256(JSON.stringify(rows.sort((a, b) => a[0].localeCompare(b[0])))); }
async function assertSafeLab(labDir, sourceRoot, resetLab) { const resolved = path.resolve(labDir); const forbidden = new Set([path.parse(resolved).root, path.resolve(sourceRoot), path.resolve(os.homedir())]); if (forbidden.has(resolved) || resolved.length < path.parse(resolved).root.length + 8) throw new Error(`unsafe lab directory: ${resolved}`); if (!resetLab && existsSync(resolved) && !existsSync(path.join(resolved, ".ty-context-consumer-lab")) && (await readdir(resolved)).length > 0) throw new Error("existing lab directory lacks .ty-context-consumer-lab marker"); }
function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function trimOutput(value) { return String(value).trim().split(/\r?\n/u).slice(-12).join("\n"); }
function escape(value) { return String(value ?? "").replaceAll("|", "\\|").replaceAll("\n", " "); }

export function renderMarkdownReport(report) {
  const rows = report.checks.map((check) => `| ${escape(check.area)} | ${escape(check.evidence)} | ${check.status} | ${escape(check.details)} |`).join("\n");
  return `# Harness Consumer Lab Full Test\n\n- Package: \`${report.packageName}@${report.packageVersion}\`\n- Candidate SHA-256: \`${report.candidateSha256 ?? "unknown"}\`\n- Lab cleanup: \`${report.labCleanup}\`\n- Decision: ${report.summary.worst}\n- PASS: ${report.summary.PASS}; BLOCKED: ${report.summary.BLOCKED}; FAIL: ${report.summary.FAIL}\n\n| Area | Evidence | Result | Details |\n|---|---|---|---|\n${rows}\n`;
}

function printHelp() { console.log(`Usage: node tools/consumer_lab_full_test.mjs --candidate-tarball <file.tgz> --candidate-sha256 <sha256> --host-release-sha256 <sha256> --external-result <signed-result.json> [options]\n\nOptions:\n  --lab-dir <path>\n  --source-root <path>\n  --reset-lab\n  --keep-lab\n  --report-only\n  --json-report <path>\n  --markdown-report <path>`); }
async function main() { const options = parseArgs(process.argv.slice(2)); if (options.help) return printHelp(); const report = await runConsumerLabFullTest(options); console.log(renderMarkdownReport(report)); if (!options.reportOnly && report.summary.worst !== "PASS") process.exitCode = 1; }
const entrypoint = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (import.meta.url === entrypoint) main().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
