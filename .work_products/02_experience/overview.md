# .work_products/02_experience overview

<!-- generated-by: AI SDLC Harness build_work_product_overviews.py -->
<!-- source-hash: 39fc54d05505e577 -->

Generated artifact. Markdown slices remain the source of truth.

Source hash: `39fc54d05505e577`

## Source Slices

1. [harness_cli_package_experience.md](harness_cli_package_experience.md)

---

## harness_cli_package_experience.md

Source: [harness_cli_package_experience.md](harness_cli_package_experience.md)

# Harness CLI Package Experience

## Scope

- Applicability: cli_or_api_experience
- PRD / Requirement refs: `.work_products/01_product/npm_package_distribution.md`; package init/sync/upgrade/validate/release workflow requirements.
- Surface: `sdlc-harness` CLI, generated Makefile gates, generated `AGENTS.md` guidance and `.work_products/**` handoff files.

## User Journeys

1. New-project author runs `npx sdlc-harness init`, receives a fresh `REQUIREMENT_GATHERING` workflow state, then starts from PRD facts instead of jumping to development.
2. Existing-project adopter runs `npx sdlc-harness init --adopt`, receives a `SPRINTING`-ready workflow state and can immediately reconcile existing code with Harness facts.
3. Configured-root user sets `package.json#sdlcHarness.harnessFolderName`, runs `sync` or `upgrade`, then uses Makefile and Python gates without `.codex` assumptions.

## State Contracts

| State | Expected CLI / Gate Behavior |
|---|---|
| loading | Commands print concise progress lines for created, kept, changed, skipped and blocked files. |
| empty | Empty fresh projects still get lifecycle, plan, `.work_products/**` directories and managed files. |
| error | Missing files, bad markers or invalid root config produce actionable errors naming the failed path. |
| success | Successful commands end with stable PASS-style output such as `doctor complete`, `package source OK` or validator checked messages. |
| permission | Publish, tag and push remain explicit release actions; init/sync/validate do not require registry credentials. |

## Handoff Matrix

| Producer | Consumer | Handoff |
|---|---|---|
| `init` / `sync` | Manager / Agents | `<harnessRoot>/state/lifecycle.yaml`, `<harnessRoot>/state/plan.yaml`, managed Skills and Makefile gates. |
| Python / TS validators | Review / Testing | Deterministic PASS/FAIL output and path-specific error messages. |
| Consumer lab | Release manager | Installed-consumer evidence for `.codex` and configured-root workflows. |

## Responsive And Accessibility Acceptance

- Responsive / breakpoint expectation: CLI output must remain readable in narrow terminals by using short lines, stable paths and compact summaries.
- Accessibility / focus / keyboard / touch expectation: all core package operations are keyboard-first CLI commands and do not require pointer interaction.
- Non-visual boundary: no `DESIGN.md` is required because this package has no visual UI surface.
