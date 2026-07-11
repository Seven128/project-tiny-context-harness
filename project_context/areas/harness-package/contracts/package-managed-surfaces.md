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
- Composite campaign request, coordination, audit and packet-revision files are Git-trackable user-owned project data created only by explicit preparation. They are not package-managed assets, generated default plan state, Context graph nodes or execution/evidence storage.
- Composite managed-Host assets (requirements template, managed Hook, signed Host Helper/worker manifests and OS installers) may be distributed from package-managed source, but the actual system `requirements.toml`, managed directory, service, Host State, keys and registry are admin-installed host surfaces outside repository `sync` ownership. Package `sync` must never claim that copying repo assets established the trust root.
- The external audit repository/package and its GitHub App/check credentials are independently released trust surfaces. The main package may pin and invoke their immutable version/integrity but cannot vendor candidate-modifiable audit code as an equivalent required check.

## Source Sync Boundary

- `node packages/ty-context/dist/cli.js package sync-source` copies mapped source workspace assets into `packages/ty-context/assets/**`.
- `node packages/ty-context/dist/cli.js package check-source` checks mapped source/package drift.
- Source sync is required after changing package-managed guidance, templates, tools, default Skills, Makefile include, consumer workflow assets or source mappings.
- Source sync is not required for this repository's own `project_context/**`-only changes unless package-managed assets were also touched.
- Public `sync` refreshes package-managed assets only. It must not run semantic migrations, infer business Context, repair project-local Skills or perform whole-project rewriting.

## Generated Skill Boundary

- Package-managed default Skills must remain business-agnostic and Minimal Context oriented.
- Package-managed default Skills include Context authoring Skills, Product Surface Contract support, full-project export guidance, Harness upgrade guidance, the ordinary long-task Skill (`normal-long-task`), the Composite Long-Task Preparation Skill (`prepare-composite-long-task`) and the strict Composite Long-Task Workflow Skill (`composite-long-task-workflow`).
- Consumer customization belongs in separate project-local Skills such as `<harnessRoot>/skills/product_plan/SKILL.md`, `<harnessRoot>/skills/uiux_design/SKILL.md` or `<harnessRoot>/skills/development_engineer/SKILL.md`.
- Project-local Skill front matter trigger descriptions should stay aligned with the corresponding default Skill and project `AGENTS.md` trigger guidance.
- Do not restore the old override-skill merge mechanism under managed folders.
- Default Skills can provide workflow contracts, reusable thinking paths and temporary artifact rules, but concrete business facts and project-specific surface responsibilities belong in the consumer project's `project_context/**`.

## Consumer Asset Boundary

- `init`, `sync` and `upgrade` may install or refresh managed assets, but they must not generate project-specific product facts, business Product Surface Contract files, stage work-product trees, lifecycle state or phase gates.
- `init`, `sync` and `upgrade` may install or refresh the preparation Skill/CLI capability, but they must never create, discover, scan, import, mutate or delete user-owned composite campaign data. Campaign schema migration is explicit and on demand only.
- `init`, `sync` and `upgrade` do not create, replace or reset Host registry authority and do not silently install system managed policy. Strict Composite startup only diagnoses the separately installed signed Host Gate and fails closed when it is unavailable.
- The package-managed `.github/workflows/harness.yml` is consumer-facing and should run selected Harness gates only; maintainer-only package tests and source-drift checks stay in this source repository. Plan artifact validators are explicit user commands for complex plan surfaces and long-task artifacts, not default consumer workflow gates.
- Public package surfaces must be fully usable in English. Non-English trigger examples are compatibility additions only.

## Change Impact Rule

When changing public package behavior, managed guidance, default Skills, source sync, validators, release automation, package README or package assets, sweep the same semantic entry across source implementation, managed source, package assets, README/package README, source workspace Context, tests, release smoke and consumer lab as applicable.

For source-workspace Context topology changes that do not touch package-managed assets, keep the diff scoped to `project_context/**`, directly related tests and temporary acceptance artifacts.
