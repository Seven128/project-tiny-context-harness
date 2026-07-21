# Area Context: harness-package

## Responsibility

- Provide the `ty-context` CLI, Minimal Context/default Workflow assets, validators, migrations, source-sync checks and explicit Single-Goal Long-Task Workflow.
- Preserve durable project intent and repeatable verification at low recovery cost without adding lifecycle documents, duplicate authority or agent/process/Git orchestration.
- Own one-Contract V2 authoring, compiled Source/REQ/CTRL/OBL/NCOMP/AC coverage and the Live Evidence Kernel that prevents false completion for declared authority on one current Git-tree snapshot.

## User / System Contract

- `init` installs portable core/default workflow. `ty-context enable long-task` installs the optional Source Plan Skill, Long-Task Skill, templates and package-owned Stop Hook; disable removes only package-owned assets.
- `delivery-contract.yaml` is the only Contract authoring file and is non-authoritative until formal Compile. Real marked Source is mandatory; compiled inventories and coverage are projections, not editable state.
- Read-only Preflight and Compile share one activation-safety kernel. Only Compile creates Authority Lock; targeted verify never accepts; Final Gate, Stop and close recompile Source authority and rerun the complete Contract on one snapshot.
- Product Surface/Screen Contract workflow is prompt-level and project-owned through `context_surface_contract` and existing roles; the package must not add a surface-specific Context role. The managed Screen Contract template is optional/on-demand and owns durable per-screen/control semantics only when that depth is reusable.
- Material production UI uses UI Authority Closure plus a conditional Design Authority Check: affected stable surface/control/target keys reconcile screen/surface Context, `DESIGN.md`, one authored token source/generation direction and exact-target/constraint/inspiration references before implementation. An unconfigured starter or implementation-generated screenshot is not production design authority; no required design directory or visual workflow state is added.
- Standalone design generation remains provider-owned. The base package's explicitly triggered `design-resource-authoring` Skill makes the requested output or development content the hard ceiling, accounts for material in-scope UI/UX meaning down through relevant controls, reuses explicit existing coverage and dynamically commissions only the remaining smallest sufficient resources from live Open Design. It neither expands partial development into whole-product design nor requires one artifact per control, a fixed sequence, Open Design/Figma, copied provider logic or Source/Context/code/Contract mutation. Outputs enter development as ordinary external Source; candidates never authorize fidelity, and downstream default/Long-Task workflows own selection reconciliation, durable adoption and evidence.
- The platform Goal owns mutable implementation sequencing. Harness never launches models/agents/AppServer, creates branches/worktrees, merges, pushes, opens PRs or deploys.
- `/long-task-workflow` is the only active long-task Skill. `/normal-long-task`, `delivery-set` and historical composite commands are retirement pointers/tombstones only.
- Runtime floor is Node.js `>=24`; public package behavior is documented in English with aligned Chinese translation.

## Context Loading Contract

- This area root is default because it identifies package responsibility and routing.
- Detailed Context Model, Workflow Contract, package-managed-surface rules and verification paths are `on-demand`, selected by task triggers. Their authority is unchanged; only near-universal read cost is reduced.
- `ty-context doctor` reports the deterministic default Context footprint, exact duplicate default files and `DESIGN.md` authority status as advisory findings, with no new validation or workflow state.

## Architecture And Quality Contract

- Package behavior changes keep implementation, managed source, package assets, Context, `PROJECT_SPEC.md`, public README and behavior tests aligned.
- Default UI guidance routes missing/conflicting durable UI meaning to its one Context/`DESIGN.md` owner or `context_uiux_design`, keeps local fixes/prototypes lightweight and requires project-owned rendered/token/interaction/accessibility/target-runtime verification only for the claims actually declared.
- External design-resource guidance leaves artifact generation to dedicated design capabilities and routes durable adoption/governance to `context_uiux_design`. For an implementation handoff, each material in-scope surface/flow/region/component/control condition maps to existing/generated Source or an explicit non-applicable/excluded/unresolved disposition; this task-local accounting is not a pack, registry or readiness authority. The consuming workflow resolves selection, stable identity, declared coverage and verification binding; no authoring validator can judge aesthetics or create implementation acceptance.
- Risk-triggered architecture decisions resolve owner, unique source of truth, dependency direction, interface/state lifecycle, failure/recovery/compatibility, forbidden shortcuts and project-owned verification.
- Long-Task architecture invariants use existing obligations/constraints/forbidden shortcuts, path/Binding ownership and executable Checks; no architecture-specific authority layer or generic dependency engine is added.
- A Claim that can pass on a proxy while failing in its target runtime uses a current-execution Check in the earliest owning Outcome. Existing input freshness drives coalesced rolling feedback, while the one Final Gate reruns the live Check; no platform-impact fields, per-platform state or per-Outcome rebuild mandate is added.
- Preflight diagnostics may improve repair localization through stable refs, safe repair hints and occurrence counts while remaining read-only.
- Modularity diagnostics identify the responsible function/location while preserving existing thresholds and waiver policy.

## Code Entry Points

- Commands: `packages/ty-context/src/commands/**`.
- Context graph/manifest/doctor/sync: `packages/ty-context/src/lib/context-*`, `doctor.ts`, `sync-engine.ts`.
- Long-task schema/parser/compiler/risk/claims/evidence/authority/final gate: `packages/ty-context/src/schemas/long-task-delivery-v2/**` and `packages/ty-context/src/lib/long-task-*`.
- Managed sources/assets: `.codex/ty-context-managed/**`, `packages/ty-context/assets/**`, `packages/ty-context/source-mappings.yaml`.
- Release/version automation: `tools/sync_release_version.mjs`, release prepare/publish and tarball smoke tools.

## Key Constraints

- No second Contract plan, editable Source Inventory/Coverage authority, SFC/Packet/Wave/Campaign runtime, Worker scheduler, worktree manager, model router or confirmation tracker.
- No fixed file-level execution plan in Contract Technical authority; stable owners, obligations, boundaries, paths, Bindings and proof remain explicit while implementation order stays internal.
- No targeted-verify acceptance, historical proof splicing, prose/exit-code acceptance, silent risk/scope downgrade or executing-Agent approval of protected authority reduction.
- No package operation deletes user-authored historical Source/Contract/Campaign data.
- Managed-asset changes require build, source sync, idempotence, `package check-source` and applicable package/consumer verification.

## Role Context Map

- [Context Model](harness-package/foundation/context-model.md)
- [Workflow Contract](harness-package/contracts/workflow-contract.md)
- [Package-Managed Surface Contract](harness-package/contracts/package-managed-surfaces.md)
- [Minimal Context Rationale](harness-package/decision-rationale/minimal-context.md)
- [Long-Task Workflow Rationale](harness-package/decision-rationale/long-task-workflow.md)
- [Implementation Index](harness-package/implementation-index.md)
- [Verification](harness-package/verification.md)

## Open Risks

- A complete declared Contract cannot prove omitted requirements were never omitted.
- Ordinary same-user state and Hooks are drift protection, not hostile-host security.
- Managed source, package assets, generated copies and public docs can drift without parity and behavior tests.
