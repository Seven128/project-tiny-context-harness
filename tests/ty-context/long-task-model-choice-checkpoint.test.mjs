import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import test from "node:test";
import {
  createDeliveryFixture,
  runCli,
} from "./long-task-delivery-fixtures.mjs";

const expectedCheckpoint = {
  required: true,
  phase: "post_authority_lock_pre_implementation",
  options: ["continue_current_model", "switch_model_then_resume"],
  message:
    "Authority Lock created. Pause before implementation and ask the user whether to continue with the current model or switch models, then resume this active Long-Task.",
};

test("first Authority Lock emits one execution-model checkpoint and later Compile does not repeat it", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await runCli(fixture.root, ["enable", "long-task"]);

    const first = await runCli(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
    ]);
    assert.deepEqual(first.execution_model_checkpoint, expectedCheckpoint);
    assert.equal(first.lifecycle_event, "authority_locked");
    assert.equal(first.delivery_completed_by_this_event, false);
    assert.equal(first.native_goal_effect, "none");
    assert.match(first.next_action, /rolling implementation/iu);

    const repeated = await runCli(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
    ]);
    assert.deepEqual(repeated.execution_model_checkpoint, { required: false });
    assert.equal(repeated.lifecycle_event, "authority_recompiled_unchanged");
    assert.equal(repeated.delivery_completed_by_this_event, false);
    assert.equal(repeated.native_goal_effect, "none");
    assert.equal(repeated.compiled_identity, first.compiled_identity);
    assert.equal(repeated.authority_revision, first.authority_revision);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});
