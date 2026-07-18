# Area Context: harness-package

## Responsibility

- Provide the `ty-context` CLI, Minimal Context/default Workflow assets, validators, migrations, source-sync checks and explicit Single-Goal Long-Task Workflow.
- Preserve durable project intent and repeatable verification at low recovery cost without adding lifecycle documents, duplicate authority or agent/process/Git orchestration.
- Own one-Contract V2 authoring, compiled Source/REQ/CTRL/OBL/NCOMP/AC coverage and the Live Evidence Kernel that prevents false completion for declared authority on one current Git-tree snapshot.

## User / System Contract

- `init` installs portable core/default workflow. `ty-context enable long-task` installs the optional Source Plan Skill, Long-Task Skill, templates and package-owned Stop Hook; disable removes only package-owned assets.
- `delivery-contract.yaml` is the only Contract authoring file and is non-authoritative until formal Compile. Real marked Source is mandatory; compiled inventories and coverage are projections, not editable state.
- Read-only Preflight and Compile share one activation-safety kernel. Only Compile creates Authority Lock; targeted verify never accepts; Final Gate, Stop and close recompile Source authority and rerun the complete Contract on one snapshot.
- Product Surface Contract workflow is prompt-level and project-owned through `context_surface_contract` and existing roles; the package must not add a surface-specific Context role.
- The platform Goal owns mutable implementation sequencing. Harness never launches models/agents/AppServer, creates branches/worktrees, merges, pushes, opens PRs or deploys.
- `/long-task-workflow` is the only active long-task Skill. `/normal-long-task`, `delivery-set` and historical composite commands are retirement pointers/tombstones only.
- Runtime floor is Node.js `>=24`; public package behavior is documented in English with aligned Chinese translation.

## Context Loading Contract

- This area root is default because it identifies package responsibility and routing.
- Detailed Context Model, Workflow Contract, package-managed-surface rules and verification paths are `on-demand`, selected by task triggers. Their authority is unchanged; only near-universal read cost is reduced.
- `ty-context doctor` reports the deterministic default Context footprint and exact duplicate default files as advisory findings, with no new validation or workflow state.

## Architecture And Quality Contract

- Package behavior changes keep implementation, managed source, package assets, Context, `PROJECT_SPEC.md`, public README and behavior tests aligned.
- Risk-triggered architecture decisions resolve owner, unique source of truth, dependency direction, interface/state lifecycle, failure/recovery/compatibility, forbidden shortcuts and project-owned verification.
- Long-Task architecture invariants use existing obligations/constraints/forbidden shortcuts, path/Binding ownership and executable Checks; no architecture-specific authority layer or generic dependency engine is added.
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
