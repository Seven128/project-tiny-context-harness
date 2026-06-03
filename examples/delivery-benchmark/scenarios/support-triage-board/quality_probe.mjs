#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const runDir = path.resolve(process.argv[2] ?? process.cwd());
const stage = process.env.BENCHMARK_PROBE_STAGE ?? process.argv[3] ?? "final";
const finalLikeStages = new Set(["rfc", "debug", "final"]);
const checks = [];

function addCheck(id, label, passed, detail = "") {
  checks.push({ id, label, passed: Boolean(passed), detail });
}

async function readText(relativePath) {
  return readFile(path.join(runDir, relativePath), "utf8").catch(() => "");
}

function normalize(value) {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function indexOfNeedle(value, needle) {
  return normalize(value).toLowerCase().indexOf(String(needle).toLowerCase());
}

function ordered(value, needles) {
  let previous = -1;
  for (const needle of needles) {
    const next = indexOfNeedle(value, needle);
    if (next < 0 || next <= previous) return false;
    previous = next;
  }
  return true;
}

function ticketId(ticket, fallback) {
  return ticket?.id ?? ticket?.ticketId ?? fallback;
}

function hasStructuredError(value) {
  return Boolean(value?.errorCode || value?.error?.errorCode || /errorCode/i.test(normalize(value)));
}

async function loadSupportDeskFactory() {
  const candidates = ["src/supportDesk.js", "src/index.js"];
  for (const relative of candidates) {
    const fullPath = path.join(runDir, relative);
    try {
      const mod = await import(`${pathToFileURL(fullPath).href}?probe=${Date.now()}`);
      const factory = mod.createSupportDesk ?? mod.default?.createSupportDesk ?? mod.default;
      if (typeof factory === "function") {
        return { relative, factory };
      }
    } catch {
      // Try the next candidate. The final check records the failure.
    }
  }
  return null;
}

const packageText = await readText("package.json");
let packageJson = null;
try {
  packageJson = JSON.parse(packageText);
} catch {
  packageJson = null;
}

addCheck(
  "QP-SUPPORT-001",
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
  "QP-SUPPORT-002",
  "Project-local test suite passes",
  testResult.status === 0,
  testResult.status === 0 ? "npm test passed" : (testResult.stderr || testResult.stdout || `npm test exited ${testResult.status}`).slice(0, 500)
);

const loaded = await loadSupportDeskFactory();
addCheck(
  "QP-SUPPORT-003",
  "Deterministic support desk smoke contract is exported",
  Boolean(loaded),
  loaded ? `factory=${loaded.relative}` : "missing createSupportDesk export from src/supportDesk.js or src/index.js"
);

if (loaded) {
  let desk = null;
  try {
    desk = loaded.factory();
  } catch (error) {
    addCheck("QP-SUPPORT-004", "createSupportDesk can be instantiated", false, error.message);
  }
  if (desk) {
    probeDesk(desk);
  }
}

const readmeText = await readText("README.md");
addCheck(
  "QP-SUPPORT-README",
  "README makes the support workflow recoverable",
  /priority/i.test(readmeText) &&
    /kanban/i.test(readmeText) &&
    /list/i.test(readmeText) &&
    /next safe action/i.test(readmeText) &&
    /supportDesk|createSupportDesk/i.test(readmeText),
  "README should name priority policy, kanban/list views, supportDesk smoke contract and next safe action"
);

console.log(
  JSON.stringify({
    stage,
    confidence: "high",
    checks
  })
);

function probeDesk(desk) {
  const finalLike = finalLikeStages.has(stage);
  const requiredMethods = [
    "createTicket",
    "listTickets",
    "inspectTicket",
    "updateTicket",
    "assignTicket",
    "moveTicket",
    "renderListView",
    "renderKanbanView",
    "renderUiStates"
  ];
  if (finalLike) {
    requiredMethods.push("bulkAssign");
  }
  addCheck(
    "QP-SUPPORT-004",
    finalLike ? "Final smoke contract exposes API, policy, UI and bulk methods" : "Initial smoke contract exposes API, policy and UI methods",
    requiredMethods.every((method) => typeof desk[method] === "function"),
    `missing=${requiredMethods.filter((method) => typeof desk[method] !== "function").join(",") || "none"}`
  );

  try {
    const high = desk.createTicket({
      title: "Enterprise breach phone ticket",
      customerTier: "enterprise",
      channel: "phone",
      createdAt: "2026-06-01T00:00:00.000Z",
      status: "new",
      contractRisk: "breach",
      assignee: "unassigned"
    });
    const medium = desk.createTicket({
      title: "Premium watch chat ticket",
      customerTier: "premium",
      channel: "chat",
      createdAt: "2026-06-01T06:00:00.000Z",
      status: "triaged",
      contractRisk: "watch",
      assignee: "unassigned"
    });
    const low = desk.createTicket({
      title: "Standard email ticket",
      customerTier: "standard",
      channel: "email",
      createdAt: "2026-06-01T12:00:00.000Z",
      status: "waiting",
      contractRisk: "none",
      assignee: "unassigned"
    });
    const highId = ticketId(high, "T-HIGH");
    const mediumId = ticketId(medium, "T-MED");
    const lowId = ticketId(low, "T-LOW");

    addCheck(
      "QP-SUPPORT-005",
      finalLike ? "API list uses weighted SLA priority order" : "API list exposes the current priority order",
      ordered(desk.listTickets(), [highId, lowId]),
      finalLike
        ? "weighted order should put enterprise/phone/breach before standard/email"
        : "initial policy should put the high-risk enterprise ticket before the low-risk standard ticket"
    );

    const listView = desk.renderListView();
    const kanbanView = desk.renderKanbanView();
    const expectedOrder = finalLike ? [highId, mediumId, lowId] : [highId, lowId];
    addCheck(
      "QP-SUPPORT-006",
      finalLike ? "List and kanban views match weighted API order" : "List and kanban views match current API priority order",
      ordered(listView, expectedOrder) && ordered(kanbanView, expectedOrder),
      "rendered list/kanban should use the same priority source as API list"
    );

    desk.assignTicket(mediumId, "mira");
    desk.moveTicket(lowId, "resolved");
    const inspectedMedium = desk.inspectTicket(mediumId);
    const inspectedLow = desk.inspectTicket(lowId);
    addCheck(
      "QP-SUPPORT-007",
      "Assignment and status movement update tickets and audit trail",
      normalize(inspectedMedium).includes("mira") &&
        normalize(inspectedMedium).includes("assigned") &&
        normalize(inspectedLow).includes("resolved"),
      "assignTicket and moveTicket should be visible through inspectTicket"
    );

    const states = desk.renderUiStates();
    addCheck(
      "QP-SUPPORT-008",
      "UI state coverage includes loading, empty, error and invalid",
      ["loading", "empty", "error", "invalid"].every((term) => indexOfNeedle(states, term) >= 0),
      "renderUiStates should expose all expected UI states"
    );

    if (finalLike) {
      let invalidBulkResult = null;
      let invalidBulkThrew = false;
      try {
        invalidBulkResult = desk.bulkAssign([mediumId, lowId], { assignee: "mira" });
      } catch (error) {
        invalidBulkThrew = true;
        invalidBulkResult = error;
      }
      addCheck(
        "QP-SUPPORT-009",
        "Bulk assignment rejects missing auditReason with structured error",
        invalidBulkThrew || hasStructuredError(invalidBulkResult),
        "missing auditReason should throw or return a structured errorCode"
      );

      desk.bulkAssign([mediumId, lowId], {
        assignee: "casey",
        auditReason: "RFC2 load balance"
      });
      const bulkMedium = desk.inspectTicket(mediumId);
      const bulkLow = desk.inspectTicket(lowId);
      const updatedList = desk.renderListView();
      const updatedKanban = desk.renderKanbanView();
      addCheck(
        "QP-SUPPORT-010",
        "Bulk assignment updates owner and audit trail for every selected ticket",
        normalize(bulkMedium).includes("casey") &&
          normalize(bulkLow).includes("casey") &&
          normalize(bulkMedium).includes("RFC2 load balance") &&
          normalize(bulkLow).includes("RFC2 load balance"),
        "selected tickets should include assignee and auditReason in inspection output"
      );
      addCheck(
        "QP-SUPPORT-011",
        "UI snapshots are not stale after bulk assignment",
        normalize(updatedList).includes("casey") &&
          normalize(updatedKanban).includes("casey") &&
          ordered(updatedList, [highId, mediumId, lowId]) &&
          ordered(updatedKanban, [highId, mediumId, lowId]),
        "list/kanban should reflect bulk assignment and preserve weighted order"
      );
    }
  } catch (error) {
    addCheck("QP-SUPPORT-BEHAVIOR", "Support desk behavior probe completes", false, error.stack || error.message);
  }
}
