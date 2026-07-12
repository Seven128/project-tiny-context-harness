import test from "node:test";
import assert from "node:assert/strict";
import { compositeLongTask } from "../../packages/ty-context/dist/commands/composite-long-task.js";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");

test("extra_argv_injected", async()=>{await assert.rejects(()=>compositeLongTask(["verify","task","--spec","VS-001","--","echo","forged"]),/Unknown or injected arguments/);});
test("wrong_command_same_spec", async()=>{await assert.rejects(()=>compositeLongTask(["verify","task","--spec","VS-001","node","evil.mjs"]),/Unknown or injected arguments/);});
test("old runtime commands are unknown", async()=>{for(const command of ["start-attempt","run-assertion","record-evidence","slice-gate","epoch-gate","derive","next-slices"]) await assert.rejects(()=>compositeLongTask([command,"task"]),/Unknown composite-long-task subcommand/);});
test("removed top-level commands fail instead of falling back to help",()=>{for(const command of ["superpowers","validate-superpowers-state"]){const result=spawnSync(process.execPath,[path.join(repoRoot,"packages/ty-context/dist/cli.js"),command],{encoding:"utf8"});assert.equal(result.status,1);assert.match(result.stderr,/Unknown command/);assert.doesNotMatch(result.stdout,/ty-context commands/);}});
test("final-gate returns exit 4 for a trusted externally-blocked Host result",()=>{const hook=pathToFileURL(path.join(repoRoot,"tests/ty-context/fixtures/hfc012/externally-blocked-host-hook.mjs")).href;const cli=path.join(repoRoot,"packages/ty-context/dist/cli.js");const result=spawnSync(process.execPath,["--import",hook,cli,"composite-long-task","final-gate","."],{cwd:repoRoot,encoding:"utf8"});assert.equal(result.status,4,result.stderr);assert.equal(JSON.parse(result.stdout).workflow_status,"externally_blocked");});
