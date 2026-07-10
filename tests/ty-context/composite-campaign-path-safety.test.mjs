import test from "node:test";
import assert from "node:assert/strict";
import { lstat, mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  assertCompositeCampaignPathSafe,
  formatCompositeCampaignRevision,
  resolveCompositeCampaignBasePaths,
  resolveCompositeCampaignPaths,
  validateCompositeCampaignId,
  validateCompositeSfcId
} from "../../packages/ty-context/dist/lib/composite-campaign-paths.js";

test("the hardened base resolver does not need a fake campaign ID or create missing directories", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ty-campaign-base-"));
  try {
    await writeFile(path.join(root, "package.json"), JSON.stringify({ tyContext: { harnessFolderName: ".custom-harness" } }), "utf8");
    const resolved = await resolveCompositeCampaignBasePaths(root);
    assert.equal(resolved.project_root, root);
    assert.equal(resolved.harness_root, path.join(root, ".custom-harness"));
    assert.equal(resolved.campaigns_root, path.join(root, ".custom-harness", "composite-long-task", "campaigns"));
    await assert.rejects(lstat(resolved.harness_root), /ENOENT/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("configured harness root produces the canonical campaign layout", async () => {
  const root = await projectFixture();
  try {
    const paths = await resolveCompositeCampaignPaths(root, "campaign-1");
    assert.equal(paths.harness_root, path.join(root, ".custom-harness"));
    assert.equal(paths.campaigns_root, path.join(root, ".custom-harness", "composite-long-task", "campaigns"));
    assert.equal(paths.campaign_root, path.join(paths.campaigns_root, "campaign-1"));
    assert.equal(paths.manifest_path, path.join(paths.campaign_root, "campaign.yaml"));
    assert.equal(paths.request_path, path.join(paths.campaign_root, "request.md"));
    assert.equal(paths.events_path, path.join(paths.campaign_root, "events.ndjson"));
    const revisionRoot = path.join(paths.campaign_root, "slices", "SFC-001", "revisions", "0001");
    assert.equal(paths.revision_path("SFC-001", 1), revisionRoot);
    assert.deepEqual(paths.revision_files("SFC-001", 1), {
      authoring_packet: path.join(revisionRoot, "authoring-packet.json"),
      product_architecture_source: path.join(revisionRoot, "product-architecture-source.md"),
      technical_realization_plan: path.join(revisionRoot, "technical-realization-plan.md"),
      acceptance_checklist: path.join(revisionRoot, "acceptance-checklist.md")
    });
    assert.equal("binding_path" in paths, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("campaign, SFC, and revision components are canonical", () => {
  assert.equal(validateCompositeCampaignId("a0._-z"), "a0._-z");
  assert.equal(validateCompositeSfcId("SFC-001"), "SFC-001");
  assert.equal(formatCompositeCampaignRevision(1), "0001");
  assert.equal(formatCompositeCampaignRevision(9999), "9999");
  assert.throws(() => validateCompositeSfcId("sfc-001"), /SFC-###/i);
  assert.throws(() => validateCompositeSfcId("SFC-000"), /SFC-###|positive/i);
  assert.throws(() => validateCompositeSfcId("SFC-1000"), /SFC-###/i);
  assert.throws(() => formatCompositeCampaignRevision(0), /positive|revision/i);
  assert.throws(() => formatCompositeCampaignRevision(10000), /four-digit|revision/i);
  assert.equal(validateCompositeCampaignId(`a${"b".repeat(63)}`).length, 64);
  assert.throws(() => validateCompositeCampaignId(`a${"b".repeat(64)}`), /campaign id|64|length/i);
});

test("campaign IDs reject traversal, separators, absolute/drive/UNC, ADS, invalid/control, and trailing dot/space", () => {
  const invalid = [
    ".", "..", "../x", "x/y", "x\\y", "/rooted", "\\rooted", "C:\\rooted", "C:relative",
    "\\\\server\\share", "//server/share", "name:stream", "bad<name", "bad>name", 'bad"name',
    "bad|name", "bad?name", "bad*name", "bad\u0000name", "bad\u001fname", "trailing.", "trailing ",
    "-leading", "UPPER", ""
  ];
  for (const candidate of invalid) {
    assert.throws(() => validateCompositeCampaignId(candidate), /campaign id|unsafe|component/i, candidate);
  }
});

test("all Windows reserved families are rejected case-insensitively with extensions", () => {
  const reserved = [
    "CON", "PRN", "AUX", "NUL", "CLOCK$", "CONIN$", "CONOUT$",
    ...range("COM"), ...range("LPT"),
    ...superscriptRange("COM"), ...superscriptRange("LPT")
  ];
  for (const name of reserved) {
    for (const candidate of [name, name.toLowerCase(), `${mixedCase(name)}.txt`]) {
      assert.throws(() => validateCompositeCampaignId(candidate), /reserved|device/i, candidate);
    }
  }
});

test("a supplied campaign path must be the exact direct child of the configured base", async () => {
  const root = await projectFixture();
  try {
    const base = path.join(root, ".custom-harness", "composite-long-task", "campaigns");
    const exact = path.join(base, "campaign-1");
    assert.equal((await resolveCompositeCampaignPaths(root, "campaign-1", exact)).campaign_root, exact);
    if (process.platform === "win32") {
      const parentCaseVariant = exact.replace(".custom-harness", ".CUSTOM-HARNESS");
      assert.equal((await resolveCompositeCampaignPaths(root, "campaign-1", parentCaseVariant)).campaign_root, exact);
    }
    await assert.rejects(resolveCompositeCampaignPaths(root, "campaign-1", path.join(base, "campaign-1", "nested")), /direct child|campaign path/i);
    await assert.rejects(resolveCompositeCampaignPaths(root, "campaign-1", path.join(root, "campaign-1")), /direct child|campaign path|containment/i);
    await assert.rejects(resolveCompositeCampaignPaths(root, "campaign-1", path.join(base, "other")), /campaign id|direct child/i);
    const nearPrefix = path.join(root, ".custom-harness", "composite-long-task", "campaigns-evil", "campaign-1");
    await mkdir(nearPrefix, { recursive: true });
    await assert.rejects(assertCompositeCampaignPathSafe(root, nearPrefix), /campaign base|containment|outside/i);
    await assert.rejects(assertCompositeCampaignPathSafe(root, path.join(root, "ordinary-outside")), /campaign base|containment|outside/i);
    await assert.doesNotReject(assertCompositeCampaignPathSafe(root, exact));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the complete campaign-relative target rejects unsafe portable components at every depth", async () => {
  const root = await projectFixture();
  try {
    const base = path.join(root, ".custom-harness", "composite-long-task", "campaigns");
    const unsafeTargets = [
      ["CON"],
      ["safe-campaign", "PRN.txt"],
      ["safe-campaign", "slices", "AUX"],
      ["safe-campaign", "slices", "SFC-001", "NUL.json"],
      ["safe-campaign", "slices", "SFC-001", "revisions", "CLOCK$"],
      ["safe-campaign", "slices", "SFC-001", "revisions", "CONIN$.log"],
      ["safe-campaign", "slices", "SFC-001", "revisions", "conout$.TXT"],
      ["safe-campaign", "slices", "SFC-001", "revisions", "COM1.log"],
      ["safe-campaign", "slices", "SFC-001", "revisions", "COM².log"],
      ["safe-campaign", "slices", "SFC-001", "revisions", "0001", "LPT9"],
      ["safe-campaign", "slices", "SFC-001", "revisions", "0001", "lPt³.TxT"],
      ["safe-campaign", "slices", "SFC-001", "revisions", "0001", "name:stream"],
      ["safe-campaign", "slices", "SFC-001", "revisions", "0001", "bad?name"],
      ["safe-campaign", "slices", "SFC-001", "revisions", "0001", "bad\u0001name"],
      ["safe-campaign", "slices", "SFC-001", "revisions", "0001", "trailing."],
      ["safe-campaign", "slices", "SFC-001", "revisions", "0001", "trailing "]
    ];
    for (const components of unsafeTargets) {
      await assert.rejects(
        assertCompositeCampaignPathSafe(root, path.join(base, ...components)),
        /campaign path|unsafe|reserved|component|device/i,
        components.join("/")
      );
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("existing symlink and junction components are rejected for inside and escaping targets", async (t) => {
  const root = await projectFixture();
  try {
    const base = path.join(root, ".custom-harness", "composite-long-task", "campaigns");
    const realCampaign = path.join(base, "real-campaign");
    await mkdir(path.join(realCampaign, "slices", "SFC-001", "revisions", "0001"), { recursive: true });
    await writeFile(path.join(realCampaign, "slices", "SFC-001", "revisions", "0001", "authoring-packet.json"), "{}\n", "utf8");

    const linkedCampaign = path.join(base, "linked-campaign");
    await symlink(realCampaign, linkedCampaign, directoryLinkType());
    await assert.rejects(
      assertCompositeCampaignPathSafe(root, path.join(linkedCampaign, "slices", "SFC-001", "revisions", "0001")),
      /symbolic link|junction|link/i
    );

    const outsideDirectory = path.join(root, "outside-directory");
    await mkdir(outsideDirectory, { recursive: true });
    const escapingCampaign = path.join(base, "escaping-campaign");
    await symlink(outsideDirectory, escapingCampaign, directoryLinkType());
    await assert.rejects(assertCompositeCampaignPathSafe(root, escapingCampaign), /symbolic link|junction|link|containment/i);

    if (process.platform === "win32") {
      const directorySymlink = path.join(base, "directory-symlink");
      try {
        await symlink(realCampaign, directorySymlink, "dir");
        await assert.rejects(assertCompositeCampaignPathSafe(root, directorySymlink), /symbolic link|junction|link/i);
      } catch (error) {
        if (error?.code !== "EPERM") throw error;
        t.diagnostic("Windows directory symlink privilege unavailable; junction path remains covered");
      }
    }

    const linkedRevision = path.join(realCampaign, "slices", "SFC-001", "revisions", "0002");
    await symlink(path.join(realCampaign, "slices", "SFC-001", "revisions", "0001"), linkedRevision, directoryLinkType());
    await assert.rejects(assertCompositeCampaignPathSafe(root, linkedRevision), /symbolic link|junction|link/i);

    const escapingRevision = path.join(realCampaign, "slices", "SFC-001", "revisions", "0003");
    await symlink(outsideDirectory, escapingRevision, directoryLinkType());
    await assert.rejects(assertCompositeCampaignPathSafe(root, escapingRevision), /symbolic link|junction|link|containment/i);

    const linkedLeaf = path.join(realCampaign, "slices", "SFC-001", "revisions", "linked.json");
    await symlink(path.join(realCampaign, "slices", "SFC-001", "revisions", "0001", "authoring-packet.json"), linkedLeaf, "file");
    await assert.rejects(assertCompositeCampaignPathSafe(root, linkedLeaf), /symbolic link|junction|link/i);

    const outsideFile = path.join(root, "outside-file.json");
    await writeFile(outsideFile, "{}\n", "utf8");
    const escapingLeaf = path.join(realCampaign, "slices", "SFC-001", "revisions", "escaping.json");
    await symlink(outsideFile, escapingLeaf, "file");
    await assert.rejects(assertCompositeCampaignPathSafe(root, escapingLeaf), /symbolic link|junction|link|containment/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("configured harness paths must resolve inside the real project root", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ty-campaign-root-"));
  const outside = await mkdtemp(path.join(os.tmpdir(), "ty-campaign-outside-"));
  try {
    await writeFile(path.join(root, "package.json"), JSON.stringify({ tyContext: { harnessFolderName: ".linked-harness" } }), "utf8");
    await symlink(outside, path.join(root, ".linked-harness"), directoryLinkType());
    await assert.rejects(resolveCompositeCampaignPaths(root, "campaign-1"), /configured harness|symbolic link|junction|containment/i);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

test("project and existing campaign root components must be directories", async () => {
  const fileRoot = await mkdtemp(path.join(os.tmpdir(), "ty-campaign-file-root-"));
  try {
    const packageFile = path.join(fileRoot, "package.json");
    await writeFile(packageFile, "{}\n", "utf8");
    await assert.rejects(
      resolveCompositeCampaignPaths(packageFile, "campaign-1"),
      /project root.*existing directory|must be.*directory/i
    );
  } finally {
    await rm(fileRoot, { recursive: true, force: true });
  }

  for (const [label, fileComponents] of [
    ["configured harness", [".custom-harness"]],
    ["composite root", [".custom-harness", "composite-long-task"]],
    ["campaigns root", [".custom-harness", "composite-long-task", "campaigns"]]
  ]) {
    const root = await mkdtemp(path.join(os.tmpdir(), "ty-campaign-file-component-"));
    try {
      await writeFile(path.join(root, "package.json"), JSON.stringify({ tyContext: { harnessFolderName: ".custom-harness" } }), "utf8");
      const filePath = path.join(root, ...fileComponents);
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, "not-a-directory\n", "utf8");
      await assert.rejects(
        resolveCompositeCampaignPaths(root, "campaign-1"),
        /configured harness|composite-long-task|campaigns|directory|component/i,
        label
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }

  const nestedUnderFile = await mkdtemp(path.join(os.tmpdir(), "ty-campaign-nested-file-component-"));
  try {
    await writeFile(
      path.join(nestedUnderFile, "package.json"),
      JSON.stringify({ tyContext: { harnessFolderName: "parent-file/nested" } }),
      "utf8"
    );
    await writeFile(path.join(nestedUnderFile, "parent-file"), "not-a-directory\n", "utf8");
    await assert.rejects(
      resolveCompositeCampaignPaths(nestedUnderFile, "campaign-1"),
      /configured harness|directory|component|ENOTDIR/i
    );
  } finally {
    await rm(nestedUnderFile, { recursive: true, force: true });
  }
});

test("campaign roots and non-leaf ancestors must be directories while regular leaf files remain safe", async () => {
  const root = await projectFixture();
  try {
    const initial = await resolveCompositeCampaignPaths(root, "campaign-1");
    await mkdir(initial.campaigns_root, { recursive: true });
    await writeFile(initial.campaign_root, "not-a-directory\n", "utf8");

    await assert.rejects(
      resolveCompositeCampaignPaths(root, "campaign-1"),
      /campaign.*root|directory|non-directory|component/i
    );
    await assert.rejects(
      assertCompositeCampaignPathSafe(root, path.join(initial.campaign_root, "request.md")),
      /campaign path|directory|non-directory|component|ENOTDIR/i
    );

    await rm(initial.campaign_root, { force: true });
    await mkdir(initial.campaign_root, { recursive: true });
    const regularLeaf = path.join(initial.campaign_root, "request.md");
    await writeFile(regularLeaf, "ordinary request\n", "utf8");
    assert.equal(await assertCompositeCampaignPathSafe(root, regularLeaf), regularLeaf);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("campaign-specific path safety rejects unsafe configured harness components without changing generic config compatibility", async () => {
  for (const harnessFolderName of [
    "CON", "CONIN$", "conout$.txt", "COM¹", "nested/LPT².log",
    "bad.", "name:stream", "nested/PRN.txt"
  ]) {
    const root = await mkdtemp(path.join(os.tmpdir(), "ty-campaign-unsafe-harness-"));
    try {
      await writeFile(path.join(root, "package.json"), JSON.stringify({ tyContext: { harnessFolderName } }), "utf8");
      await assert.rejects(resolveCompositeCampaignPaths(root, "campaign-1"), /configured harness|reserved|unsafe|component/i, harnessFolderName);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test("a configured harness link is rejected even when its target remains inside the project", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ty-campaign-contained-harness-"));
  try {
    const realHarness = path.join(root, ".real-harness");
    await mkdir(path.join(realHarness, "composite-long-task", "campaigns"), { recursive: true });
    await writeFile(path.join(root, "package.json"), JSON.stringify({ tyContext: { harnessFolderName: ".linked-harness" } }), "utf8");
    await symlink(realHarness, path.join(root, ".linked-harness"), directoryLinkType());
    await assert.rejects(resolveCompositeCampaignPaths(root, "campaign-1"), /configured harness|symbolic link|junction|link/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function projectFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "ty-campaign-path-"));
  await writeFile(path.join(root, "package.json"), JSON.stringify({ tyContext: { harnessFolderName: ".custom-harness" } }), "utf8");
  await mkdir(path.join(root, ".custom-harness", "composite-long-task", "campaigns"), { recursive: true });
  return root;
}

function range(prefix) {
  return Array.from({ length: 9 }, (_, index) => `${prefix}${index + 1}`);
}

function superscriptRange(prefix) {
  return ["¹", "²", "³"].map((digit) => `${prefix}${digit}`);
}

function mixedCase(value) {
  return [...value].map((char, index) => index % 2 ? char.toLowerCase() : char.toUpperCase()).join("");
}

function directoryLinkType() {
  return process.platform === "win32" ? "junction" : "dir";
}
