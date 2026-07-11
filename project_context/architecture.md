# Architecture Context

This file is the restrained architecture context for the source repository. It is not a full architecture document; keep only durable structure that helps a fresh agent recover system shape quickly.

## System Boundary

- The repository owns the `project-tiny-context-harness` npm package and `ty-context` CLI, package-managed Minimal Context assets, source-sync checks, validators, release automation and delivery benchmark skeleton.
- Consumer projects receive Minimal Context guidance, templates, Skills, Makefile include, validator tool and optional GitHub workflow assets.
- Product quality remains outside Harness ownership and belongs to each project’s tests, CI, smoke checks, hidden probes or human acceptance.

## Component Map

- CLI command layer: `packages/ty-context/src/commands/**`.
- Package behavior libraries: `packages/ty-context/src/lib/**`.
- Managed source assets: `.codex/ty-context-managed/**`.
- Packaged canonical assets: `packages/ty-context/assets/**`, generated from source mappings.
- Source workspace Context: `project_context/**`.
- Composite preparation authoring plane: an explicitly invoked, Git-trackable, user-owned campaign containing sanitized request provenance, current campaign coordination/audit and immutable V2 structured-authoring revisions that deterministically project the three YAML execution authorities. It is project data, not a package-managed asset or default plan-state surface.
- Delivery benchmark skeleton: `examples/delivery-benchmark/**`.

## Data / Control Flow

- `init` creates `project_context/global.md`, `project_context/architecture.md`, `project_context/areas/main.md`, `project_context/areas/main/verification.md`, then runs `sync`.
- `init` also creates `project_context/context.toml`, declaring the default `main` product/domain area and its default `verification` role context for ordinary projects.
- CLI write commands check the configured schema major before writing; unsupported future schemas fail fast with the canonical package-qualified `npx` command hint.
- `upgrade` migrates legacy `project_context/modules/**/*.md` files into `project_context/areas/**/*.md`, creates missing `project_context/context.toml` by registering area Context files, and only rewrites legacy module paths in manifest/global references.
- `sync` reads `packages/ty-context/assets/**` and writes managed guidance, templates, tools and Skills into the configured harness root.
- Skill customization uses separate project-local Skills such as `<harnessRoot>/skills/product_plan/SKILL.md`, `<harnessRoot>/skills/uiux_design/SKILL.md` and `<harnessRoot>/skills/development_engineer/SKILL.md`; `sync` overwrites package-managed default `context_*` Skills and leaves those separate local Skills untouched. Project-local Skill front matter `description` trigger keywords are expected to stay aligned with the default Skill trigger intent and the project `AGENTS.md` role-trigger rule.
- `package sync-source` copies source workspace assets into `packages/ty-context/assets/**`; `package check-source` verifies no drift.
- `validate-context` checks Context recoverability, validates graph metadata, treats non-area roles as semantic labels, and rejects fake verification-result claims.
- `validate-code-modularity` checks touched handwritten source modularity separately from Context recoverability; `validate-harness` composes both gates.
- `validate-plan-contract` checks temporary `plan.md` workflow-contract surfaces for internal consistency, referenced path existence and declared Context-to-Implementation binding. `validate-plan-acceptance` remains an ordinary long-task matrix/verdict consistency check only. Composite V2 owns its integrity and acceptance through its compiler, active verifier, final gate and Stop checker rather than a generic state validator.
- `ty-context composite-long-task ...` is the explicit temporary executor for `/composite-long-task-workflow`. `init` creates the V2 workdir; `compile` builds `compiled-contract.json`; `verify` actively runs affected frozen specs and writes `current-status.json`; `status` renders the current machine state; `final-gate` runs every spec on one new isolated snapshot and atomically writes `final-result.json`; `stop-check` repeats the full final verification before allowing an accepted/externally-blocked exit; `render-goal` produces the thin recovery objective. The active binding is mirrored under `.git` so pointer deletion/retargeting fails closed, while verifier-owned heartbeat/pointer files are excluded from the product snapshot. The agent cannot provide commands, artifacts, evidence records, AC/PI status or closed layers.
- Composite runtime is separated into focused components: strict YAML schema/parser and coverage compiler; context/oracle/verifier manifest freezer; content-addressed snapshot builder; exact command runner; artifact collector; assertion and negative-evidence evaluator; findings/status projector; full final-gate recomputer; Hook stop checker. Each verifier spec runs in a fresh copy derived from the same source snapshot so verifier side effects cannot create cross-spec proof.
- `/prepare-composite-long-task` is an explicit upstream authoring capability, not an extension of the strict executor. It turns a sanitized raw requirement into Scope Fit and stable SFC identities, authors only the dependency-ready SFC through `CompositeAuthoringPacketV2`, renders the three strict YAML authorities deterministically and requires oracle-ready preflight before `handoff_ready`; it does not infer or repair missing execution contract meaning.
- Preparation and execution use separate authority planes. In the tracked plane, immutable sanitized request provenance outranks campaign coordination and append-only audit history; `authoring-packet.json` is the only editable authoring source before handoff, every change creates a new immutable revision, and rendered YAML is its deterministic projection. After handoff, the three YAML files and all registered Context compile into the immutable execution contract; verifier runs remain under `tmp`, and only the current full final run can authorize SFC product completion.
- Handoff freezes matching packet/projection/oracle identities but never creates a Goal. Explicit start creates an idempotent binding from one SFC to one Goal; Goal execution rereads current Context/code and resolves the campaign's candidate Context Delta before implementation. Result recording can only validate and mirror the current final-result identity and snapshot hashes, never compute aggregate campaign completion.
- Campaign writes fail before mutation on unsupported schema majors, unsafe or escaping paths, redaction violations, immutable revision changes, oversize content or optimistic-concurrency conflicts. `init`, `sync` and `upgrade` install or refresh package capability only; they never create, discover, migrate or scan user campaigns.

