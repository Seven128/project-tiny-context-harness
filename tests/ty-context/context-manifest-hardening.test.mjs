import assert from "node:assert/strict";
import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { runValidator } from "../../packages/ty-context/dist/lib/validators.js";
import {
  areaContext,
  baseManifest,
  createContextProject,
} from "./context-manifest-fixtures.mjs";

test("formal Context TOML rejects malformed syntax and unknown fields", async () => {
  await withProject(
    { manifest: `${baseManifest()}\ninvalid = [\n` },
    async (root) => {
      const report = await validate(root);
      assert.match(report.errors.join("\n"), /is not valid TOML/);
    },
  );
  await withProject(
    {
      manifest: `unexpected = true\n${baseManifest()}\nunknown_node_field = "x"\n`,
    },
    async (root) => {
      const report = await validate(root);
      assert.match(report.errors.join("\n"), /unknown field unexpected/);
      assert.match(
        report.errors.join("\n"),
        /unknown field unknown_node_field/,
      );
    },
  );
});

test("Context graph requires exactly one default Area", async () => {
  await withProject(
    { manifest: baseManifest().replace("default = true", "default = false") },
    async (root) => {
      const report = await validate(root);
      assert.match(
        report.errors.join("\n"),
        /exactly one.*default = true.*found 0/,
      );
    },
  );
});

test("Context graph rejects duplicate Area IDs and Context paths", async () => {
  const manifest = `${baseManifest()}

[[areas]]
id = "main"
root = "."
context = "project_context/areas/other.md"
default = false

[[context]]
path = "project_context/areas/main/verification.md"
role = "verification"
`;
  await withProject(
    {
      manifest,
      extraFiles: {
        "project_context/areas/other.md": areaContext("other"),
      },
    },
    async (root) => {
      const report = await validate(root);
      const errors = report.errors.join("\n");
      assert.match(errors, /duplicate area id: main/);
      assert.match(
        errors,
        /duplicate Context path: project_context\/areas\/main\/verification\.md/,
      );
    },
  );
});

test("Context graph rejects missing Area roots and default children", async () => {
  const manifest = baseManifest()
    .replace('root = "."', 'root = "missing-area-root"')
    .replace(
      'triggers = ["test"]',
      'triggers = ["test"]\ndefault_children = ["project_context/areas/main/missing.md"]',
    );
  await withProject({ manifest }, async (root) => {
    const report = await validate(root);
    const errors = report.errors.join("\n");
    assert.match(errors, /references missing area root: missing-area-root/);
    assert.match(
      errors,
      /default_children references unregistered Context path/,
    );
  });
});

test("Context Front Matter role and read policy must match the Manifest", async () => {
  const verification = `---
context_role: deployment
read_policy: optional
---
# Verification

## Verification Paths

- \`npm test\`
`;
  await withProject(
    {
      extraFiles: {
        "project_context/areas/main/verification.md": verification,
      },
    },
    async (root) => {
      const report = await validate(root);
      const errors = report.errors.join("\n");
      assert.match(
        errors,
        /context_role deployment does not match manifest role verification/,
      );
      assert.match(
        errors,
        /read_policy optional does not match manifest read_policy default/,
      );
    },
  );
});

test("unregistered Context Markdown is reported as a warning", async () => {
  await withProject(
    {
      extraFiles: {
        "project_context/areas/main/unregistered.md":
          areaContext("unregistered"),
      },
    },
    async (root) => {
      const report = await validate(root);
      assert.deepEqual(report.errors, []);
      assert.match(
        report.warnings?.join("\n") ?? "",
        /unregistered Context Markdown file/,
      );
    },
  );
});

test("Context graph rejects a symbolic-link escape from project_context", async () => {
  const outside = await mkdtemp(path.join(os.tmpdir(), "ty-context-outside-"));
  const outsideFile = path.join(outside, "outside.md");
  await writeFile(outsideFile, areaContext("outside"), "utf8");
  await withProject(
    {
      manifest: `${baseManifest()}

[[context]]
path = "project_context/areas/main/escape.md"
role = "foundation"
`,
    },
    async (root) => {
      const link = path.join(
        root,
        "project_context",
        "areas",
        "main",
        "escape.md",
      );
      await symlink(outsideFile, link, "file");
      const report = await validate(root);
      assert.match(
        report.errors.join("\n"),
        /symbolic link outside its allowed root/,
      );
    },
  );
  await rm(outside, { recursive: true, force: true });
});

test("Chinese fake verification claims are found in every verification-class section", async () => {
  const area = `# Area Context: main

## Responsibility

- Maintain durable package behavior facts.

## Verification

- \`npm test\`

## 验证

- 测试已通过。
`;
  await withProject(
    { extraFiles: { "project_context/areas/main.md": area } },
    async (root) => {
      const report = await validate(root);
      assert.match(
        report.errors.join("\n"),
        /must list verification entry points/,
      );
    },
  );
});

async function withProject(options, assertion) {
  const root = await createContextProject(options);
  try {
    await assertion(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function validate(root) {
  return runValidator(root, "validate-context");
}
