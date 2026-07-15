---
context_role: decision-rationale
read_policy: on-demand
---
# Minimal Context And Single-Goal Rationale

## Decision

- Keep Minimal Context as the durable project-memory layer and replace the active multi-worker long-task architecture with Single-Goal Rolling Delivery: one native Goal, one selected workspace, one Delivery Contract and verifier-owned same-snapshot completion.

## Reason

- This preserves recovery and false-completion protection while removing scheduler, worker, worktree, model-routing and duplicate-authority mechanisms that do not improve evidence for a single continuing Goal.

## Why Minimal Context

- Modern coding agents already handle compact requirements, local design, editing, focused tests and repair. Persisting that mutable reasoning as a mandatory document chain adds synchronization cost without proving behavior.
- The durable value with the clearest return is project-owned intent: goals/non-goals, ownership, architecture/interface/state boundaries and repeatable verification/deployment paths that code alone cannot decide.
- Context therefore remains the smallest durable fact surface; default execution uses platform-internal planning and project evidence.

## Why A Long-Task Mechanism Still Exists

- Long work is vulnerable to delivery drift across pauses, compaction and repair loops. Prompt discipline alone cannot stop a model from treating partial or stale evidence as complete.
- The minimum high-value mechanism is one canonical intent/acceptance source plus verifier-owned same-snapshot completion and freshness. This catches cheap authoring errors before implementation and prevents historical proof splicing without externalizing the entire execution process.
- Risk-proportional proof avoids making ordinary multi-file work pay security/migration/full-population ceremony while preventing risky work from silently choosing weak evidence.

## Why Single Goal And Rolling Frontier

- Physical Goal/Turn lifecycle is a platform concern. Reimplementing it in Harness creates duplicate recovery authority and process orchestration that cannot improve product proof.
- Outcome dependencies describe acceptance readiness, not implementation scheduling. A rolling Frontier lets the current native Goal adapt file/function/test details to the latest code without freezing a speculative technical DAG.
- One current workspace removes branch/worktree/integration recovery and combined-gate machinery from the core. Users may explicitly use platform/Git parallelism, but it is not Harness runtime authority.

## Why One Delivery Contract

- Product, stable Technical Boundary and Acceptance are distinct logical concerns but do not need separate files or a handwritten Requirement/PI/Obligation/Binding/AC/Proof/Spec namespace.
- Nesting Outcomes and Checks lets the compiler generate deterministic ids and bottom-up graphs. The Contract stays readable, revisable through normal Git history and free of duplicate semantic projections.
- A single coverage review can catch missing observable outcomes, control states, failure paths, non-completing results, technical boundaries and proof. No structural chain can prove the user omitted nothing; the workflow states that limitation honestly.

## Why Targeted And Final Verification Differ

- Targeted verify is fast feedback for the current Frontier, so it may cache current-snapshot status but cannot authorize completion.
- Final Gate reruns every required global/Outcome Check on one fresh snapshot. Equal execution identity can deduplicate work inside that Gate, while history is never reused.
- Stop freshness closes post-gate drift by binding accepted authority to Contract, source, selected Context, runner/oracle, verifier, repository/workdir and workspace snapshot identities.

## Retired Architecture Rationale

- The former multi-SFC campaign architecture externalized Source Unit inventory, Scope Fit, Packets, worker/model attempts, waves, worktrees, integration and finalization. Those mechanisms solved orchestration boundaries that the new core deliberately does not own.
- Their marginal complexity exceeded the value required for one native Goal in one workspace. They are removed from active runtime rather than kept as speculative dead code.
- Historical user files are preserved because deletion or automatic semantic migration cannot establish their new authority. Lightweight CLI tombstones give a safe English migration path without importing the retired runtime.

## Stable Anti-Goals

- Do not restore stages, thick plan/result documents, Source/SFC/Packet/Wave/Campaign state, agent/process/Git orchestration or model routing as default or long-task runtime.
- Do not make Context-first order/internal planning a validator gate.
- Do not let command exit, model prose, handwritten status, targeted passes or historical runs create accepted authority.
- Do not claim hostile-host security, complete requirement discovery, platform Goal observation or token/model-call accounting.
- Keep product quality with tests/CI/browser/runtime/data proof and human acceptance.
