import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { npmCommandSpec } from "../../tools/npm_command_spec.mjs";

test("Windows npm subprocesses are routed through ComSpec", () => {
  assert.deepEqual(
    npmCommandSpec(["--version"], {
      platform: "win32",
      environment: { ComSpec: "C:\\Windows\\System32\\cmd.exe" },
    }),
    {
      command: "C:\\Windows\\System32\\cmd.exe",
      args: ["/d", "/s", "/c", "npm", "--version"],
    },
  );
});

test("POSIX npm subprocesses remain direct", () => {
  assert.deepEqual(
    npmCommandSpec(["--version"], { platform: "linux", environment: {} }),
    { command: "npm", args: ["--version"] },
  );
});

test(
  "the Windows npm command spec launches a real npm subprocess",
  { skip: process.platform !== "win32" },
  () => {
    const spec = npmCommandSpec(["--version"]);
    const result = spawnSync(spec.command, spec.args, {
      encoding: "utf8",
      windowsHide: true,
    });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout.trim(), /^\d+\.\d+\.\d+/u);
  },
);
