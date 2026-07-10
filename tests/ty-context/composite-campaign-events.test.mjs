import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  compositeCampaignEventId,
  compositeCampaignTransactionId,
  encodeCompositeCampaignEventLine,
  findCommittedCompositeOperation,
  readCommittedCompositeCampaignEvents,
  validateCompositeCampaignOperationId
} from "../../packages/ty-context/dist/lib/composite-campaign-events.js";
import { sha256Hex } from "../../packages/ty-context/dist/lib/composite-campaign-codec.js";
import { COMPOSITE_CAMPAIGN_EVENT_SCHEMA_VERSION } from "../../packages/ty-context/dist/lib/composite-campaign-types.js";

const HASH_A = "a".repeat(64);

test("event identities are deterministic, domain separated, and operation IDs are bounded", () => {
  const transaction = compositeCampaignTransactionId("campaign-1", "scope_fit_applied", "scope:1", HASH_A);
  assert.equal(transaction, sha256Hex(`composite-campaign-transaction-v1\0campaign-1\0scope_fit_applied\0scope:1\0${HASH_A}`));
  assert.equal(compositeCampaignTransactionId("campaign-1", "scope_fit_applied", "scope:1", HASH_A), transaction);
  assert.notEqual(compositeCampaignTransactionId("campaign-1", "scope_fit_applied", "scope:2", HASH_A), transaction);
  assert.equal(
    compositeCampaignEventId(transaction, 2),
    sha256Hex(`composite-campaign-event-v1\0${transaction}\0${2}`)
  );
  assert.equal(validateCompositeCampaignOperationId("Scope:operation_1.v2"), "Scope:operation_1.v2");
  for (const invalid of ["", " leading", "two words", "slash/value", "back\\slash", "x\nline", `x${"y".repeat(128)}`]) {
    assert.throws(() => validateCompositeCampaignOperationId(invalid), /operation.id|identifier|128|safe/i, invalid);
  }
  assert.throws(() => validateCompositeCampaignOperationId(`sk-${"a".repeat(48)}`), /secret|credential|operation.id/i);
});

test("events encode as one exact compact LF line and hash the LF byte domain", () => {
  const event = eventFixture(1, null, "create:1", "campaign_created", {
    request_sha256: HASH_A,
    redaction_count: 0
  });
  const encoded = encodeCompositeCampaignEventLine(event);
  assert.deepEqual(encoded.event, event);
  assert.equal(encoded.line, `${JSON.stringify(event)}\n`);
  assert.equal(encoded.line.includes("\r"), false);
  assert.equal(encoded.line.split("\n").length, 2);
  assert.equal(encoded.sha256, sha256Hex(encoded.line));
  assert.equal(encoded.bytes, Buffer.byteLength(encoded.line));

  const oversized = structuredClone(event);
  oversized.operation_id = `x${"y".repeat(70_000)}`;
  assert.throws(() => encodeCompositeCampaignEventLine(oversized), /operation.id|64 KiB|event line/i);
});

