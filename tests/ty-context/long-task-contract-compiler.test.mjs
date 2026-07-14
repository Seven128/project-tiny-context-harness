import test from "node:test";
import assert from "node:assert/strict";
import { appendFile, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  compileLongTaskContract,
  assertLongTaskContractFresh,
} from "../../packages/ty-context/dist/lib/long-task-contract-compiler.js";
import { writeHappyV3Contract } from "./long-task-v3-fixtures.mjs";

async function compiled() {
  const root = await mkdtemp(path.join(os.tmpdir(), "ltw-compiler-"));
  const workdir = await writeHappyV3Contract(root);
  return {
    root,
    workdir,
    contract: await compileLongTaskContract(workdir, root),
  };
}
test("source_changed_after_compile", async () => {
  const x = await compiled();
  await appendFile(
    path.join(x.workdir, "product-architecture-source.yaml"),
    "# drift\n",
  );
  await assert.rejects(
    () => assertLongTaskContractFresh(x.contract),
    /source_changed_after_compile/,
  );
});
test("context_changed_after_compile", async () => {
  const x = await compiled();
  await appendFile(
    path.join(x.root, "project_context/context.toml"),
    "# drift\n",
  );
  await assert.rejects(
    () => assertLongTaskContractFresh(x.contract),
    /context_changed_after_compile/,
  );
});
test("context_change_after_compile_invalidates_contract", async () => {
  const x = await compiled();
  await appendFile(
    path.join(x.root, "project_context/context.toml"),
    "# drift again\n",
  );
  await assert.rejects(
    () => assertLongTaskContractFresh(x.contract),
    /context_changed_after_compile/,
  );
});
test("referenced_context_change_invalidates_contract", async () => {
  const x = await compiled();
  assert.equal(x.contract.context_snapshot_mode, "referenced");
  assert.match(x.contract.context_graph_sha256, /^[a-f0-9]{64}$/);
  await appendFile(
    path.join(x.root, "project_context/global.md"),
    "\n- referenced drift\n",
  );
  await assert.rejects(
    () => assertLongTaskContractFresh(x.contract),
    /context_changed_after_compile:project_context\/global\.md/,
  );
});
test("unrelated_context_change_does_not_invalidate_referenced_mode", async () => {
  const x = await compiled();
  await appendFile(
    path.join(x.root, "project_context/areas/main.md"),
    "\n- unrelated implementation note\n",
  );
  await assert.doesNotReject(() => assertLongTaskContractFresh(x.contract));
});
test("full_context_mode_invalidates_on_any_context_change", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ltw-full-context-"));
  const workdir = await writeHappyV3Contract(root, (data) => {
    data.product.context_snapshot_mode = "full";
  });
  const contract = await compileLongTaskContract(workdir, root);
  assert.equal(contract.context_snapshot_mode, "full");
  await appendFile(
    path.join(root, "project_context/areas/main.md"),
    "\n- full-mode drift\n",
  );
  await assert.rejects(
    () => assertLongTaskContractFresh(contract),
    /context_changed_after_compile:project_context\/areas\/main\.md/,
  );
});
test("oracle_changed_after_compile", async () => {
  const x = await compiled();
  await appendFile(
    path.join(x.root, "tests/acceptance/oracle.mjs"),
    "// drift\n",
  );
  await assert.rejects(
    () => assertLongTaskContractFresh(x.contract),
    /oracle_changed_after_compile/,
  );
});
test("compiled_contract_rewritten", async () => {
  const x = await compiled();
  const file = path.join(x.workdir, "compiled-contract.json");
  const value = JSON.parse(await readFile(file, "utf8"));
  value.requirements = [];
  await writeFile(file, JSON.stringify(value));
  await assert.rejects(async () => {
    const { readCompiledLongTaskContract } =
      await import("../../packages/ty-context/dist/lib/long-task-contract-compiler.js");
    await readCompiledLongTaskContract(x.workdir);
  }, /integrity mismatch/);
});
test("active workdir cannot be declared as product implementation", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ltw-workdir-binding-"));
  const workdir = await writeHappyV3Contract(root, (data) => {
    data.plan.plan_items[0].obligations[0].implementation_bindings[0].kind =
      "path_glob";
    data.plan.plan_items[0].obligations[0].implementation_bindings[0].target =
      "task/**";
  });
  await assert.rejects(
    compileLongTaskContract(workdir, root),
    /protected_path_declared:active_workdir/,
  );
});
