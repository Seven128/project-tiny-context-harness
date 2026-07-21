---
context_role: foundation
read_policy: on-demand
---
# Harness Context Model

## Role

This foundation Context defines the durable vocabulary and fact-source priority for the Project Tiny Context Harness source workspace. Read it before changing Context roles, durable fact placement, fact-source authority, Context/code/evidence priority or the meaning of Minimal Context recovery.

## Core Terms

- Harness is the portable managed guidance, Context templates, default Skills and validators that shape expected agent behavior; it does not own project quality or ordinary task execution state.
- Context is durable project fact stored in `project_context/**` or `DESIGN.md` so future agents can recover intent, ownership, boundaries and repeat-execution paths.
- Minimal Context is the durable fact layer: the smallest repo-owned facts needed to recover project intent, ownership, boundaries and repeat-execution paths.
- Workflow Contract is the default agent behavior layer: read core/default Context, combine manifest routing with one bounded Context discovery search, decide one `Context Delta: none|required`, update durable facts first when required, use the agent's internal planning, implement, run project-owned verification, then perform Contract Conformance and Context drift check.
- Tiny Context has three cooperating capabilities: Minimal Context owns durable facts; Workflow Contract owns the lightweight default behavior; explicitly enabled Long-Task Workflow owns one Canonical Delivery Contract and verifier-derived current-snapshot completion authority for a platform-native Goal.
- Repo-owned intent layer is the durable project fact surface that tells agents which product, architecture, ownership and dependency facts outrank current-code convenience.
- Durable facts include product/domain ownership, surface responsibility, information architecture, API/schema semantics, state/runtime/recovery semantics, cross-domain boundaries, security boundaries and repeatable verification/deployment paths.
- Workflow Contract is prompt-level order of thought, not a validator, phase gate, artifact schema, edit-order gate or long-task detector.
- **Design Authority Check** is the conditional default-workflow routing step for material production UI. It reads relevant screen/surface Context, `DESIGN.md`, the declared authored token source/generation direction and selected design references before implementation. It is not a lifecycle phase, required document tree, generic pixel gate or new `Context Delta`.
- **Design Context Depth Model** separates durable UI meaning into global experience principles, cross-surface responsibility, Screen Context, Control interaction Context, `DESIGN.md` visual-system authority, versioned authored targets and repeatable verification. It uses existing Context roles and on-demand selection; projects instantiate only the depth they need.
- **Screen Contract** is optional project-owned area/subdomain Context for one durable screen/surface slice: stable surface/route identity, entry/exit/shared state, information hierarchy, semantic layout regions, navigation/interaction, state/responsive/mode variants, Control inventory and target/verification references. A cross-area screen interface may use `contract`; no new `screen` or `design` role exists.
- **UI Authority Closure** is the material-UI reconciliation before implementation or Long-Task Compile. Each affected item becomes `context-covered`, `context-update`, `task-local`, `out-of-scope` or `decision-required`; stable surface/control/target keys connect Source, Context, `DESIGN.md`, targets, Contract and checks. It is order-of-thought guidance, not a file, table, delta, readiness state or second authority.
- A design reference has one declared interpretation: `exact-target` authorizes fidelity comparison for its named surface/viewport/mode/state, `constraint` authorizes only the named partial rule, and `inspiration` guides exploration but proves no reproduction claim. An unconfigured starter is not production design authority.
- A full material Control may independently specify surface, region/location, type/label, user task, visibility/availability, trigger/input/validation/default, interaction/navigation, loading/empty/success/failure/recovery/permission/feedback and accessibility. Durable reusable fields belong to owning Screen/interaction Context; delivery-local fields remain Source/Contract meaning. Non-applicable fields remain absent rather than receiving invented filler.
- Internal plan means the agent's current reasoning about goal, boundaries, controlling Context, implementation surfaces and verification. It has no mandatory file, name or schema.
- **Context discovery search** is one bounded text search over `project_context/**` before `Context Delta`, using a small set of high-signal terms from the task such as explicit area/module names and API/schema/state/security/verification/deployment language. It supplements manifest triggers and semantic judgment, reads only relevant matches and creates no index, cache, state or authority.
- Small code task means a local implementation task where existing Context is sufficient and the change does not alter durable product, architecture, API/schema/data, runtime/state/recovery, verification/deployment, security/redaction or surface-ownership facts. It is not defined by lines changed.
- Architecture Context Hit and Decision Rationale Hit are internal routing questions for high-risk work; they do not create additional deltas, Context roles, files or validators.
- Source-to-Context judgment is the internal classification of each external product, architecture, technical or acceptance constraint as covered, requiring a Context update, task-local, explicitly out of scope or requiring a user decision. It is required thinking, not a Markdown table.
- Context-to-Implementation alignment is checked during Conformance by asking whether controlling Context actually reached the correct modules, surfaces, APIs, state machines and verification paths and whether forbidden shortcuts were avoided. It is not a Markdown table.
- Scratch files are optional, user/agent-owned temporary memory. They have no fixed name or schema, are not Context or completion proof, are not registered in `context.toml`, and never become Workflow or Long-Task authority.
- A Source Plan produced by the optional `source-plan-authoring` Skill is one self-contained Markdown provenance document. It may preserve stable requirement/control/obligation/acceptance keys and derivation sources for later Contract authoring, but it is not Context, a Delivery Contract, runtime state or completion proof.
- Externally authored design resources are ordinary Source regardless of whether they arrive as Figma frames, images, prototypes, token exports, component specifications or another project-native format. The optional `design-resource-authoring` Skill may commission and iterate them task-locally from raw drafts, product/technical/design Source or an optional Source Plan. Its authoring scope is the explicit requested output or development content plus only necessary surrounding context; an implementation handoff accounts for every material user-visible UI/UX decision inside that scope through relevant controls and conditions, subtracts sufficient selected-source coverage, permits one addressable artifact or component family to cover many items and leaves product/business/data/permission/algorithmic logic with its owning Source. The task-local coverage mapping creates no Context role, resource pack, registry, provider state or authority and the Skill never invokes `source-plan-authoring`. Generation does not update the input proposal, Context/`DESIGN.md`, production UI or Contract/runtime state or prove acceptance. A selected exact target becomes durable or delivery authority only through the consuming workflow's UI Authority Closure and adoption.
- One root V2 `delivery-contract.yaml` (optionally with Outcome fragments) is explicit long-task authoring authority. Original sources are provenance; compiled cache, per-Check progress, receipts and status are verifier-owned temporary audit/recovery state, never Context or acceptance authority.
- **Execution-model checkpoint** is the single user-choice pause after the first Authority Lock and before Long-Task implementation. The user may continue with the current model or switch models and resume the active task. A prior explicit choice satisfies it; later revisions do not repeat it. It creates no model route, acknowledgement file, checkpoint state or completion authority.
- **Controlling Context** is selected Context whose meaning can change current delivery ownership, architecture, product/technical contracts, risk, recovery, verification or deployment. Core files, explicit `context_refs`, verification/deployment Context and every file in full snapshot mode are controlling. Its change cannot be silently absorbed after Authority Lock.
- **Supporting Context** is selected only through graph expansion, is not explicitly referenced, and has role `implementation-index` or `archive`. It improves navigation or preserves background material without defining acceptance. A supporting-only revision may preserve targeted Progress, but it never becomes proof.
- **Retrieval metadata** is manifest guidance that changes how future agents find Context without changing the meaning of Context already selected for a delivery: `triggers`, `read_when`, `read_policy`, default selection and unselected nodes. Selected area ownership, role classification and selected dependency closure are authority structure, not retrieval metadata.
- Conformance is a handoff self-check against relevant Context and current task constraints. It creates delivery evidence, not durable Context by itself.

