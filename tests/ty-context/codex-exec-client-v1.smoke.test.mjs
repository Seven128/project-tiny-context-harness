import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  buildCodexExecArgv,
  runCodexExec,
} from "../../packages/ty-context/dist/lib/codex-exec-client.js";

test("bounded exec client uses argv and stdin, parses JSONL, and preserves exit facts", async () => {
  const fixture = await fakeFixture();
  try {
    const argv = buildCodexExecArgv({
      kind: "execution",
      cwd: fixture.root,
      profile: { model: "model & no-shell", effort: "high" },
    });
    const result = await runCodexExec({
      executable: process.execPath,
      args: [fixture.script, "normal", ...argv],
      cwd: fixture.root,
      prompt: "prompt through stdin\nsecond line",
      timeoutMs: 5_000,
    });
    assert.equal(result.exit_code, 0);
    assert.equal(result.invalid_jsonl_lines, 0);
    assert.deepEqual(result.events.map((event) => event.type), ["started", "completed"]);
    assert.equal(result.events[1].prompt, "prompt through stdin\nsecond line");
    assert.ok(result.events[0].argv.includes("model & no-shell"));
    assert.equal(result.argv.includes("model & no-shell"), true);

    const failed = await runCodexExec({
      executable: process.execPath,
      args: [fixture.script, "nonzero"],
      cwd: fixture.root,
      prompt: "failure prompt",
      timeoutMs: 5_000,
    });
    assert.equal(failed.exit_code, 7);
    assert.equal(failed.events.at(-1).type, "completed");
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("bounded exec client enforces timeout, targeted termination, and output limits", async () => {
  const fixture = await fakeFixture();
  try {
    const timed = await runCodexExec({
      executable: process.execPath,
      args: [fixture.script, "timeout"],
      cwd: fixture.root,
      prompt: "timeout prompt",
      timeoutMs: 150,
      gracefulTerminationMs: 100,
    });
    assert.equal(timed.timed_out, true);
    assert.equal(processAlive(timed.pid), false);

    const controller = new AbortController();
    setTimeout(() => controller.abort(), 100);
    const interrupted = await runCodexExec({
      executable: process.execPath,
      args: [fixture.script, "timeout"],
      cwd: fixture.root,
      prompt: "interrupt prompt",
      timeoutMs: 5_000,
      gracefulTerminationMs: 100,
      signal: controller.signal,
    });
    assert.equal(interrupted.interrupted, true);
    assert.equal(processAlive(interrupted.pid), false);

    const stdoutLimited = await runCodexExec({
      executable: process.execPath,
      args: [fixture.script, "stdout-limit"],
      cwd: fixture.root,
      prompt: "limit prompt",
      timeoutMs: 5_000,
      gracefulTerminationMs: 100,
      maxStdoutBytes: 256,
    });
    assert.equal(stdoutLimited.stdout_limited, true);
    assert.equal(processAlive(stdoutLimited.pid), false);

    const stderrLimited = await runCodexExec({
      executable: process.execPath,
      args: [fixture.script, "stderr-limit"],
      cwd: fixture.root,
      prompt: "stderr prompt",
      timeoutMs: 5_000,
      maxStderrBytes: 64,
    });
    assert.equal(stderrLimited.exit_code, 0);
    assert.equal(stderrLimited.stderr_limited, true);
    assert.ok(Buffer.byteLength(stderrLimited.stderr) <= 64);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

async function fakeFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "codex-exec-v1-"));
  const script = path.join(root, "fake-exec.mjs");
  await writeFile(
    script,
    `const mode=process.argv[2];
const argv=process.argv.slice(3);
let prompt="";
process.stdin.setEncoding("utf8");
process.stdin.on("data",chunk=>prompt+=chunk);
process.stdin.on("end",()=>{
  console.log(JSON.stringify({type:"started",argv}));
  if(mode==="stdout-limit"){
    process.stdout.write(JSON.stringify({type:"payload",value:"x".repeat(65536)})+"\\n");
    setInterval(()=>{},1000);
    return;
  }
  if(mode==="stderr-limit") process.stderr.write("e".repeat(4096));
  console.log(JSON.stringify({type:"completed",prompt}));
  if(mode==="nonzero") process.exitCode=7;
  if(mode==="timeout"){
    process.on("SIGTERM",()=>{});
    setInterval(()=>{},1000);
  }
});
`,
    "utf8",
  );
  return { root, script };
}

function processAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
}
