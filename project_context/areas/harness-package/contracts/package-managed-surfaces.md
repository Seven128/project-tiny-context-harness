---
context_role: contract
read_policy: default
---
# Package-Managed Surface Contract

## Role

This contract defines which repository surfaces are package-managed, generated, source-only or human-facing. Read it before changing managed assets, default Skills, package assets, source mappings, README surfaces, release automation or source sync behavior.

## Surface Ownership

- `.codex/ty-context-managed/**` is the source workspace's managed-source surface for portable/default guidance, Context templates, tools, profile metadata and package-managed Skill sources.
- `packages/ty-context/assets/**` is the packaged canonical asset surface. Installation selects profiles: `core-portable` and `workflow-default` are default; `composite-codex` is explicit.
- `.codex/skills/**` contains Skills available in this source workspace. Package-managed default `context_*`, full-project export, Harness upgrade and plan acceptance Skills are generated/sync-overwritten surfaces; project-specific rules must not be edited directly into them.
- `.codex/skills/authoring/**` is source-workspace-only authoring guidance. Do not put authoring-only Skills under `.codex/skills/authoring/**` into package assets.
- `README.md`, `packages/ty-context/README.md`, npm/package metadata and launch/release docs are human-facing package surfaces. They must stay aligned with package behavior and the Minimal Context boundary.
- `PROJECT_SPEC.md` is the full Harness workflow design-spec surface for this source workspace, not a consumer default asset.
- `project_context/**` is the source workspace durable fact surface. It can describe this repository's own package boundaries without becoming consumer default content.
- Composite Campaign V5 source-plan, Source Unit coverage, Scope Fit V4 graph, execution-host/thread coordination and audit, immutable packet/schedule revisions, Goal/branch/commit identities, Slice receipt hashes, integration results and verifier-derived final result are Git-trackable user-owned project data created only by explicit preparation. They are not package-managed assets, generated default lifecycle/plan state or Context graph nodes. Mutable compiled contracts, verifier runs, raw command output and active workdir state remain temporary rather than tracked campaign data. The local Fake App Server is a maintainer test asset, never a consumer runtime fallback.
- Composite package assets are shipped but only `ty-context enable composite-codex` installs/refreshes Codex Hooks, Composite Skills and Campaign CLI surfaces. `ty-context disable composite-codex` removes package-owned Hooks/handlers/skills without deleting user Hooks or portable/default capability. Non-Codex default installation must not write Codex-only Hooks. Composite assets must not require privileged Host infrastructure.

## Source Sync Boundary

- `node packages/ty-context/dist/cli.js package sync-source` copies mapped source workspace assets into `packages/ty-context/assets/**`.
- `node packages/ty-context/dist/cli.js package check-source` checks mapped source/package drift.
- Source sync is required after changing package-managed guidance, templates, tools, default Skills, Makefile include, consumer workflow assets or source mappings.
- Source sync is not required for this repository's own `project_context/**`-only changes unless package-managed assets were also touched.
- Public `sync` refreshes package-managed assets only. It must not run semantic migrations, infer business Context, repair project-local Skills or perform whole-project rewriting.

## Generated Skill Boundary

- Package-managed default Skills must remain business-agnostic and Minimal Context oriented.
- Package-managed default portable Skills include Context authoring, Product Surface Contract, full-project export, Harness upgrade and ordinary long-task guidance. `prepare-composite-long-task` and `composite-long-task-workflow` belong to the explicit `composite-codex` profile.
- Consumer customization belongs in separate project-local Skills such as `<harnessRoot>/skills/product_plan/SKILL.md`, `<harnessRoot>/skills/uiux_design/SKILL.md` or `<harnessRoot>/skills/development_engineer/SKILL.md`.
- Project-local Skill front matter trigger descriptions should stay aligned with the corresponding default Skill and project `AGENTS.md` trigger guidance.
- Do not restore the old override-skill merge mechanism under managed folders.
- Default Skills can provide workflow contracts and reusable thinking paths, but concrete business facts belong in the consumer project's Context. The default Workflow Contract does not require a fixed plan, mapping table, matrix or verdict artifact.

## Consumer Asset Boundary

- `init`, `sync` and `upgrade` install/refresh only enabled profiles and must not generate project semantics, plan artifacts, lifecycle state or campaigns. Explicit `enable composite-codex` installs capability only; it does not activate a task or scan campaign data.
- Consumer `.github/workflows/harness.yml` runs selected portable Harness gates only and never package Composite self-tests. Source-repository PR/main/publish gates run the complete default and Composite suites, while local default `npm test` excludes Composite self-tests. Publication packs once and verifies the exact tarball plus Release Artifact V2 environment/lockfile identity in an empty repository. These maintainer gates are not copied into consumer workflows.
- Default consumer or maintainer CI must not install privileged services, virtual machines, containers, browser matrices or administrator environments for the pre-stable Composite workflow. Host-security, compatibility and platform-release validation are deferred work outside the current formal package surface.
- Public package surfaces must be fully usable in English. Non-English trigger examples are compatibility additions only.

## Change Impact Rule

When changing public package behavior, managed guidance, default Skills, source sync, validators, release automation, package README or package assets, sweep the same semantic entry across source implementation, managed source, package assets, README/package README, source workspace Context, focused tests and ordinary release smoke as applicable. The pre-stable Composite path does not add a release consumer or platform matrix to this rule.

For source-workspace Context topology changes that do not touch package-managed assets, keep the diff scoped to `project_context/**`, directly related tests and temporary acceptance artifacts.