## Fact-Source Authority

- `project_context/**` is authoritative for ownership, responsibility, architecture boundaries, integration direction, dependency constraints and repeatable verification/deployment paths.
- `DESIGN.md` is authoritative for durable visual design-system facts when a project uses it and indexes the selected authored token source/generation direction plus durable design-reference interpretations. Versioned non-textual target assets remain project Source or verifier inputs at their project-native paths rather than being copied into Context.
- External design resources are ordinary upstream Source. Candidate resources authorize no fidelity; an exact target needs a recorded selection basis, declared condition coverage and stable immutable identity, but even then the downstream default/Long-Task workflow decides durable adoption and verification binding. Static/default visuals prove only shown conditions; dynamic state, interaction, motion, responsive/platform/input and accessibility coverage must be explicitly specified or demonstrated. Tool-specific generation, scope/coverage review or export validation is authoring QA rather than Design Authority or product evidence.
- Product Surface Context owns cross-surface/main-versus-drilldown responsibility; Screen/interaction Context owns stable hierarchy and behavior; `DESIGN.md` owns visual-system semantics; an authored target owns its declared concrete composition; the Delivery Contract only freezes/references/projects those facts for one delivery. When owners conflict, update/resolve the owner or retain `decision_required`; neither code recency nor YAML duplication wins silently.
- Foundation, contract, decision-rationale, architecture, verification and deployment Context interpret current implementation paths before code convenience is allowed to redefine product or architecture intent. Verification and deployment Context remain controlling because changing a repeatable proof or release boundary can change what the delivery means.
- `implementation-index` and `archive` may be Supporting Context only when they are graph-derived and non-explicit in referenced mode. An explicit reference or full snapshot makes them controlling.
- Code is current implementation evidence. It shows what is implemented now but cannot silently redefine intended product, architecture or ownership.
- Tests, smoke checks, CI, review, hidden probes and human acceptance prove product quality. Context can identify repeatable verification paths, but neither Context nor Harness validators claim that behavior passed.
- `PROJECT_SPEC.md` owns the full Harness design explanation and historical rationale in this source workspace. Role Context keeps only high-frequency durable facts.
- Agent internal plans are current execution state only. Existing `plan.md`, matrices, verdicts or other user files have no implicit authority.
- Explicit Long-Task authority is: one complete source V2 Contract (with `outcome_files` only as physical compatibility); generated Source/REQ/CTRL/OBL/AC coverage; immutable initial base and protected authority hashes; targeted per-Check repair progress; a common-dir Active Authority V3 record containing the complete compiled snapshot plus a task/revision/identity Git-config marker; and a source-recompiled same-snapshot Live Final Gate run by final-gate, Stop or close. The workdir compiled file is never previous-authority or baseline authority.
- In referenced mode, the `context.toml` entry in the Context snapshot uses a canonical selected-authority projection rather than raw retrieval text. Retrieval-only edits therefore do not revise active Authority or stale scoped Progress; selected structural changes and selected Context contents still do. A changed final Git tree still invalidates historical final acceptance and must pass the Live Final Gate again.