## Design Rationale

- Minimal Context keeps only durable facts that improve recovery, iteration, debug and requirements changes.
- Architecture deserves one small shared file because system boundaries and component relationships are cross-module facts that code alone can make slow to recover.
- Context graph support is metadata-first: it improves read targeting and validation without turning Harness into a monorepo dependency analyzer or import/path scanner.
- Prompt guidance, Context recoverability validation, composite contract/verifier/final/Stop enforcement, source-sync drift checks and code modularity checks stay separate because each can only prove a different thing: expected agent behavior, recoverable Context shape, declared product acceptance on one snapshot, generated asset consistency or touched-source maintainability risk.
- Legacy stage semantic migration support has been removed now that users have completed migration; Schema v4 upgrade migrations remain safe and narrow.
- Keeping tracked authoring/provenance separate from temporary execution preserves durable source authority without restoring lifecycle state. Keeping the three rendered inputs preserves the intent/obligation/acceptance authority split while the breaking V2 executor replaces the old state/evidence runtime completely.
- A clean-start campaign model is safer than importing historical attachments, partial bundles or old workdirs whose authority and schema cannot be proven; complete legacy three-input bundles already have a compatible strict execution route.

## Constraints And Tradeoffs

- Do not restore lifecycle phases, plan state, stage Skills, work-product trees or phase gates as default package behavior.
- Do not let `sync` perform semantic project rewriting; it refreshes managed assets only.
- Do not let `init`, `sync` or `upgrade` create, scan, import, mutate or delete user-owned composite campaigns.
- Do not retain a Superpowers namespace, hidden compatibility alias, Markdown parser, task-state/evidence reader, dual runtime or old-workdir importer for composite V2.
- Do not let a product task author or modify the oracle, compiler, verifier or Hook that proves the same task; Harness self-development requires an already released baseline or independent CI verifier.
- Do not store Goal/runtime/evidence state in tracked campaigns, infer aggregate campaign product completion, or let campaign/result status override current SFC final gate.
- Keep product/design/development Skill customization project-local through separate Skills, not package-managed default Skill edits or override merging.
- Keep `architecture.md` concise; implementation details belong in code, tests, owner area Context, or verification/deployment role Context only when not obvious and useful for future repeat execution.

## Verification Implications

- `npm test --workspace project-tiny-context-harness`
- `node packages/ty-context/dist/cli.js package sync-source`
- `node packages/ty-context/dist/cli.js package check-source`
- `make validate-harness`
- `git diff --check`

## Open Risks

- Context files can become too broad if architecture notes duplicate code or release history.
- Package assets can drift if source mappings are changed without sync/check.
