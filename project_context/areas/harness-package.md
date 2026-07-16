# Area Context: harness-package

## Responsibility

- Provide the `ty-context` CLI, Minimal Context/default Workflow assets, validators, migrations, source-sync checks and the explicit Single-Goal Long-Task Workflow.
- Preserve repo-native project intent and repeatable verification without reintroducing lifecycle documents or agent/process/Git orchestration.
- Own one-Contract V2 authoring, compiled Source/REQ/CTRL/OBL/AC coverage and the Live Evidence Kernel that prevents false completion for declared Outcomes on one current Git-tree snapshot.

## User / System Contract

- Product Surface Contract workflow is prompt-level and project-owned; package-managed Skills may guide `context_surface_contract`, but the Harness must not add a surface-specific Context role.
- `init` installs `core-portable` plus `workflow-default`; `ty-context enable long-task` explicitly installs the Long-Task Workflow Skill, Stop Hook and templates. `disable long-task` removes only package-owned long-task assets.
- `sync` refreshes enabled package-managed assets only. `upgrade` applies safe deterministic migrations, including `composite-codex` profile selection to `long-task`, before sync/doctor. Neither command creates or activates a task.
- `ty-context long-task ...` owns the only active one-Contract path. `delivery-set` is a fixed retired tombstone; neither path schedules Agents, Goals, branches or worktrees.
- `delivery-contract.yaml` is the only authoring authority. Optional `source.md` is provenance. New authoring uses inline Outcomes; existing `outcome_files` are physical compatibility only. Compilation generates Global Claims plus Outcome-qualified Result/Requirement/control-field/non-completing/obligation/shortcut Claims, maps Source AC to named Assertions and rejects uncovered, overcompressed or cross-scope references.
- Compact deterministic defaults reduce mechanical YAML without inferring Goal, Source, Context, Outcomes, owners, REQ/CTRL/OBL/AC, proof, risk or external-confirmation semantics. Read-only `preflight` aggregates diagnostics without creating any authority or audit state; only formal Compile creates Authority Lock.
- The current platform Goal owns rolling implementation choices. Harness neither creates nor recovers physical Goals and never starts agents, Codex/AppServer, branches/worktrees, merge/push/PR flows or model retries.
- Compile is static and fail-closed. The first successful compile is Authority Lock; every later change compares with the active snapshot regardless of progress, Receipt, cache or implementation diff. Source/Context/Product/Global/verifier-content authority materials cannot be silently refrozen; reduced Check input coverage and weakened required outputs are Authority Revisions; one canonical path/pattern grammar governs every path-bearing field plus matching/subset/overlap.
- Targeted verify writes repair-only current-snapshot progress and never accepts. Final Gate, Stop and close recompile source authority and rerun the entire Contract on one snapshot.
- Status, progress, Receipts and the workdir compiled cache are audit/recovery projections only. The common-dir Active Authority V3 snapshot is the sole previous-authority source. All active record/marker mutation shares one lock; Final/Verify recheck identity at completion and successful Stop/close uses accepted-identity CAS clear.
- Historical `composite-campaign` and `composite-long-task` names are tombstones only. Historical files are preserved as ordinary files but are never imported, migrated into active state or executed.
- `/normal-long-task` is a retirement pointer; `/long-task-workflow` is the only active long-task Skill.
- Public package surfaces are fully usable in English; Chinese documentation is an aligned translation.
- Runtime floor remains Node.js `>=24`.

## Core Data / API / State

- Command routing: `packages/ty-context/src/commands/index.ts`; long-task command: `commands/long-task.ts`.
- Profile selection: `lib/profiles.ts`, `commands/enable.ts`, `commands/disable.ts`, config and migrations.
- Schema/types/parser/compiler/risk/preflight: `src/schemas/long-task-delivery-v2/**` and focused `lib/long-task-delivery-*`, `long-task-claims.ts` and `long-task-risk.ts` modules.
- Evidence Kernel: focused long-task snapshot, command, assertion, population, binding/counterfactual, verifier, active binding, final gate/receipt/status/resume/Stop modules. Verifier authority separates content hashes from runtime package version/root; explicit revise auto-migrates pure relocation, while byte changes require user approval. Corrupt authority cleanup is available only through `abandon --force-corrupt-state`.
- Managed source/assets/mappings: `.codex/ty-context-managed/**`, `packages/ty-context/assets/**`, `packages/ty-context/source-mappings.yaml`.
- Release/version automation: `tools/sync_release_version.mjs`, release prepare/publish tools and exact-tarball smoke.

## Key Constraints

- No Source Unit, Scope Fit, SFC, Packet, Wave, Integration Branch, campaign receipt/finalizer, worker engine, AppServer, model routing or worktree scheduler in active runtime.
- No cross-file Product/Technical/Acceptance projections and no duplicate plan/Authoring product. Stable local REQ/CTRL/OBL/AC keys are allowed only inside the one Contract and compile to canonical Claims/Assertion references.
- No fixed file-level execution plan in Technical authority; paths/boundaries/obligations are stable constraints, while implementation order is rolling Goal state.
- No target verify acceptance, historical proof splicing, prose/exit-code acceptance, duplicated broad Observation proof or silent risk/scope downgrade.
- No top-level Contract split for one selected delivery, capacity-based Outcome fragmentation, separate Authoring Skill, Preflight Receipt, Coverage authority, execution registry, proof recipe or runner inheritance.
- No package operation may delete user-authored historical campaign/source/contract data.
- Managed-asset changes require build, source sync twice/idempotence, check-source and consumer/package verification.

## Role Context Map

- [Context Model](harness-package/foundation/context-model.md)
- [Workflow Contract](harness-package/contracts/workflow-contract.md)
- [Package-Managed Surface Contract](harness-package/contracts/package-managed-surfaces.md)
- [Minimal Context Rationale](harness-package/decision-rationale/minimal-context.md)
- [Implementation Index](harness-package/implementation-index.md)
- [Verification](harness-package/verification.md)

## Open Risks

- A structurally complete Contract cannot prove undeclared requirements were never omitted.
- Ordinary same-user project state and Hooks are drift protection, not a hostile-host security boundary.
- Public messaging and generated assets can drift unless source/package/docs/tests are changed and verified together.
