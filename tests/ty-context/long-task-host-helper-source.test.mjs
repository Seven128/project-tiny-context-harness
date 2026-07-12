import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const host = path.join(root, "host", "ty-context-host-helper");

test("Rust Host helper pins its toolchain and stable responsibility modules", async () => {
  const toolchain = await readFile(path.join(root, "rust-toolchain.toml"), "utf8");
  assert.match(toolchain, /channel\s*=\s*"stable-x86_64-pc-windows-gnullvm"/);
  assert.match(await readFile(path.join(root, "rust-toolchain.lock"), "utf8"), /version=1\.97\.0[\s\S]*host=x86_64-pc-windows-gnullvm/);
  assert.match(await readFile(path.join(root, ".cargo", "config.toml"), "utf8"), /crt-static/);
  const cargo = await readFile(path.join(host, "Cargo.toml"), "utf8");
  assert.match(cargo, /name\s*=\s*"ty-context-host-helper"/);
  assert.match(cargo, /name\s*=\s*"ty-context-host-admin"/);
  assert.match(cargo, /name\s*=\s*"ty-context-host-installer-ui"/);
  assert.doesNotMatch(cargo, /version\s*=\s*"\*"/);
  await readFile(path.join(host, "Cargo.lock"));
  for (const module of ["rpc", "identity", "registry", "journal", "attestation", "service", "sandbox", "sandbox_launcher", "secret", "cache", "admin", "installer_ui"]) {
    const content = await readFile(path.join(host, "src", `${module}.rs`), "utf8");
    assert.ok(content.trim().length > 0, module);
  }
  for (const file of await rustFiles(path.join(host, "src"))) {
    const lines = (await readFile(file, "utf8")).split(/\r?\n/u).length - 1;
    assert.ok(lines <= 300, `${path.relative(host, file)}: ${lines} physical lines exceeds 300`);
  }
});

async function rustFiles(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await rustFiles(file));
    else if (entry.isFile() && entry.name.endsWith(".rs")) result.push(file);
  }
  return result;
}
