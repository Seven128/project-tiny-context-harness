import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseLongTaskSources } from "../../packages/ty-context/dist/lib/long-task-contract-parser.js";
import { writeHappyContract } from "./long-task-v2-fixtures.mjs";

async function rejects(id, transform, pattern) {
  const root = await mkdtemp(path.join(os.tmpdir(), `ltw-${id}-`)); const workdir = await writeHappyContract(root); const file = path.join(workdir, "product-architecture-source.yaml"); const source = await readFile(file, "utf8"); await writeFile(file, transform(source)); await assert.rejects(() => parseLongTaskSources(workdir), pattern);
}

test("yaml_duplicate_key", () => rejects("dup", (s) => `${s}product_goal: duplicate\n`, /unique|duplicate/i));
test("yaml_anchor_alias", () => rejects("alias", (s) => s.replace('product_goal: Deliver the capability', 'product_goal: &goal Deliver the capability').replace('observable_outcome: Oracle observes success', 'observable_outcome: *goal'), /anchor|alias/i));
test("yaml_merge_key", () => rejects("merge", (s) => `${s}<<: {extra: true}\n`, /merge|unknown|key/i));
test("yaml_custom_tag", () => rejects("tag", (s) => s.replace('product_goal: Deliver the capability', 'product_goal: !evil Deliver the capability'), /tag/i));
test("yaml_multi_document", () => rejects("multi", (s) => `${s}---\nschema_version: product-source-v2\n`, /exactly one|multiple/i));
test("Markdown input is rejected", () => rejects("md", () => "# Product\nThis is not YAML.\n", /YAML, not Markdown/i));
test("unknown field is rejected", () => rejects("unknown", (s) => `${s}agent_status: complete\n`, /unknown field/i));
test("malformed stable ID is rejected", () => rejects("stable-id", (s) => s.replace("id: PR-001","id: pr-001"), /invalid stable ID/i));
