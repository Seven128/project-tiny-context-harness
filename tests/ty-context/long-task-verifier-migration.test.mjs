import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  cp,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  loadActiveLongTaskAuthority,
  readProgressRecords,
} from "../../packages/ty-context/dist/lib/long-task-state.js";
import {
  commitCandidate,
  createDeliveryFixture,
  parseCliJson,
  pathExists,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";

const exec = promisify(execFile);
const repository = fileURLToPath(new URL("../..", import.meta.url));
const sourcePackage = path.join(repository, "packages", "ty-context");
const dependencyRoot = path.join(repository, "node_modules");

test("Verifier relocation is automatic while content changes require approval", async () => {
  const packagesRoot = await mkdtemp(
    path.join(os.tmpdir(), "ty-context-verifier-packages-"),
  );
  const fixture = await createDeliveryFixture();
  try {
    const packageA = await copyPackage(packagesRoot, "package-a");
    const packageB = await copyPackage(packagesRoot, "package-b");
    const packageC = await copyPackage(packagesRoot, "package-c", {
      version: "0.6.0-relocated.0",
    });

    fixture.contract.outcomes[0].product.owner.path_globs.push(
      ".codex/hooks.json",
    );
    fixture.contract.outcomes[0].technical.allowed_support_paths.push(
      ".codex/hooks.json",
    );
    await writeContract(fixture.workdir, fixture.contract);
    await runPackageCli(packageA, fixture.root, ["enable", "long-task"]);
    const first = await runPackageCli(packageA, fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
    ]);
    await runPackageCli(packageA, fixture.root, [
      "long-task",
      "verify",
      fixture.workdir,
    ]);
    await commitCandidate(fixture.root);
    const accepted = await runPackageCli(packageA, fixture.root, [
      "long-task",
      "final-gate",
      fixture.workdir,
    ]);
    assert.equal(accepted.workflow_status, "machine_accepted");
    const initialBase = (
      await loadActiveLongTaskAuthority(fixture.root)
    ).authority.initial_task_base;

    await runPackageCli(packageB, fixture.root, ["enable", "long-task"]);
    await assertPackageFailure(
      packageB,
      fixture.root,
      ["long-task", "verify", fixture.workdir],
      /verifier_authority_migration_required/u,
    );
    await assertPackageFailure(
      packageB,
      fixture.root,
      ["long-task", "final-gate", fixture.workdir],
      /verifier_authority_migration_required/u,
    );
    await assertPackageFailure(
      packageB,
      fixture.root,
      ["long-task", "stop-check", fixture.workdir],
      /verifier_authority_migration_required/u,
    );
    await assertPackageFailure(
      packageB,
      fixture.root,
      ["long-task", "close", fixture.workdir],
      /verifier_authority_migration_required/u,
    );
    await assertPackageFailure(
      packageB,
      fixture.root,
      ["long-task", "compile", fixture.workdir],
      /authority_revision_requires_revise_flag/u,
    );
    const relocated = await runPackageCli(packageB, fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
      "--revise",
    ]);
    assert.equal(relocated.authority_revision, 2);
    let active = (
      await loadActiveLongTaskAuthority(fixture.root)
    ).authority;
    assert.equal(
      path.resolve(active.verifier_identity.package_root),
      path.resolve(packageB),
    );
    assert.deepEqual(active.initial_task_base, initialBase);
    assert.deepEqual(await readProgressRecords(fixture.workdir), {});
    assert.equal(
      await pathExists(
        path.join(fixture.workdir, ".ty-context", "final-receipt.json"),
      ),
      false,
    );

    await runPackageCli(packageC, fixture.root, ["enable", "long-task"]);
    await assertPackageFailure(
      packageC,
      fixture.root,
      ["long-task", "compile", fixture.workdir],
      /authority_revision_requires_revise_flag/u,
    );
    const versionRelocated = await runPackageCli(packageC, fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
      "--revise",
    ]);
    assert.equal(versionRelocated.authority_revision, 3);
    active = (await loadActiveLongTaskAuthority(fixture.root)).authority;
    assert.equal(
      active.verifier_identity.package_version,
      "0.6.0-relocated.0",
    );
    assert.deepEqual(active.initial_task_base, initialBase);

    for (const scenario of [
      {
        name: "bundle",
        mutate: async (packageRoot) => {
          const file = path.join(
            packageRoot,
            "dist",
            "lib",
            "long-task-status-projection.js",
          );
          await writeFile(
            file,
            `${await readFile(file, "utf8")}\n// verifier bundle change\n`,
          );
        },
        expectedFile: "lib/long-task-status-projection.js",
      },
      {
        name: "schema",
        mutate: async (packageRoot) => {
          const file = path.join(
            packageRoot,
            "dist",
            "schemas",
            "long-task-delivery-v2",
            "long-task-delivery-v2.schema.json",
          );
          const schema = JSON.parse(await readFile(file, "utf8"));
          schema.$comment = "verifier schema change";
          await writeFile(file, `${JSON.stringify(schema)}\n`);
        },
        expectedFile: "<schema>",
      },
      {
        name: "hook",
        mutate: async (packageRoot) => {
          const file = path.join(packageRoot, "dist", "long-task-hook.js");
          await writeFile(
            file,
            `${await readFile(file, "utf8")}\n// verifier hook change\n`,
          );
        },
        expectedFile: "<hook>",
      },
    ]) {
      const changedPackage = await copyPackage(
        packagesRoot,
        `package-${scenario.name}`,
      );
      await scenario.mutate(changedPackage);
      await runPackageCli(changedPackage, fixture.root, [
        "enable",
        "long-task",
      ]);
      await assertPackageFailure(
        changedPackage,
        fixture.root,
        ["long-task", "verify", fixture.workdir],
        /verifier_authority_migration_required/u,
      );
      await assertPackageFailure(
        changedPackage,
        fixture.root,
        ["long-task", "compile", fixture.workdir, "--revise"],
        /authority_change_requires_user_decision/u,
      );
      const pending = JSON.parse(
        await readFile(
          path.join(
            fixture.workdir,
            ".ty-context",
            "authority-revision-pending.json",
          ),
          "utf8",
        ),
      );
      assert.equal(pending.revision_diff.verifier_content_changed, true);
      assert.equal(
        pending.revision_diff.verifier_runtime_locator_changed,
        true,
      );
      assert.ok(
        pending.revision_diff.verifier_files_changed.includes(
          scenario.expectedFile,
        ),
      );
      assert.ok(
        pending.revision_diff.reduction_reasons.includes(
          "verifier_content_changed",
        ),
      );
      assert.equal(
        pending.revision_diff.previous_verifier.package_version,
        "0.6.0-relocated.0",
      );
      assert.ok(pending.revision_diff.next_verifier.package_version);

      await runPackageCli(packageC, fixture.root, ["enable", "long-task"]);
      await runPackageCli(packageC, fixture.root, [
        "long-task",
        "compile",
        fixture.workdir,
      ]);
    }

    assert.equal(first.authority_revision, 1);
    assert.deepEqual(
      (await loadActiveLongTaskAuthority(fixture.root)).authority
        .initial_task_base,
      initialBase,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
    await rm(packagesRoot, { recursive: true, force: true });
  }
});

async function copyPackage(root, name, options = {}) {
  const target = path.join(root, name);
  await cp(sourcePackage, target, {
    recursive: true,
    filter: (source) => path.basename(source) !== "node_modules",
  });
  await symlink(
    dependencyRoot,
    path.join(target, "node_modules"),
    process.platform === "win32" ? "junction" : "dir",
  );
  if (options.version) {
    const packageFile = path.join(target, "package.json");
    const packageJson = JSON.parse(await readFile(packageFile, "utf8"));
    packageJson.version = options.version;
    await writeFile(packageFile, `${JSON.stringify(packageJson, null, 2)}\n`);
  }
  return target;
}

async function runPackageCli(packageRoot, cwd, args) {
  const result = await exec(
    process.execPath,
    [path.join(packageRoot, "dist", "cli.js"), ...args],
    { cwd, windowsHide: true },
  );
  return parseCliJson(result.stdout);
}

async function assertPackageFailure(packageRoot, cwd, args, pattern) {
  await assert.rejects(
    () => runPackageCli(packageRoot, cwd, args),
    (error) => {
      assert.match(`${error.stdout ?? ""}\n${error.stderr ?? ""}`, pattern);
      return true;
    },
  );
}
