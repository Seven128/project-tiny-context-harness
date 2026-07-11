---
context_role: decision-rationale
read_policy: on-demand
---
# Minimal Context Rationale

## Role

This rationale explains why the current product direction is Minimal Context Harness. Read it when evaluating proposals to restore lifecycle phases, thick documents, stage gates, validator-driven workflow or broad default process artifacts.

## Why Minimal Context

- The original stage-based workflow tried to make requirements, design, architecture, implementation, review, testing, release and requirement changes explicit so later agents would recover faster.
- Benchmark pilots showed that default fact-source writes, stage decisions, phase transitions and gates create real time and token cost even when final product quality is unchanged.
- Modern coding agents already internalize much of the ordinary single-task loop: understand compact requirements, make local design choices, edit code, run focused checks and repair simple failures.
- The durable value with the clearest return is fast recovery of project intent, non-goals, ownership, architecture constraints, integration direction, repeat-execution paths and the priority rules for reconciling Context, implementation and evidence across fresh conversations.
- Context therefore preserves the smallest stable fact set and workflow priority contract that code alone does not reliably communicate.
- A core failure case is the ABCD dependency chain: if A/B/C are upstream of downstream D, a D task may be locally completable by changing upstream A/B. Code and semantic retrieval can expose that path, but they cannot decide whether the project allows it. Minimal Context keeps the repo-owned intent layer that says whether the change belongs in D, C's contract or an upstream Context Delta.

## Why Not Restore The Old SDLC Default

- Lifecycle phases, plan state, stage Skills, phase gates and `.work_products/**` make every project pay ceremony cost before evidence shows the structure is needed.
- Thick PRD/UX/tech-plan/review/test/release document chains duplicate reasoning that agents can often perform inside the current task loop.
- Validator-driven workflow should be limited to recoverability, generated-asset consistency and fake verification-claim prevention. Harness must not claim product quality or enforce edit order as a product substitute.
- Historical stage design is documentation-only in the current source tree. It remains useful as rationale in `PROJECT_SPEC.md`, not as runnable default package behavior.

## Current Design Choice

- Keep `project_context/**` as the durable recovery surface.
- Keep Context/code/evidence priority, read-order guidance, context-first classification and drift checks as core Minimal Context behavior.
- Keep `AGENTS.md` as startup router and hard-boundary surface, not a full design manual.
- Keep role Skills as prompt-level thinking frameworks that write only durable conclusions to Context.
- Use explicit long-task Skills because Context priority and drift checks are intentionally soft constraints. Short tasks should usually use the workflow contract plus Context directly. Ordinary long tasks can externalize one acceptance target through `/normal-long-task`. Composite work uses a stricter mechanism because implementation drift grows with context length, handoffs and verification loops: `/prepare-composite-long-task` may author the complete V2 three-input packet, and `/composite-long-task-workflow` compiles that packet into an immutable obligation/verification contract, actively runs exact frozen verifiers, recomputes every claim on one final snapshot and uses a Codex Stop Hook to prevent a stale or unaccepted completion reply. The workflow does not try to prevent the model from ever drifting and does not prescribe planning, subagent, TDD or review mechanics; it allows implementation freedom while preventing known delivery drift from passing. Process cost is justified only when a step closes a named false-completion path, so the default flow contains only contract compilation, implementation–verification iteration, final full verification and Stop enforcement. State reducers, evidence registration, slice/epoch cadence, progress ledgers, derived reports and execution-method adapters are removed because they add ceremony without creating a more independent completion fact source.
- Require assertion-backed evidence for machine-verifiable composite long-task layers because a state ledger can be internally consistent while still being polluted by weak browser prose, screenshot-only artifacts, final-card summaries or matrix/verdict rows that do not prove the required behavior. Negative evidence scan is the matching contradiction guard: if owner-surface evidence still shows forbidden final states, the AC is invalidated rather than wrapped as complete. This keeps Tiny Context responsible for assertion report binding, freshness, reviewability, redaction and contradiction checks without making it a product test runner or a fourth upstream input.
- Keep temporary plans and target-mode audits as execution cache, never as long-lived fact sources.
- Allow one narrow tracked exception for explicitly invoked composite preparation: sanitized request provenance, campaign coordination/audit and immutable structured-authoring revisions are user-owned source material, not lifecycle execution state. Goal attempts, logs, evidence, generated views and completion state remain under `tmp`, and campaigns have no aggregate product-completion status.
- Preserve Product / Architecture Source, Technical Realization Plan and Acceptance Checklist as three separate rendered authorities. A structured packet may author them together, but their distinct intent, executable-plan and acceptance roles prevent one source or generated view from silently rewriting another and keep the existing strict executor compatible.
- Do not import historical attachments, partial bundles or old temporary workdirs into campaigns. Their authority and schema cannot be proven consistently, migration would add permanent compatibility burden, and already-complete three-input bundles retain a direct strict-execution path.
- Keep preparation rule sources thin: stable semantic rationale belongs in `PROJECT_SPEC.md` and Context, canonical field/schema rules belong in package code, generated workflow material comes from managed assets, and verification belongs in tests/CI. Historical source-note attachments are not additional runtime authorities or a restored document chain.
- Keep tests, CI, review, smoke checks, hidden probes and human acceptance responsible for product quality.

## Why Architecture And Rationale Support Stays Lightweight

- Do not add `Architecture Delta` or `Rationale Delta`: separate delta fields would split durable-fact classification away from `Context Delta` and create a second gate with unclear ownership.
- `Context Delta: none|required` remains the only long-term fact decision point. `Architecture Context Hit` routes the task to controlling Context, and `Decision Rationale Hit` states whether durable rationale is already covered, newly required or not applicable.
- Record rationale only when it affects future implementation, verification or change decisions. Do not backfill reasons from current code shape alone, because code is implementation evidence, not proof of intended rationale.
- Ordinary bug fixes, local styling, small refactors, package/release chores, test repairs and spikes do not require architecture/rationale ceremony unless they create or change durable facts.
- Keep the architecture/rationale fields at prompt-level Task Contract scope. Validators can check recoverability, generated asset drift, fake verification claims and touched-source modularity, but they cannot prove whether a task needed new durable rationale or whether code edits happened in the right order.

## Historical Material Boundary

`PROJECT_SPEC.md` keeps the complete design explanation and historical notes: why the stage workflow existed, how it worked, what benchmark work found and why the product converged to Minimal Context. This rationale Context keeps only the stable reasons that should affect future maintenance choices.
