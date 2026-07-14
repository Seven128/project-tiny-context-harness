import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { MODEL_ROUTING_REASONS } from "../../packages/ty-context/dist/lib/codex-model-router.js";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

test("routing_reason_runtime_and_json_schemas_are_identical", async () => {
  const schemaRoot = path.join(
    repositoryRoot,
    "packages",
    "ty-context",
    "src",
    "schemas",
    "composite-v5",
  );
  const [campaign, goalV2, goalV3] = await Promise.all(
    [
      "composite-campaign-v5.schema.json",
      "slice-goal-manifest-v2.schema.json",
      "slice-goal-manifest-v3.schema.json",
    ].map(async (name) =>
      JSON.parse(await readFile(path.join(schemaRoot, name), "utf8")),
    ),
  );
  const expected = [...MODEL_ROUTING_REASONS].sort();
  const schemaEnums = [
    campaign.$defs.thread.properties.routing_reason.oneOf.find(
      (candidate) => Array.isArray(candidate.enum),
    ).enum,
    campaign.$defs.routingDecision.properties.reason.enum,
    goalV2.$defs.routingReason.enum,
    goalV3.$defs.routingReason.enum,
  ];
  for (const actual of schemaEnums)
    assert.deepEqual([...actual].sort(), expected);
});
