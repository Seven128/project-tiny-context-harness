import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { preflightDesignResourceHandoff } from "../../packages/ty-context/dist/index.js";
import { DESIGN_RESOURCE_DIMENSIONS } from "../../packages/ty-context/dist/lib/design-resource-handoff-types.js";
import {
  DESIGN_HANDOFF_PATH,
  DESIGN_RESOURCE_PATH,
  writeDesignResourceHandoff,
  writeDesignResourceHandoffFixture,
} from "./design-resource-handoff-fixture.mjs";

const exec = promisify(execFile);
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const cli = path.join(repo, "packages", "ty-context", "dist", "cli.js");

test("one strict handoff preflight closes all eight dimensions and serves the CLI", async () => {
  await withFixture(async (root) => {
    const result = await preflightDesignResourceHandoff(
      root,
      DESIGN_HANDOFF_PATH,
    );
    assert.equal(result.status, "ready");
    assert.equal(result.counts.subjects, 1);
    assert.equal(result.counts.coverage, 8);
    assert.deepEqual(
      result.handoff.coverage.map((row) => row.dimension).sort(),
      [...DESIGN_RESOURCE_DIMENSIONS].sort(),
    );

    const { stdout } = await exec(
      process.execPath,
      [cli, "design-resource", "preflight", DESIGN_HANDOFF_PATH, "--json"],
      { cwd: root },
    );
    const reported = JSON.parse(stdout);
    assert.equal(reported.status, "ready");
    assert.equal(reported.handoff.targets[0].key, "main-default");
  });
});

test("missing, duplicate, unresolved and unknown coverage fail closed", async () => {
  for (const [mutate, expected] of [
    [
      (handoff) => handoff.coverage.pop(),
      /coverage_pair_missing:surface\.main:assets/u,
    ],
    [
      (handoff) => handoff.coverage.push(structuredClone(handoff.coverage[0])),
      /coverage_key_duplicate|coverage_pair_duplicate/u,
    ],
    [
      (handoff) => {
        const row = handoff.coverage.find((item) => item.dimension === "motion");
        row.disposition = "decision_required";
        row.target_refs = [];
        row.condition_refs = [];
        row.evidence_refs = [];
        row.verification_methods = [];
      },
      /unresolved_coverage:coverage\.motion/u,
    ],
    [
      (handoff) => {
        handoff.unknown_future_semantics = true;
      },
      /unknown keys: unknown_future_semantics/u,
    ],
  ]) {
    await withFixture(async (root, handoff) => {
      mutate(handoff);
      await writeDesignResourceHandoff(root, handoff);
      await assert.rejects(
        preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
        expected,
      );
    });
  }
});

test("a static frame cannot substitute for motion or accessibility evidence", async () => {
  for (const dimension of ["motion", "accessibility"]) {
    await withFixture(async (root, handoff) => {
      const row = handoff.coverage.find((item) => item.dimension === dimension);
      row.evidence_refs = ["frame-main"];
      await writeDesignResourceHandoff(root, handoff);
      await assert.rejects(
        preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
        new RegExp(
          `coverage_evidence_kind_incompatible:coverage\\.${dimension}:${dimension}:frame-main:frame`,
          "u",
        ),
      );
    });
  }
});

test("resource mutation and unknown Source items invalidate the handoff", async () => {
  await withFixture(async (root) => {
    await writeFile(path.join(root, DESIGN_RESOURCE_PATH), "changed\n");
    await assert.rejects(
      preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
      /resource_digest_mismatch:resource\.main/u,
    );
  });
  await withFixture(async (root, handoff) => {
    handoff.coverage[0].source_item_refs = ["missing-source-item"];
    await writeDesignResourceHandoff(root, handoff);
    await assert.rejects(
      preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
      /source_item_ref_unknown:missing-source-item/u,
    );
  });
});

test("repository paths, scoped surfaces and design Source kinds remain fail closed", async () => {
  await withFixture(async (root, handoff) => {
    handoff.resources[0].path = "../outside.html";
    await writeDesignResourceHandoff(root, handoff);
    await assert.rejects(
      preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
      /unsafe_path:design_resource_handoff\.resources\[0\]\.path/u,
    );
  });
  await withFixture(async (root, handoff) => {
    handoff.scope.surface_keys = ["surface.unaccounted"];
    await writeDesignResourceHandoff(root, handoff);
    await assert.rejects(
      preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
      /scope_surface_subject_missing:surface\.unaccounted/u,
    );
  });
  await withFixture(async (root) => {
    const file = path.join(root, DESIGN_HANDOFF_PATH);
    const content = await readFile(file, "utf8");
    await writeFile(
      file,
      content.replace("kind=requirement", "kind=non_goal"),
    );
    await assert.rejects(
      preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
      /design_source_item_kind_unsupported:design-main:non_goal/u,
    );
  });
});

test("the embedded YAML is unique and remains readable ordinary Markdown Source", async () => {
  await withFixture(async (root) => {
    const file = path.join(root, DESIGN_HANDOFF_PATH);
    const content = await readFile(file, "utf8");
    await writeFile(file, `${content}\n${content}`);
    await assert.rejects(
      preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
      /block_count:design\/handoff\.md:2/u,
    );
  });
});

async function withFixture(action) {
  const root = await mkdtemp(path.join(os.tmpdir(), "design-handoff-"));
  try {
    const { handoff } = await writeDesignResourceHandoffFixture(root);
    await action(root, handoff);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
