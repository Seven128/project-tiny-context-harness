# Delivery Benchmark Evidence Model And Runner Implementation

## 1. 关联信息

- Domain: `delivery_benchmark`
- Module / subsystem / core flow: repo-local benchmark runner, scenarios, visual report and evidence model
- Linked PRD: `.work_products/01_product/delivery_benchmark_evidence_model.md`
- Linked technical design: `.work_products/03_tech_plan/delivery_benchmark_evidence_model.md`
- Linked ADR: `.work_products/05_decisions/ADR_008_delivery_benchmark_scenario_design.md`
- Runnable implementation: `examples/delivery-benchmark/**`

## 2. 当前实现范围

- `examples/delivery-benchmark/runner/delivery_benchmark.mjs` provides repo-local commands for scenario listing, run preparation, staged prompts, observer timing, manual/system timers, quality probes, recovery scoring, prompt ledger records, intervention records, gate findings and scoring.
- `examples/delivery-benchmark/scenarios/**` stores fixed scenario requirements, acceptance criteria, lifecycle probes, staged recovery/RFC/debug materials, hidden quality probes and hidden recovery answer keys.
- `examples/delivery-benchmark/prompts/**` stores mode-specific prompt shells for `baseline` and `harness`.
- `examples/delivery-benchmark/results/index.html` and `benchmark-data.js` provide a static bilingual visual report.
- The visual report displays metric confidence, automation burden, gate value,
  lifecycle segments and artifact inventory when committed result data contains
  those fields.
- `examples/delivery-benchmark/README.md` and `RUNBOOK.md` remain operator/user entry documents, while `.work_products/**` now holds product, technical and implementation facts.
- `.artifacts/delivery-benchmark/**` holds raw run directories, observer logs, summaries and calibration output; it is not committed and not a long-term fact source.

## 3. 真实代码结构

| 路径 | 作用 |
|---|---|
| `examples/delivery-benchmark/runner/delivery_benchmark.mjs` | Repo-local benchmark CLI and scoring engine |
| `examples/delivery-benchmark/prompts/baseline.md` | Plain AI coding mode rules |
| `examples/delivery-benchmark/prompts/harness.md` | AI SDLC Harness mode rules |
| `examples/delivery-benchmark/scenarios/<id>/requirements.md` | Initial visible product contract |
| `examples/delivery-benchmark/scenarios/<id>/acceptance_criteria.md` | Shared final acceptance criteria |
| `examples/delivery-benchmark/scenarios/<id>/gate_profile.md` | Scenario-specific gate boundary |
| `examples/delivery-benchmark/scenarios/<id>/recovery_checkpoint.md` | Staged recovery prompt |
| `examples/delivery-benchmark/scenarios/<id>/rfc_change.md` | Staged RFC prompt |
| `examples/delivery-benchmark/scenarios/<id>/debug_fix.md` | Staged debug prompt |
| `examples/delivery-benchmark/scenarios/<id>/quality_probe.mjs` | Hidden quality probe |
| `examples/delivery-benchmark/scenarios/<id>/recovery_answer_key.json` | Hidden recovery scoring key |
| `examples/delivery-benchmark/results/index.html` | Static visual report |
| `examples/delivery-benchmark/results/benchmark-data.js` | Report-internal data model |
| `tests/sdlc-harness/delivery-benchmark.test.mjs` | Runner/report/scenario regression tests |

## 4. Runner Interfaces

These commands are repo-local benchmark interfaces and are not npm package public CLI:

| Command | Purpose |
|---|---|
| `list` | Print available scenarios |
| `prepare` | Create a baseline or Harness run dir with initial prompt only |
| `stage-prompt` | Print recovery/RFC/debug material at the correct measured stage |
| `observe-start` / `observe-stop` / `observe-status` | External elapsed-time and file-activity observer |
| `timer-start` / `timer-stop` / `timer-status` / `timer-cancel` | System-timed manual-boundary stage/gate events |
| `record` | Legacy/manual event record |
| `prompt-record` | Record saved prompt fingerprints without counting them as an intervention |
| `quality-probe` | Run scenario-owned hidden behavior probe |
| `recovery-score` | Score takeover memo with hidden answer key and file references |
| `intervention-record` | Record protocol-external operator help |
| `gate-record` | Record whether a gate caught defects |
| `score` | Merge evidence into JSON and markdown summaries, including run type, cost boundary and artifact inventory |
| `evidence-check` | Compare baseline/Harness summary JSON files and report publishable conclusion eligibility |

## 5. 核心数据流

```txt
operator chooses scenario
-> prepare baseline and harness run dirs
-> observer starts outside measured prompt
-> measured agent executes initial prompt
-> operator injects recovery/RFC/debug stages with stage-prompt
-> prompt ledger records protocol and operator prompt hashes/chars
-> hidden quality probe runs after delivery
-> optional recovery/intervention/gate records are added outside measured prompt
-> score writes summary JSON/Markdown
-> evidence-check verifies publishable pair gates and allowed conclusions
-> visual report consumes curated committed summary data only
```

