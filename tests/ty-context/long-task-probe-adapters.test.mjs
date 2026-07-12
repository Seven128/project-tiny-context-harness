import test from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { access, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { runHostEnvironmentProbeAdapter } from "../../packages/ty-context/dist/lib/long-task-probe-adapters.js";

test("filesystem permission adapter observes the frozen path without reading its contents", async () => {
  const target = path.resolve("package.json");
  const probe = frozen("ENV-PROBE-PERMISSION", "permission", "filesystem_permission", `read:${target}`, { adapter: "filesystem_permission", access: "read", path: target });
  const result = await runHostEnvironmentProbeAdapter(probe, process.cwd(), 1_000, "salt");
  assert.equal(result.exit_code, 0);
  assert.equal(result.error_code, null);
  assert.equal(result.stdout.length + result.stderr.length, 0);
});

test("credential adapter asks the real OS provider but never returns a secret value", async () => {
  const ref = `HFC012_MISSING_${randomUUID().replaceAll("-", "").toUpperCase()}`;
  const provider = process.platform === "win32" ? "windows-credential-manager" : process.platform === "darwin" ? "macos-keychain" : "secret-service";
  const probe = frozen("ENV-PROBE-CREDENTIAL", "secret_ref", "credential_store", ref, { adapter: "credential_store", provider, secret_ref: ref });
  const result = await runHostEnvironmentProbeAdapter(probe, process.cwd(), 5_000, "salt");
  assert.equal(result.exit_code, 1);
  assert.match(result.error_code ?? "", /credential_unavailable|secret_provider_unavailable/u);
  assert.equal(result.stdout.length + result.stderr.length, 0);
});

test("CLI auth adapter executes only the integrity-pinned gh descriptor", async (context) => {
  const executable = await findExecutable(process.platform === "win32" ? "gh.exe" : "gh");
  if (!executable) { context.skip("gh is not installed on this platform image"); return; }
  const bytes = await readFile(executable);
  const descriptor = { adapter: "cli_auth", executable_path: executable, executable_sha256: createHash("sha256").update(bytes).digest("hex"), argv: ["auth", "status"] };
  const probe = frozen("ENV-PROBE-CLI", "host_capability", "cli_auth", "gh", descriptor);
  const result = await runHostEnvironmentProbeAdapter(probe, process.cwd(), 5_000, "salt");
  assert.ok([0, 1].includes(result.exit_code));
  if (result.exit_code === 0) assert.equal(result.error_code, null);
  else assert.match(result.error_code ?? "", /mfa_required|credential_unavailable|permission_denied|cli_auth_failed/u);
});

function frozen(id, kind, adapter, target, descriptor) { return { id, kind, adapter, target, timeout_ms: 1_000, expected: { exit_codes: [0], error_codes: [] }, artifact_globs: [], environment_refs: adapter === "credential_store" ? [target] : [], normalized_sha256: "0".repeat(64), descriptor }; }
async function findExecutable(name) { for (const directory of (process.env.PATH ?? process.env.Path ?? "").split(path.delimiter)) { const candidate = path.resolve(directory || ".", name); try { await access(candidate); return await realpath(candidate); } catch {} } return null; }
