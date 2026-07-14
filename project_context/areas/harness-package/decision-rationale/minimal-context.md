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
- Keep `AGENTS.md` as the shortest startup router and hard-boundary surface, not a full design manual.
- Keep role Skills as prompt-level thinking frameworks that write only durable conclusions to Context.
- Trust the agent/platform's internal planning on the default path. A fixed `plan.md`, mapping tables and result artifacts duplicate mutable working memory, add synchronization cost and cannot prove behavior. Existing user files remain untouched but carry no implicit authority.
- Use explicit long-task Skills because Context priority and drift checks are intentionally soft constraints. Tasks of any actual duration may stay on Workflow Contract. `/normal-long-task` externalizes only source plus one acceptance checklist and optional prompt; Local Audit is opt-in. Composite work uses a stricter mechanism because drift grows with handoffs, branches and verification loops. It inherits Context rules but replaces ordinary planning, mapping, state and completion with Campaign/Contract V3 authority.
- Require assertion-backed evidence for machine-verifiable composite long-task layers because a state ledger can be internally consistent while still being polluted by weak browser prose, screenshot-only artifacts, final-card summaries or matrix/verdict rows that do not prove the required behavior. Negative evidence scan is the matching contradiction guard: if owner-surface evidence still shows forbidden final states, the AC is invalidated rather than wrapped as complete. This keeps Tiny Context responsible for assertion report binding, freshness, reviewability, redaction and contradiction checks without making it a product test runner or a fourth upstream input.
- Keep optional scratch files and target-mode audits as non-authoritative execution cache. They have no fixed Workflow name/schema and never become completion proof.
- Allow one narrow tracked exception for explicitly invoked Composite Campaign V5: sanitized discussed-plan provenance, complete Source Unit coverage, one stable Scope Fit V4 graph, campaign host/thread coordination and audit, immutable structured-authoring and schedule revisions, Goal/branch/commit identities, receipt hashes, integration results and the current verifier-derived Campaign result are user-owned orchestration/provenance, not default lifecycle state. Mutable compiled contracts, raw logs, Oracle payloads and active verifier workdirs remain under temporary execution storage. Persisted thread/turn/Goal/profile identities are required recovery facts, not completion evidence. Campaign completion is derived from current Slice/Wave/final verification and target integration; it is never Goal-written state, App Server completion alone or a summary of historical Slice results.
- Preserve Product / Architecture Source, Technical Realization Plan and Acceptance Checklist as three separate Composite authorities. Their explicit machine role does not restore a default Workflow plan file.
- Keep serial and parallel SFCs on one worktree-based execution path so Git, Goal, receipt, merge and recovery semantics do not diverge. SFC boundaries optimize semantic coherence and one acceptance outcome, never parallelism; conflict analysis and scheduling happen afterward. Reusing one thread for Authoring and Execution preserves the authored intent and repair history, while the Goal/preflight boundary and sandbox transition keep execution authority explicit. Require positive evidence before parallel placement and default unknown overlap to serial: an extra wave costs time, while unsafe parallelism can invalidate source meaning or contract verification. Keep Slice Final Gate, Wave Integration Gate and same-snapshot Campaign Final Gate separate because each proves a different composition boundary.
- Put additional safety in machine layers rather than model ceremony. Change Envelopes close Slice scope escape; lease/WAL recovery closes partial campaign writes; temporary-index checkpoints and owned target worktrees protect the primary worktree; settled-turn reconciliation closes background mutation; referenced Context snapshots avoid unrelated invalidation; same-snapshot identity deduplication lowers final-gate cost without reusing historical evidence.
- Separate routing mechanism from a versioned policy so model/catalog evolution does not require orchestration-core edits. Freeze policy, catalog and decision identities in each Campaign.
- Split distribution into portable core/default Workflow and explicit Composite-Codex so Cursor, Claude Code, Gemini CLI and other consumers are not written Codex Hooks they did not enable.
- Do not import historical attachments, partial bundles or old temporary workdirs into campaigns. Their authority and schema cannot be proven consistently, migration would add permanent compatibility burden, and already-complete three-input bundles retain a direct strict-execution path.
- Keep preparation rule sources thin: stable semantic rationale belongs in `PROJECT_SPEC.md` and Context, canonical field/schema rules belong in package code, generated workflow material comes from managed assets, and verification belongs in tests/CI. Historical source-note attachments are not additional runtime authorities or a restored document chain.
- Keep tests, CI, review, smoke checks, hidden probes and human acceptance responsible for product quality.

## Pre-stable Lightweight Verification Rationale

- Before the Composite workflow is stable, the highest-value claim is the small trustworthy loop: a declared Requirement, PI, Obligation or AC cannot be omitted while `accepted`; changed compile inputs or observers cannot reuse an old contract; and a missing, stale or workspace-mismatched final result cannot authorize completion.
- Real CLI and `final-gate` end-to-end cases in the smallest common environment prove that claim more directly than administrator services, OS attack infrastructure, browser/platform matrices or release-consumer labs.
- Heavy Host hardening, hostile-OS resistance, broad compatibility and cross-platform release validation are separate later capabilities. Deferring them keeps the default feedback loop fast enough for individual agile development and prevents pre-stable infrastructure from defining the product prematurely.
- Every default test must name the concrete drift it prevents. A default test that exceeds its budget should be simplified or moved to an explicit later suite rather than made acceptable by a larger timeout.
- Ordinary user/project state is an intentional pre-stable tradeoff, not a hidden security claim. Hash, identity and freshness checks protect the normal CLI/Hook flow; they do not resist deliberate same-user/admin state deletion, Credential Manager or Registry attacks, system-level Hook bypass, deletion of all host state or kernel/sandbox escape.
- Administrator privileges and complex Host infrastructure become justified only after the core workflow is stable and the product explicitly adopts the corresponding threat model.

## Why Architecture And Rationale Support Stays Lightweight

- Do not add `Architecture Delta` or `Rationale Delta`: separate delta fields would split durable-fact classification away from `Context Delta` and create a second gate with unclear ownership.
- `Context Delta: none|required` remains the only long-term fact decision point. `Architecture Context Hit` routes the task to controlling Context, and `Decision Rationale Hit` states whether durable rationale is already covered, newly required or not applicable.
- Record rationale only when it affects future implementation, verification or change decisions. Do not backfill reasons from current code shape alone, because code is implementation evidence, not proof of intended rationale.
- Ordinary bug fixes, local styling, small refactors, package/release chores, test repairs and spikes do not require architecture/rationale ceremony unless they create or change durable facts.
- Keep architecture/rationale routing inside the agent's internal reasoning. Validators can check recoverability, generated asset drift, fake verification claims and touched-source modularity, but they cannot prove whether a task needed new durable rationale or whether code edits happened in the right order.

## Historical Material Boundary

`PROJECT_SPEC.md` keeps the complete design explanation and historical notes: why the stage workflow existed, how it worked, what benchmark work found and why the product converged to Minimal Context. This rationale Context keeps only the stable reasons that should affect future maintenance choices.