## 6. 当前场景

| Scenario | Purpose |
|---|---|
| `expense-policy-engine` | Historical same-quality sample with legacy low-confidence cost |
| `project-context-recovery-lab` | Context continuity and fresh-agent recovery |
| `support-triage-board` | UI/API/policy/test/docs RFC/debug drift and gate value |
| `webhook-provider-bridge` | Provider/live boundary, credential blocker and do-not-retry safety, with executable `createWebhookBridge()` smoke contract |

## 7. Metric Confidence Implementation

- `quality_assessment.primary_source` uses `hidden_quality_probe` when available.
- `workflow_cost.observed_total_delivery_minutes` uses observer-measured elapsed time when available.
- `workflow_cost.run_type` records `cold`, `warm` or `unknown`; `workflow_cost.bootstrap_minutes` can preserve separately measured bootstrap/adoption cost.
- For `harness` mode, `prepare` materializes the warm Harness scaffold before the initial run-dir git commit. The measured prompt no longer asks the agent to run `npx sdlc-harness init`.
- `workflow_cost.cost_boundary.observed_harness_bootstrap` records whether observer data saw managed runtime scaffold files added during measurement; `evidence-check` rejects conclusion-grade warm elapsed comparisons when bootstrap leakage is detected.
- `metric_confidence` marks each metric with confidence, data source and `conclusion_eligible`.
- `automation_burden.prompt_ledger` summarizes `.benchmark/prompts.ndjson`: protocol prompt count/chars, intervention prompt count/chars, operator-note count/chars and per-kind breakdown. `prepare` records `protocol_initial`, `stage-prompt --run-dir` records `protocol_stage`, `intervention-record` records `operator_intervention`, and `prompt-record` can record `operator_note`.
- `artifact_inventory` scans the run directory outside `.benchmark`, `.git`, `node_modules`, build output and coverage directories. It reports high-confidence diagnostic counts for `managed_runtime`, `project_facts`, `product_source_tests`, `product_docs`, `raw_artifacts`, `scaffold` and `other`.
- Static rubric sections remain supplemental and can show WARN even when hidden quality probe passes.
- Recovery scoring remains medium confidence because it uses hidden answer keys but still depends on natural language memo quality and file-reference interpretation.
- Prompt ledger length/hash is high confidence for saved prompt text, but it does not prove that every possible operator prompt was recorded.
- Gate value and intervention records are diagnostic until they are backed by first-pass hidden probes and automated event boundaries.
- `webhook-provider-bridge/quality_probe.mjs` imports `src/webhookBridge.js#createWebhookBridge()`, computes HMAC signatures independently, and verifies valid request acceptance, invalid signature rejection, stale timestamp rejection, replay/idempotency, bounded retry/DLQ behavior, mock/live evidence boundaries, schema-v2 rejection of unmarked v1 payloads, tenant previous-secret grace/expiry, and per-tenant replay scope.
- The mock-provider smoke probe treats an explicit `passed: true` result as accepted and runs smoke checks on a fresh bridge instance so earlier negative-path audit entries cannot contaminate the smoke result. This keeps the hidden probe deterministic and fair across baseline and Harness paths.

## 8. Cold/Warm Cost Boundary

Current runner can measure cold runs directly. Warm run support is implemented in `prepare --mode harness`:

1. Prepare the Harness run directory and materialize the Harness scaffold with the package CLI.
2. Commit/adopt the Harness bootstrap state before delivery timing starts.
3. Start observer for the scenario delivery task only.
4. Score bootstrap separately from delivery elapsed time.

This boundary is necessary because `npx sdlc-harness init` materializes `.codex/**`, `tools/**`, templates, policies and skills. Those files are adoption runtime assets, not product-specific delivery output.

The `score` command accepts `--run-type cold|warm|unknown` and `--bootstrap-minutes <n>` so summaries can state whether bootstrap is included in delivery timing. When scored as `warm`, observer-added managed runtime files such as `.codex/**`, `AGENTS.md`, `Makefile` or managed `tools/**` are treated as bootstrap leakage and block conclusion-grade elapsed comparison.

## 9. Artifact Inventory Implementation

`score` computes `artifact_inventory` from the measured run directory:

| Category | Included paths | Interpretation |
|---|---|---|
| `managed_runtime` | `.codex/**`, `tools/**`, `AGENTS.md`, `Makefile`, workflow-adjacent agent folders | Harness runtime/adoption assets; not product-specific output |
| `project_facts` | `.work_products/**` | Durable project context and handoff facts |
| `product_source_tests` | `src/**`, `test/**`, `tests/**`, `lib/**`, `bin/**`, `public/**` | Product implementation, executable tests and browser UI assets |
| `product_docs` | `README.md`, `DESIGN.md`, `docs/**`, takeover/handoff memos | Product-facing docs and recovery notes |
| `raw_artifacts` | `.artifacts/**` if present in a run dir | Should normally remain outside committed source |
| `scaffold` | `package.json`, lockfiles, `.gitignore`, config files | Project setup scaffolding |
| `other` | Any remaining files | Requires manual interpretation |

