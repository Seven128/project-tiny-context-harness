import test from "node:test";
import assert from "node:assert/strict";
import {
  validateCompositeCampaignBindingV1,
  validateCompositeCampaignEventV1,
  validateCompositeCampaignV1,
  validateCompositeAuthoringPacketV1,
  validateScopeFitResultV1
} from "../../packages/ty-context/dist/lib/composite-campaign-schema.js";
import {
  HASH_A,
  HASH_C,
  bindingFixture,
  campaignFixture,
  eventFixtures,
  goalFixture,
  packetFixture,
  resultFixture,
  scopeFitFixture
} from "./composite-campaign-schema-fixtures.mjs";

export function registerBindingEventSchemaCases() {
  test("binding identity and hashes match the owning current campaign revision and projection", () => {
    const cases = [
      ["campaign_id", (campaign) => { campaign.slices["SFC-001"].binding.campaign_id = "sibling"; }],
      ["slice_id", (campaign) => { campaign.slices["SFC-001"].binding.slice_id = "SFC-002"; }],
      ["revision", (campaign) => { campaign.slices["SFC-001"].binding.revision = 2; }],
      ["request_sha256", (campaign) => { campaign.slices["SFC-001"].binding.request_sha256 = HASH_C; }],
      ["packet_sha256", (campaign) => { campaign.slices["SFC-001"].binding.packet_sha256 = HASH_C; }],
      ["input_contract_sha256", (campaign) => { campaign.slices["SFC-001"].binding.input_contract_sha256 = HASH_C; }],
      ["product_architecture_source", (campaign) => { campaign.slices["SFC-001"].binding.source_hashes.product_architecture_source = HASH_C; }],
      ["technical_realization_plan", (campaign) => { campaign.slices["SFC-001"].binding.source_hashes.technical_realization_plan = HASH_C; }],
      ["acceptance_checklist", (campaign) => { campaign.slices["SFC-001"].binding.source_hashes.acceptance_checklist = HASH_A; }]
    ];
    for (const [label, mutate] of cases) {
      const campaign = campaignFixture(bindingFixture());
      mutate(campaign);
      assert.throws(() => validateCompositeCampaignV1(campaign), new RegExp(label, "i"), label);
    }
    for (const workdir of ["../sibling", "C:\\outside\\task", "/outside/task", "artifacts/not-tmp"]) {
      const binding = bindingFixture();
      binding.workdir = workdir;
      assert.throws(() => validateCompositeCampaignBindingV1(binding), /workdir|project.relative|tmp/i, workdir);
    }
    const unsafeSuffixes = [
      "CON", "con.txt", "PRN", "AUX.log", "NUL", "CLOCK$", "CONIN$", "conout$.txt",
      "COM1.json", "COM¹.json", "LPT9", "lpt³.log",
      "bad?name", "bad\u0001name", "bad.", "bad ", "name:stream", ".", "..", "nested//empty"
    ];
    for (const suffix of unsafeSuffixes) {
      const binding = bindingFixture();
      binding.workdir = `tmp/ty-context/plan-acceptance/${suffix}`;
      assert.throws(
        () => validateCompositeCampaignBindingV1(binding),
        /workdir|unsafe|reserved|component|normalized/i,
        suffix
      );
    }
    const wrongIdentityWorkdirs = [
      "tmp/ty-context/plan-acceptance/sibling/SFC-001-r1/",
      "tmp/ty-context/plan-acceptance/campaign-1/SFC-002-r1/",
      "tmp/ty-context/plan-acceptance/campaign-1/SFC-001-r2/",
      "tmp/ty-context/plan-acceptance/campaign-1/SFC-001-r1/extra/",
      "tmp/ty-context/plan-acceptance/campaign-1/",
      "tmp/ty-context/plan-acceptance/campaign-1/SFC-001-r1",
      "tmp\\ty-context\\plan-acceptance\\campaign-1\\SFC-001-r1\\"
    ];
    for (const workdir of wrongIdentityWorkdirs) {
      const binding = bindingFixture();
      binding.workdir = workdir;
      assert.throws(
        () => validateCompositeCampaignBindingV1(binding),
        /workdir|campaign_id|slice_id|revision|exact|normalized/i,
        workdir
      );
    }
    const badResultHash = bindingFixture({ goal: goalFixture(), result: resultFixture() });
    badResultHash.result.source_hashes_sha256 = HASH_A;
    assert.throws(() => validateCompositeCampaignBindingV1(badResultHash), /source_hashes_sha256|source hashes/i);
    const wrongStandaloneContract = bindingFixture();
    wrongStandaloneContract.input_contract_sha256 = HASH_C;
    assert.throws(
      () => validateCompositeCampaignBindingV1(wrongStandaloneContract),
      /input_contract_sha256|input contract.*mismatch/i
    );

    const statusMismatch = campaignFixture(bindingFixture({ goal: goalFixture(), result: resultFixture() }));
    statusMismatch.slices["SFC-001"].handoff_status = "started";
    statusMismatch.slices["SFC-001"].result_projection = "reject";
    assert.throws(() => validateCompositeCampaignV1(statusMismatch), /result_projection|result.*status/i);
    const syncPending = campaignFixture(bindingFixture({ goal: goalFixture() }));
    syncPending.slices["SFC-001"].handoff_status = "started";
    syncPending.slices["SFC-001"].result_projection = "sync_pending";
    assert.deepEqual(validateCompositeCampaignV1(syncPending), syncPending);
  });

  test("events use exact discriminated scalar payloads and predecessor root invariants", () => {
    const [created, ...later] = eventFixtures();
    assert.deepEqual(validateCompositeCampaignEventV1(created), created);
    for (const event of later) assert.deepEqual(validateCompositeCampaignEventV1(event), event);
    assert.throws(() => validateCompositeCampaignEventV1({ ...created, previous_event_sha256: HASH_A }), /sequence 1|previous_event_sha256/i);
    assert.throws(() => validateCompositeCampaignEventV1({ ...later[0], previous_event_sha256: null }), /previous_event_sha256/i);
    assert.throws(() => validateCompositeCampaignEventV1({ ...created, kind: "future_kind" }), /kind/i);
    for (const event of eventFixtures()) {
      for (const key of Object.keys(event.payload)) {
        const missing = structuredClone(event);
        delete missing.payload[key];
        assert.throws(() => validateCompositeCampaignEventV1(missing), new RegExp(`${key}|payload|required`, "i"), `${event.kind}.${key}`);
      }
      const extra = structuredClone(event);
      extra.payload.extra_scalar = "not-allowed";
      assert.throws(() => validateCompositeCampaignEventV1(extra), /unknown key.*extra_scalar|payload.*extra/i, `${event.kind}.extra`);
      const firstKey = Object.keys(event.payload)[0];
      for (const invalid of [["array"], { nested: true }]) {
        const nonScalar = structuredClone(event);
        nonScalar.payload[firstKey] = invalid;
        assert.throws(() => validateCompositeCampaignEventV1(nonScalar), /payload|scalar|string|number|boolean/i, `${event.kind}.non-scalar`);
      }
    }
    assert.throws(() => validateCompositeCampaignEventV1({ ...created, slice_id: "SFC-001", revision: 1 }), /campaign_created|slice_id|revision/i);
    assert.throws(() => validateCompositeCampaignEventV1({ ...later[0], revision: 1 }), /scope_fit_applied|revision/i);
    assert.throws(() => validateCompositeCampaignEventV1({ ...later[1], slice_id: null, revision: null }), /packet_revision_created|slice_id|revision/i);
    assert.throws(() => validateCompositeCampaignEventV1({ ...later[0], manifest_generation: 9 }), /manifest_generation|sequence/i);
  });

  test("campaign generations and event sequences require safe integers", () => {
    const unsafeCampaign = campaignFixture(bindingFixture());
    unsafeCampaign.generation = Number.MAX_SAFE_INTEGER + 1;
    unsafeCampaign.event_cursor.sequence = Number.MAX_SAFE_INTEGER + 1;
    assert.throws(() => validateCompositeCampaignV1(unsafeCampaign), /generation|sequence|safe integer/i);

    const unsafeEvent = eventFixtures()[1];
    unsafeEvent.sequence = Number.MAX_SAFE_INTEGER + 1;
    unsafeEvent.manifest_generation = Number.MAX_SAFE_INTEGER + 1;
    assert.throws(() => validateCompositeCampaignEventV1(unsafeEvent), /sequence|generation|safe integer/i);
  });

  test("aggregate campaign, Product, and Goal completion keys are recursively forbidden", () => {
    const keys = [
      "campaign_complete", "campaign_completed", "product_goal_complete", "goal_complete",
      "all_slices_complete", "completion_output_status", "aggregate_completion"
    ];
    for (const key of keys) {
      const scope = scopeFitFixture();
      scope.slices[0][key] = true;
      assert.throws(() => validateScopeFitResultV1(scope), /aggregate|completion|unknown key/i, `scope.${key}`);
      const packet = packetFixture();
      packet.authorities.technical_realization_plan.plan_items[0][key] = true;
      assert.throws(() => validateCompositeAuthoringPacketV1(packet), /aggregate|completion|unknown key/i, `packet.${key}`);
      const binding = bindingFixture();
      binding.task[key] = true;
      assert.throws(() => validateCompositeCampaignBindingV1(binding), /aggregate|completion|unknown key/i, `binding.${key}`);
      const campaign = campaignFixture(bindingFixture());
      campaign.slices["SFC-001"].binding[key] = true;
      assert.throws(() => validateCompositeCampaignV1(campaign), /aggregate|completion|unknown key/i, `campaign.${key}`);
      const event = eventFixtures()[0];
      event.payload[key] = true;
      assert.throws(() => validateCompositeCampaignEventV1(event), /aggregate|completion|unknown key|payload/i, `event.${key}`);
    }
  });
}
