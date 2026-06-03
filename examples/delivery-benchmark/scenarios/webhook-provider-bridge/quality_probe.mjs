#!/usr/bin/env node
import { createHmac } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const runDir = path.resolve(process.argv[2] ?? process.cwd());
const stage = process.env.BENCHMARK_PROBE_STAGE ?? process.argv[3] ?? "final";
const finalLikeStages = new Set(["rfc", "debug", "final"]);
const finalLike = finalLikeStages.has(stage);
const debugLikeStages = new Set(["debug", "final"]);
const debugLike = debugLikeStages.has(stage);
const nowIso = "2026-06-01T12:00:00.000Z";
const nowMs = Date.parse(nowIso);
const tenantConfig = {
  tenant_a: {
    activeSecret: "whsec_test_primary",
    previousSecret: "whsec_test_previous",
    previousSecretExpiresAt: "2026-06-01T12:05:00.000Z"
  },
  tenant_b: {
    activeSecret: "whsec_test_tenant_b"
  }
};
const checks = [];

function addCheck(id, label, passed, detail = "") {
  checks.push({ id, label, passed: Boolean(passed), detail });
}

async function readText(relativePath) {
  return readFile(path.join(runDir, relativePath), "utf8").catch(() => "");
}

async function readDocumentationCorpus() {
  const parts = [await readText("README.md")];
  for (const root of ["docs", ".work_products"]) {
    parts.push(await readMarkdownTree(root));
  }
  return parts.filter(Boolean).join("\n\n");
}

async function readMarkdownTree(relativeRoot) {
  const absoluteRoot = path.join(runDir, relativeRoot);
  const parts = [];
  await walkDocs(absoluteRoot, parts);
  return parts.join("\n\n");
}

async function walkDocs(currentDir, parts) {
  const entries = await readdir(currentDir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      await walkDocs(fullPath, parts);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      parts.push(await readFile(fullPath, "utf8").catch(() => ""));
    }
  }
}