The inventory is high-confidence for file/line/byte counts because it comes from filesystem scan, but it remains diagnostic: more lines or files do not prove value. It exists to explain whether Harness overhead came from runtime bootstrap, durable facts, product code/tests/docs or unrelated artifacts.

The committed visual report consumes this structure as `scenario.artifactInventory`
when a public result has a matching raw scored summary. As of the support-triage
formal pilot, the report shows that the product source/test/UI asset volume is
comparable while Harness adds managed runtime and `.work_products` fact volume.
Expense and context results do not invent inventory data when matching raw scored
summaries are unavailable or lower-confidence.

## 10. Evidence Check Implementation

`evidence-check` reads a baseline summary JSON and Harness summary JSON, then
returns:

- `checks`: same scenario, expected modes, protocol status, same hidden quality,
  observer elapsed, cost boundary and artifact inventory availability.
- `elapsed_comparison`: baseline minutes, Harness minutes, delta and ratio.
- `allowed_conclusions`: the elapsed-time conclusion that is safe to publish if
  the pair is conclusion-grade.
- `design_purpose_status`: `supports_direct_efficiency`,
  `negative_elapsed_signal`, `neutral_elapsed_signal` or `not_evaluable`.
- `missing_for_design_purpose`: high-confidence evidence still missing for
  context recovery, automation burden, gate value, artifact inventory or
  high-risk provider boundary claims.

The command does not replace operator protocol review. The operator still marks
`--protocol-status formal|calibration|blocked|unreviewed` after checking fresh
sessions, staged injection, cross-path contamination and observer boundaries.

## 11. Current Paused Pilot Snapshot

- Detailed snapshot: `.work_products/07_test/delivery_benchmark_pilot_progress_20260603.md`.
- Active artifact at pause: `.artifacts/delivery-benchmark/20260602-195213-webhook-warm-optimized/`.
- Scenario: `webhook-provider-bridge`.
- Mode paused: `harness`.
- Status: diagnostic incomplete; the run stopped during staged `RFC` and is not public-result eligible.
- High-confidence facts preserved so far: initial hidden quality `13/13 PASS`, external observer elapsed through pause, and recovery score `4/4 PASS` with medium-high confidence.
- The paused RFC produced useful workflow-friction evidence, especially plan task contract shape retries and validator/evidence-formatting costs, but it has no final RFC/debug quality score.

## 12. Calibration Lessons Captured

- Formal lifecycle runs must not expose future recovery/RFC/debug materials in initial prompts.
- Raw operator artifacts must not dirty the measured product git surface.
- Run dirs must be independent git repositories with local bare remotes so Harness commit/push closure does not touch the source repository.
- Measured-agent environments must allow writes to the configured Harness root and run-dir git index. A 2026-06-03 `webhook-provider-bridge` pilot attempt passed hidden initial quality on both paths, but the Harness `codex exec` sandbox blocked `.codex/**` creation and `.git/index.lock` writes, causing a `codex/**` fallback root and incomplete task commit/push closure; that attempt is calibration-only.
- Baseline must also create a clean product delivery commit before fresh-agent recovery and after later mutating RFC/debug stages. A later 2026-06-03 `webhook-provider-bridge` rerun passed local tests and recovery scored `4/4`, but the baseline product source/tests/docs were still uncommitted when recovery started. That attempt is calibration-only because recovery inspected a dirty worktree instead of a stable delivered repository state.
- `stage-prompt` now tells recovery agents to write `.benchmark/takeover-answer.md` and tells mutating RFC/debug stages to finish with mode-appropriate commit/push closure.
- Support pilot data shows hidden quality can pass on both paths while Harness elapsed remains higher; this is valid negative evidence and must drive gate/artifact thinning analysis instead of being hidden.
- Artifact volume must be reported by category because Harness managed runtime can dominate line counts and distort product-output interpretation.
- Recovery answer-key scoring supports alternative term/reference groups so a fair takeover memo can cite either README-level facts or `.work_products/**` facts when both are valid project context sources.
- Paused or interrupted runs must be snapshotted in `.work_products/07_test/**` before resuming or discarding. This preserves benchmark iteration experience without promoting incomplete data into the visual report.
- Workflow optimization should first target friction that does not create product quality or durable context value: invalid task skeleton retries, ambiguous validator evidence formatting, repeated overview regeneration and overly broad internal-loop gates.

## 13. Verification

Current verification coverage lives in:

- `tests/sdlc-harness/delivery-benchmark.test.mjs`
- `node --check examples/delivery-benchmark/runner/delivery_benchmark.mjs`
- `node --check examples/delivery-benchmark/results/benchmark-data.js`
- `make work-products-overview`
- `make validate-harness`

When benchmark source behavior changes, update this implementation doc, refresh `.work_products/**/overview.md`, and keep README/RUNBOOK/ADR/report wording aligned with the evidence boundary.
