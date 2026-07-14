import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

test("context_change_before_goal_reauthors_packet", async () => {
  const source = await readFile(
    path.join(
      repo,
      "packages/ty-context/src/lib/composite-campaign-orchestrator.ts",
    ),
    "utf8",
  );
  assert.match(source, /campaign_context_changed:/);
  assert.match(source, /packet_context_changed/);
  assert.match(source, /action:\s*"author_packets"/);
  assert.match(source, /status = "packet_pending"/);
});