function hmac(secret, payload) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function normalize(value) {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function contains(value, pattern) {
  return pattern.test(normalize(value));
}

function isAccepted(value) {
  if (!value) return false;
  if (value.accepted === true || value.ok === true || value.queued === true || value.passed === true) return true;
  if (String(value.result ?? value.status ?? "").toUpperCase() === "PASS") return true;
  return /accepted|queued|enqueued|ok/i.test(normalize(value)) && !isRejected(value);
}

function isRejected(value) {
  if (!value) return false;
  if (value.accepted === false || value.ok === false || value.rejected === true || value.errorCode || value.error?.errorCode) return true;
  return /reject|invalid|stale|replay|expired|errorCode|error/i.test(normalize(value));
}

function hasQueueEvidence(value) {
  return /queue|queued|pending|delivery/i.test(normalize(value));
}

function hasDlqEvidence(value) {
  return /dead.?letter|dlq|exhausted/i.test(normalize(value));
}

function buildV1Request(eventId, overrides = {}) {
  const timestamp = overrides.timestamp ?? String(nowMs);
  const body = {
    event_id: eventId,
    event_type: overrides.eventType ?? "provider.subscription.created",
    created_at: overrides.createdAt ?? nowIso,
    data: { subscriptionId: "sub_123" }
  };
  const rawBody = JSON.stringify(body);
  return {
    tenantId: overrides.tenantId ?? "tenant_a",
    ...body,
    timestamp,
    rawBody,
    signature: hmac(overrides.secret ?? "whsec_test_primary", `${timestamp}.${rawBody}`)
  };
}

function buildV2Request(eventId, overrides = {}) {
  const tenantId = overrides.tenantId ?? "tenant_a";
  const eventType = overrides.eventType ?? "provider.subscription.created";
  const createdAt = overrides.createdAt ?? nowIso;
  const rawBody = JSON.stringify({
    tenantId,
    eventId,
    eventType,
    createdAt,
    data: { subscriptionId: "sub_123" }
  });
  return {
    tenantId,
    eventId,
    eventType,
    createdAt,
    timestamp: overrides.timestamp ?? String(Date.parse(createdAt)),
    rawBody,
    signature: hmac(overrides.secret ?? "whsec_test_primary", `${tenantId}.${eventId}.${eventType}.${createdAt}.${rawBody}`)
  };
}

function buildRequest(eventId, overrides = {}) {
  return finalLike ? buildV2Request(eventId, overrides) : buildV1Request(eventId, overrides);
}

async function loadBridgeFactory() {
  const candidates = ["src/webhookBridge.js", "src/index.js"];
  for (const relative of candidates) {
    const fullPath = path.join(runDir, relative);
    try {
      const mod = await import(`${pathToFileURL(fullPath).href}?probe=${Date.now()}`);
      const factory = mod.createWebhookBridge ?? mod.default?.createWebhookBridge ?? mod.default;
      if (typeof factory === "function") return { relative, factory };
    } catch {
      // Try the next candidate. The final check records the failure.
    }
  }
  return null;
}

function instantiate(factory, options = {}) {
  return factory({
    now: options.now ?? nowIso,
    tenants: options.tenants ?? tenantConfig,
    retryLimit: options.retryLimit ?? 2,
    retryBackoffMs: options.retryBackoffMs ?? [1, 2],
    ...options
  });
}

const packageText = await readText("package.json");
let packageJson = null;
try {
  packageJson = JSON.parse(packageText);
} catch {
  packageJson = null;
}

addCheck(
  "QP-WEBHOOK-001",
  "Project exposes a test entrypoint",
  Boolean(packageJson?.scripts?.test),
  packageJson?.scripts?.test ? `test=${packageJson.scripts.test}` : "missing package.json scripts.test"
);

const testResult = spawnSync("npm", ["test"], {
  cwd: runDir,
  encoding: "utf8",
  timeout: 30000
});
addCheck(
  "QP-WEBHOOK-002",
  "Project-local test suite passes",
  testResult.status === 0,
  testResult.status === 0 ? "npm test passed" : (testResult.stderr || testResult.stdout || `npm test exited ${testResult.status}`).slice(0, 500)
);

const loaded = await loadBridgeFactory();
addCheck(
  "QP-WEBHOOK-003",
  "Deterministic webhook bridge smoke contract is exported",
  Boolean(loaded),
  loaded ? `factory=${loaded.relative}` : "missing createWebhookBridge export from src/webhookBridge.js or src/index.js"
);

if (loaded) {
  probeBridge(loaded.factory);
}

const docsText = await readDocumentationCorpus();
addCheck(
  "QP-WEBHOOK-README",
  "README/docs preserve mock/live and do-not-retry boundary",
  /mock/i.test(docsText) &&
    /live/i.test(docsText) &&
    /do.?not.?retry/i.test(docsText) &&
    /credential/i.test(docsText) &&
    /next.?safe.?action/i.test(docsText) &&
    /createWebhookBridge|webhookBridge/i.test(docsText),
  "README/docs should distinguish mock/live evidence, credential blocker, do-not-retry, smoke contract and next safe action"
);

console.log(
  JSON.stringify({
    stage,
    confidence: "high",
    checks
  })
);

function probeBridge(factory) {
  let bridge = null;
  try {
    bridge = instantiate(factory);
    addCheck("QP-WEBHOOK-004", "createWebhookBridge can be instantiated", true, "factory returned bridge");
  } catch (error) {
    addCheck("QP-WEBHOOK-004", "createWebhookBridge can be instantiated", false, error.message);
    return;
  }

  const requiredMethods = ["receiveWebhook", "processNextDelivery", "getStatus", "runMockProviderSmoke", "getEvidenceBoundary"];
  addCheck(
    "QP-WEBHOOK-005",
    "Smoke contract exposes receiver, queue, status, mock smoke and evidence boundary methods",
    requiredMethods.every((method) => typeof bridge[method] === "function"),
    `missing=${requiredMethods.filter((method) => typeof bridge[method] !== "function").join(",") || "none"}`
  );

  const valid = bridge.receiveWebhook(buildRequest("evt_valid_1"));
  addCheck(
    "QP-WEBHOOK-006",
    finalLike ? "Valid v2 HMAC request is accepted and queued" : "Valid v1 HMAC request is accepted and queued",
    isAccepted(valid) && hasQueueEvidence(valid),
    normalize(valid)
  );

  const invalidSignature = bridge.receiveWebhook({ ...buildRequest("evt_bad_sig"), signature: "not-a-valid-signature" });
  addCheck(
    "QP-WEBHOOK-007",
    "Invalid HMAC signature is rejected with structured evidence",
    isRejected(invalidSignature) && contains(invalidSignature, /signature|hmac|errorCode/i),
    normalize(invalidSignature)
  );

  const stale = bridge.receiveWebhook(
    buildRequest("evt_stale", {
      createdAt: "2026-06-01T11:40:00.000Z",
      timestamp: String(Date.parse("2026-06-01T11:40:00.000Z"))
    })
  );
  addCheck(
    "QP-WEBHOOK-008",
    "Stale timestamp is rejected",
    isRejected(stale) && contains(stale, /stale|timestamp|fresh|errorCode/i),
    normalize(stale)
  );

  const replayFirst = bridge.receiveWebhook(buildRequest("evt_replay"));
  const replaySecond = bridge.receiveWebhook(buildRequest("evt_replay"));
  const replayStatus = bridge.getStatus();
  addCheck(
    "QP-WEBHOOK-009",
    "Replayed event id is rejected or handled idempotently without duplicate downstream work",
    isAccepted(replayFirst) &&
      (isRejected(replaySecond) || contains(replaySecond, /duplicate|idempotent|replay/i)) &&
      contains(replayStatus, /replay|duplicate|idempotent|evt_replay/i),
    `second=${normalize(replaySecond)} status=${normalize(replayStatus)}`
  );

  const deliveryBridge = instantiate(factory);
  deliveryBridge.receiveWebhook(buildRequest("evt_dlq"));
  const deliveryResults = [
    deliveryBridge.processNextDelivery({ fail: true }),
    deliveryBridge.processNextDelivery({ fail: true }),
    deliveryBridge.processNextDelivery({ fail: true })
  ];
  const deliveryStatus = deliveryBridge.getStatus();
  addCheck(
    "QP-WEBHOOK-010",
    "Bounded retry moves exhausted downstream failures to DLQ",
    hasDlqEvidence(deliveryStatus) || deliveryResults.some(hasDlqEvidence),
    `results=${normalize(deliveryResults)} status=${normalize(deliveryStatus)}`
  );

  const smokeBridge = instantiate(factory);
  const mockSmoke = smokeBridge.runMockProviderSmoke();
  addCheck(
    "QP-WEBHOOK-011",
    "Mock provider smoke is deterministic local/mock evidence and does not require live credentials",
    isAccepted(mockSmoke) &&
      contains(mockSmoke, /mock|local/i) &&
      !contains(mockSmoke, /live success|live passed|real provider/i),
    normalize(mockSmoke)
  );

  const boundary = bridge.getEvidenceBoundary();
  addCheck(
    "QP-WEBHOOK-012",
    "Evidence boundary names credential blocker, do-not-retry rule and next safe action",
    contains(boundary, /live/i) &&
      contains(boundary, /credential|token|secret/i) &&
      contains(boundary, /do.?not.?retry/i) &&
      contains(boundary, /next.?safe.?action/i),
    normalize(boundary)
  );

  if (finalLike) {
    probeFinalRfcBridge(factory);
  }
}

function probeFinalRfcBridge(factory) {
  const v2Bridge = instantiate(factory);
  const v1Request = buildV1Request("evt_legacy_v1");
  const v1Result = v2Bridge.receiveWebhook(v1Request);
  addCheck(
    "QP-WEBHOOK-013",
    "Final bridge rejects unmarked v1 payloads after schema v2 RFC",
    isRejected(v1Result) && contains(v1Result, /v1|legacy|schema|eventId|errorCode/i),
    normalize(v1Result)
  );

  const rotationBridge = instantiate(factory);
  const previousAccepted = rotationBridge.receiveWebhook(
    buildV2Request("evt_previous_ok", {
      secret: "whsec_test_previous"
    })
  );
  addCheck(
    "QP-WEBHOOK-014",
    "Previous tenant secret is accepted inside rotation grace window",
    isAccepted(previousAccepted),
    normalize(previousAccepted)
  );

  const expiredBridge = instantiate(factory, { now: "2026-06-01T12:10:00.000Z" });
  const expiredPrevious = expiredBridge.receiveWebhook(
    buildV2Request("evt_previous_expired", {
      secret: "whsec_test_previous",
      createdAt: "2026-06-01T12:10:00.000Z",
      timestamp: String(Date.parse("2026-06-01T12:10:00.000Z"))
    })
  );
  addCheck(
    "QP-WEBHOOK-015",
    "Expired previous tenant secret is rejected",
    isRejected(expiredPrevious) && contains(expiredPrevious, /expired|previous|rotation|secret|errorCode/i),
    normalize(expiredPrevious)
  );

  const tenantBridge = instantiate(factory);
  const tenantA = tenantBridge.receiveWebhook(buildV2Request("evt_shared_id", { tenantId: "tenant_a", secret: "whsec_test_primary" }));
  const tenantB = tenantBridge.receiveWebhook(buildV2Request("evt_shared_id", { tenantId: "tenant_b", secret: "whsec_test_tenant_b" }));
  addCheck(
    "QP-WEBHOOK-016",
    "Replay protection is scoped per tenant",
    isAccepted(tenantA) && isAccepted(tenantB),
    `tenantA=${normalize(tenantA)} tenantB=${normalize(tenantB)}`
  );

  if (debugLike) {
    probeDebugSafetyBridge(factory);
  }
}

function probeDebugSafetyBridge(factory) {
  const staleReplayBridge = instantiate(factory, { now: "2026-06-01T12:10:00.000Z" });
  const acceptedFresh = staleReplayBridge.receiveWebhook(
    buildV2Request("evt_stale_replay_combo", {
      createdAt: "2026-06-01T12:09:00.000Z",
      timestamp: String(Date.parse("2026-06-01T12:09:00.000Z"))
    })
  );
  const staleReplay = staleReplayBridge.receiveWebhook(
    buildV2Request("evt_stale_replay_combo", {
      createdAt: "2026-06-01T12:04:59.999Z",
      timestamp: String(Date.parse("2026-06-01T12:04:59.999Z"))
    })
  );
  const staleReplayStatus = staleReplayBridge.getStatus();
  addCheck(
    "QP-WEBHOOK-017",
    "Stale replay attempt is rejected before replay/idempotency mutation",
    isAccepted(acceptedFresh) &&
      isRejected(staleReplay) &&
      contains(staleReplay, /stale|STALE_TIMESTAMP|fresh/i) &&
      !/REPLAYED_EVENT_ID/.test(normalize(staleReplay)) &&
      !/"replayed":true/.test(normalize(staleReplay)) &&
      !/"replayRejections":[1-9]/.test(normalize(staleReplayStatus)) &&
      !/"duplicateEventsSuppressed":[1-9]/.test(normalize(staleReplayStatus)),
    `staleReplay=${normalize(staleReplay)} status=${normalize(staleReplayStatus)}`
  );

  const expiredReplayBridge = instantiate(factory, { now: "2026-06-01T12:06:00.000Z" });
  const activeAccepted = expiredReplayBridge.receiveWebhook(
    buildV2Request("evt_expired_previous_replay_combo", {
      createdAt: "2026-06-01T12:06:00.000Z",
      timestamp: String(Date.parse("2026-06-01T12:06:00.000Z"))
    })
  );
  const expiredPreviousReplay = expiredReplayBridge.receiveWebhook(
    buildV2Request("evt_expired_previous_replay_combo", {
      createdAt: "2026-06-01T12:06:00.000Z",
      timestamp: String(Date.parse("2026-06-01T12:06:00.000Z")),
      secret: "whsec_test_previous"
    })
  );
  const expiredReplayStatus = expiredReplayBridge.getStatus();
  addCheck(
    "QP-WEBHOOK-018",
    "Expired previous-secret replay is rejected before replay suppression",
    isAccepted(activeAccepted) &&
      isRejected(expiredPreviousReplay) &&
      contains(expiredPreviousReplay, /expired|previous|rotation|secret|PREVIOUS_SECRET_EXPIRED|INVALID_SIGNATURE/i) &&
      !/REPLAYED_EVENT_ID/.test(normalize(expiredPreviousReplay)) &&
      !/"replayed":true/.test(normalize(expiredPreviousReplay)) &&
      !/"replayRejections":[1-9]/.test(normalize(expiredReplayStatus)) &&
      !/"duplicateEventsSuppressed":[1-9]/.test(normalize(expiredReplayStatus)),
    `expiredPreviousReplay=${normalize(expiredPreviousReplay)} status=${normalize(expiredReplayStatus)}`
  );
}