test("the committed reader validates compact bytes, exact hash chain, cursor, and ignores suffix", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ty-campaign-events-"));
  try {
    const first = encodeCompositeCampaignEventLine(eventFixture(1, null, "create:1", "campaign_created", {
      request_sha256: HASH_A,
      redaction_count: 0
    }));
    const second = encodeCompositeCampaignEventLine(eventFixture(2, first.sha256, "scope:1", "scope_fit_applied", {
      scope_fit_sha256: "b".repeat(64),
      decision: "fit_for_three_inputs",
      selected_slice_id: "SFC-001"
    }));
    const suffix = "uncommitted suffix\n";
    const eventsPath = path.join(root, "events.ndjson");
    await writeFile(eventsPath, first.line + second.line + suffix, "utf8");
    const loaded = await readCommittedCompositeCampaignEvents(eventsPath, {
      sequence: 2,
      last_event_sha256: second.sha256
    }, "campaign-1");
    assert.deepEqual(loaded.events, [first.event, second.event]);
    assert.equal(loaded.raw_prefix, first.line + second.line);
    assert.equal(loaded.committed_bytes, Buffer.byteLength(first.line + second.line));
    assert.equal(loaded.file_bytes, Buffer.byteLength(first.line + second.line + suffix));
    assert.deepEqual(findCommittedCompositeOperation(loaded.events, "scope:1"), second.event);
    assert.equal(findCommittedCompositeOperation(loaded.events, "missing"), undefined);

    const pretty = ` ${JSON.stringify(first.event)}\n${second.line}`;
    await writeFile(eventsPath, pretty, "utf8");
    const prettyFirstHash = sha256Hex(` ${JSON.stringify(first.event)}\n`);
    const prettySecond = structuredClone(second.event);
    prettySecond.previous_event_sha256 = prettyFirstHash;
    const prettySecondLine = `${JSON.stringify(prettySecond)}\n`;
    await writeFile(eventsPath, ` ${JSON.stringify(first.event)}\n${prettySecondLine}`, "utf8");
    await assert.rejects(
      readCommittedCompositeCampaignEvents(eventsPath, {
        sequence: 2,
        last_event_sha256: sha256Hex(prettySecondLine)
      }, "campaign-1"),
      /compact|canonical|event line/i
    );

    await writeFile(eventsPath, first.line.replace(/\n$/, "\r\n"), "utf8");
    await assert.rejects(
      readCommittedCompositeCampaignEvents(eventsPath, { sequence: 1, last_event_sha256: sha256Hex(first.line.replace(/\n$/, "\r\n")) }, "campaign-1"),
      /compact|canonical|CRLF|event line/i
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the committed reader rejects same-length malformed UTF-8 before event decoding", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ty-campaign-events-utf8-"));
  const eventsPath = path.join(root, "events.ndjson");
  try {
    const encoded = encodeCompositeCampaignEventLine(eventFixture(1, null, "create:1", "campaign_created", {
      request_sha256: HASH_A,
      redaction_count: 0
    }));
    const valid = Buffer.from(encoded.line, "utf8");
    const operationOffset = valid.indexOf(Buffer.from("create:1", "utf8"));
    assert.notEqual(operationOffset, -1);
    const malformed = Buffer.from(valid);
    Buffer.from([0xf0, 0x90, 0x80]).copy(malformed, operationOffset);
    assert.equal(malformed.byteLength, valid.byteLength);
    await writeFile(eventsPath, malformed);
    await assert.rejects(
      readCommittedCompositeCampaignEvents(eventsPath, {
        sequence: 1,
        last_event_sha256: sha256Hex(malformed)
      }, "campaign-1"),
      /event line.*valid UTF-8|valid UTF-8.*event line/i
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the committed reader rejects missing, partial, oversized, wrong-campaign, and broken-chain lines", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ty-campaign-events-bad-"));
  const eventsPath = path.join(root, "events.ndjson");
  try {
    const first = encodeCompositeCampaignEventLine(eventFixture(1, null, "create:1", "campaign_created", {
      request_sha256: HASH_A,
      redaction_count: 0
    }));
    const secondValue = eventFixture(2, first.sha256, "scope:1", "scope_fit_applied", {
      scope_fit_sha256: "b".repeat(64),
      decision: "fit_for_three_inputs",
      selected_slice_id: "SFC-001"
    });
    const second = encodeCompositeCampaignEventLine(secondValue);
    for (const [content, cursor, pattern] of [
      [first.line, { sequence: 2, last_event_sha256: second.sha256 }, /missing|cursor|sequence|EOF/i],
      [first.line.slice(0, -1), { sequence: 1, last_event_sha256: first.sha256 }, /partial|LF|newline/i],
      [`${"x".repeat(65_537)}\n`, { sequence: 1, last_event_sha256: HASH_A }, /64 KiB|event line/i]
    ]) {
      await writeFile(eventsPath, content, "utf8");
      await assert.rejects(readCommittedCompositeCampaignEvents(eventsPath, cursor, "campaign-1"), pattern);
    }
    const wrongCampaign = structuredClone(secondValue);
    wrongCampaign.campaign_id = "campaign-2";
    wrongCampaign.transaction_id = compositeCampaignTransactionId(
      wrongCampaign.campaign_id,
      wrongCampaign.kind,
      wrongCampaign.operation_id,
      wrongCampaign.payload.scope_fit_sha256
    );
    wrongCampaign.event_id = compositeCampaignEventId(wrongCampaign.transaction_id, wrongCampaign.sequence);
    const wrongLine = `${JSON.stringify(wrongCampaign)}\n`;
    await writeFile(eventsPath, first.line + wrongLine, "utf8");
    await assert.rejects(
      readCommittedCompositeCampaignEvents(
        eventsPath,
        { sequence: 2, last_event_sha256: sha256Hex(wrongLine) },
        "campaign-1"
      ),
      /campaign/i
    );
    const broken = structuredClone(secondValue);
    broken.previous_event_sha256 = "c".repeat(64);
    const brokenLine = encodeCompositeCampaignEventLine(broken);
    await writeFile(eventsPath, first.line + brokenLine.line, "utf8");
    await assert.rejects(
      readCommittedCompositeCampaignEvents(eventsPath, { sequence: 2, last_event_sha256: brokenLine.sha256 }, "campaign-1"),
      /previous|chain/i
    );

    const forgedIdentity = structuredClone(first.event);
    forgedIdentity.event_id = "forged-event";
    const forgedLine = `${JSON.stringify(forgedIdentity)}\n`;
    await writeFile(eventsPath, forgedLine, "utf8");
    await assert.rejects(
      readCommittedCompositeCampaignEvents(eventsPath, { sequence: 1, last_event_sha256: sha256Hex(forgedLine) }, "campaign-1"),
      /event.id|deterministic|identity/i
    );

    const forgedTransaction = structuredClone(second.event);
    forgedTransaction.transaction_id = "d".repeat(64);
    forgedTransaction.event_id = compositeCampaignEventId(forgedTransaction.transaction_id, 2);
    const forgedTransactionLine = `${JSON.stringify(forgedTransaction)}\n`;
    await writeFile(eventsPath, first.line + forgedTransactionLine, "utf8");
    await assert.rejects(
      readCommittedCompositeCampaignEvents(eventsPath, {
        sequence: 2, last_event_sha256: sha256Hex(forgedTransactionLine)
      }, "campaign-1"),
      /transaction.*payload|deterministic.*transaction|fingerprint/i
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

function eventFixture(sequence, previous, operationId, kind, payload) {
  const payloadHash = kind === "scope_fit_applied" ? payload.scope_fit_sha256
    : kind === "packet_revision_created" ? payload.packet_sha256 : HASH_A;
  const transaction = compositeCampaignTransactionId("campaign-1", kind, operationId, payloadHash);
  return {
    schema_version: COMPOSITE_CAMPAIGN_EVENT_SCHEMA_VERSION,
    event_id: compositeCampaignEventId(transaction, sequence),
    transaction_id: transaction,
    operation_id: operationId,
    sequence,
    campaign_id: "campaign-1",
    slice_id: kind === "campaign_created" || kind === "scope_fit_applied" ? null : "SFC-001",
    revision: kind === "campaign_created" || kind === "scope_fit_applied" ? null : 1,
    manifest_generation: sequence,
    previous_event_sha256: previous,
    kind,
    payload
  };
}
