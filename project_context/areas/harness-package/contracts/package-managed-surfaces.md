---
context_role: contract
read_policy: default
---
# Package-Managed Surface Contract

## Role

This contract defines which repository surfaces are package-managed, generated, source-only or human-facing. Read it before changing managed assets, default Skills, package assets, source mappings, README surfaces, release automation or source sync behavior.

## Surface Ownership

- `.codex/ty-context-managed/**` is the source workspace's managed-source surface for default guidance, Context templates, tools and package-managed Skill sources.
- `packages/ty-context/assets/**` is the packaged canonical asset surface copied from managed source mappings and shipped to consumer projects.
- `.codex/skills/**` contains Skills available in this source workspace. Package-managed default `context_*`, full-project export, Harness upgrade and plan acceptance Skills are generated/sync-overwritten surfaces; project-specific rules must not be edited directly into them.
- `.codex/skills/authoring/**` is source-workspace-only authoring guidance. Do not put authoring-only Skills under `.codex/skills/authoring/**` into package assets.
- `README.md`, `packages/ty-context/README.md`, npm/package metadata and launch/release docs are human-facing package surfaces. They must stay aligned with package behavior and the Minimal Context boundary.
- `PROJECT_SPEC.md` is the full Harness workflow design-spec surface for this source workspace, not a consumer default asset.
- `project_context/**` is the source workspace durable fact surface. It can describe this repository's own package boundaries without becoming consumer default content.
- Composite Campaign V4 source-plan, source-coverage, graph, coordination/audit, immutable packet/schedule revisions, Goal/branch/commit identities, Slice receipt hashes, integration results and verifier-derived final result are Git-trackable user-owned project data created only by explicit preparation. They are not package-managed assets, generated default lifecycle/plan state or Context graph nodes. Mutable compiled contracts, verifier runs, raw command output, resource locks and active workdir state remain temporary rather than tracked campaign data.
- Composite package assets may install or refresh the ordinary project-level Hook and explicit-only Composite Skills. They must not distribute or require a privileged Host Helper, OS service, administrator installer, Credential Manager integration, Host registry, external audit runner or platform release bundle.

## Source Sync Boundary

- `node packages/ty-context/dist/cli.js package sync-source` copies mapped source workspace assets into `packages/ty-context/assets/**`.
- `node packages/ty-context/dist/cli.js package check-source` checks mapped source/package drift.
- Source sync is required after changing package-managed guidance, templates, tools, default Skills, Makefile include, consumer workflow assets or source mappings.
- Source sync is not required for this repository's own `project_context/**`-only changes unless package-managed assets were also touched.
- Public `sync` refreshes package-managed assets only. It must not run semantic migrations, infer business Context, repair project-local Skills or perform whole-project rewriting.

## Generated Skill Boundary

- Package-managed default Skills must remain business-agnostic and Minimal Context oriented.
- Package-managed default Skills include Context authoring Skills, Product Surface Contract support, full-project export guidance, Harness upgrade guidance, the ordinary long-task Skill (`normal-long-task`), the Composite Campaign V4 preparation/orchestration Skill (`prepare-composite-long-task`) and the strict one-Slice Contract V3 worker Skill (`composite-long-task-workflow`).
- Consumer customization belongs in separate project-local Skills such as `<harnessRoot>/skills/product_plan/SKILL.md`, `<harnessRoot>/skills/uiux_design/SKILL.md` or `<harnessRoot>/skills/development_engineer/SKILL.md`.
- Project-local Skill front matter trigger descriptions should stay aligned with the corresponding default Skill and project `AGENTS.md` trigger guidance.
- Do not restore the old override-skill merge mechanism under managed folders.
- Default Skills can provide workflow contracts, reusable thinking paths and temporary artifact rules, but concrete business facts and project-specific surface responsibilities belong in the consumer project's `project_context/**`.

## Consumer Asset Boundary

- `init`, `sync` and `upgrade` may install or refresh managed assets, but they must not generate project-specific product facts, business Product Surface Contract files, stage work-product trees, lifecycle state or phase gates.
- `init`, `sync` and `upgrade` may install or refresh the preparation Skill/CLI capability, but they must never create, discover, scan, import, mutate or delete user-owned composite campaign data. Campaign schema migration is explicit and on demand only.
- `init`, `sync` and `upgrade` may install or refresh the package-managed project-level Hook, but they do not create a lifecycle task-state store or activate a Composite task. The Hook is no-op until an explicit Composite start creates the narrow active binding.
- The package-managed `.github/workflows/harness.yml` is consumer-facing and should run selected Harness gates only; maintainer-only package tests and source-drift checks stay in this source repository. Plan artifact validators are explicit user commands for complex plan surfaces and long-task artifacts, not default consumer workflow gates.
- Source-repository Package CI and trusted publication do not run the Composite Campaign self-test profile. That profile stays available only through explicit maintainer commands and must never be copied into consumer `harness.yml`; automated paths retain their narrower non-test integrity checks.
- Default consumer or maintainer CI must not install privileged services, virtual machines, containers, browser matrices or administrator environments for the pre-stable Composite workflow. Host-security, compatibility and platform-release validation are deferred work outside the current formal package surface.
- Public package surfaces must be fully usable in English. Non-English trigger examples are compatibility additions only.

## Change Impact Rule

When changing public package behavior, managed guidance, default Skills, source sync, validators, release automation, package README or package assets, sweep the same semantic entry across source implementation, managed source, package assets, README/package README, source workspace Context, focused tests and ordinary release smoke as applicable. The pre-stable Composite path does not add a release consumer or platform matrix to this rule.

For source-workspace Context topology changes that do not touch package-managed assets, keep the diff scoped to `project_context/**`, directly related tests and temporary acceptance artifacts.