## Priority When Sources Disagree

1. Read the core/default Context, collect manifest candidates and run the bounded Context discovery search before deciding `Context Delta`.
2. Treat the resulting relevant Context as the intended target for ownership, boundaries, contracts and repeat-execution paths.
3. Let principle-like Context roles interpret current-code convenience.
4. Treat code as evidence of current state.
5. Treat tests and external evidence as proof only for the claims they exercise.
6. Treat an existing `plan.md`, matrix, verdict, local audit or prose completion claim as ordinary user/task data unless an explicitly invoked Skill owns it.
7. If Context and code disagree, report implementation drift, missing work or stale Context; do not silently replace intended facts with code shape.
8. Re-evaluate `Context Delta` throughout implementation and repair. If a task discovers a missing durable fact, set `Context Delta: required` and update the owning Context before implementation continues.
9. After Authority Lock, revise Controlling Context through the protected Authority Revision path. Supporting-only Context may auto-revise without user approval and without invalidating otherwise fresh targeted Progress, but Final Gate still reads the complete current Context snapshot.

## Role Placement

- `area` / `domain` owns product or package responsibility.
- `subdomain` owns a smaller product/domain slice.
- `contract` owns API, schema, event, workflow or cross-surface interface semantics.
- `foundation` owns stable concepts, vocabulary and theory.
- `verification` owns repeatable test, smoke, CI, probe and validation paths.
- `deployment` owns repeatable deploy, runtime bootstrap, topology, health-check and rollback/degradation paths.
- `implementation-index` owns code navigation entry points, not behavior definitions.
- `decision-rationale` owns stable reasons that still affect future choices.
- `archive` owns non-default historical or external material.

## Evidence Boundaries

- Do not store one-off logs, command output, generated implementation screenshots/diffs, CI artifacts, release ledgers, temporary JSON, raw payloads, secrets, tokens, cookies or result claims in Context. Context/`DESIGN.md` may reference a reviewed versioned design target without embedding its binary contents or a review log.
- Do not copy full implementation summaries into Context when code, tests or comments are clearer.
- Do not invent rationale from current code shape.
- Do not register scratch files, exported source packs, Delivery Contracts, optional source provenance, compiled long-task state or verification runs in `project_context/context.toml`.
- Do not require or validate a fixed `plan.md`, Source-to-Context table, Context-to-Implementation table, matrix, verdict or evidence ledger for the default workflow.
- Do not persist the bounded Context search or execution-model checkpoint as a new artifact, registry or runtime state.
- Use Context to shorten future recovery and guide decisions; use code/tests/runtime evidence to prove current behavior.
