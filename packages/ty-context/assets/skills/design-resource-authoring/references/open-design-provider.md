# Open Design Provider Orchestration

Use Open Design as the generation engine. This Skill supplies a bounded product commission and retrieves results; it does not recreate the provider's prompts, template logic or catalogue.

## Execution priority

1. **Structured Open Design MCP** for discovery, project/run control and artifact retrieval.
2. **Open Design CLI or daemon API** when MCP is unavailable or cannot expose a required current capability but equivalent structured behavior is locally available.
3. **Browser/desktop interaction** only for bootstrap, unavoidable UI-only selection, signed-in provider interaction, visual preview inspection or recovery. Prefer browser-specific control over general Computer Use when both can operate the page.

Do not silently install an MCP server/plugin, alter the user's global Open Design/Codex configuration, sign in, create a paid-provider dependency or expand data disclosure. Explain the exact setup need and obtain separate authorization when persistence or a new disclosure path is required.

## Live capability discovery

Discover rather than remember:

- configured agents and models, including whether Open Design's inner agent is Codex CLI;
- functional skills and plugins;
- rendering templates or project types;
- design systems and their selected project binding;
- specialist paths such as Figma, image, video or 3D/WebGL;
- supported project creation, run, cancellation, file and artifact operations.

Current structured tool names may include `list_agents`, `list_skills`, `list_plugins`, `create_project`, `get_project`, `get_active_context`, `start_run`, `get_run`, `cancel_run`, `list_files`, `get_file` and `get_artifact`. Feature-detect them; tool names and provider versions may evolve.

Functional skills and rendering templates are different registries. Finding `frontend-design` does not prove that a `mobile-app` or `wireframe-mobile-flow` template is installed, and a remembered template ID is not live capability evidence.

### Rendering-template discovery compatibility

Prefer, in order:

1. a live `list_design_templates`-style method/resource when the provider exposes one;
2. an explicit template ID supplied by the current project/user and validated by the provider;
3. a version-guarded structured daemon query that reads the provider's current registry;
4. provider UI inspection when no structured registry is exposed;
5. an honest `unavailable` or degraded-discovery result.

Never vendor a fallback template catalogue or guess a template ID from prior runs. Do not implement a transport helper unless the live host truly lacks a safe structured path; any helper may normalize metadata and transport only.

## Structured commission sequence

1. Record provider version, selected agent/model, functional capability, rendering template, design system and relevant plugin/export readiness as reported live.
2. Reuse an existing task-local project only when its scope and prior inputs match; otherwise create a bounded project.
3. Start a run with the product-specific commission envelope and the provider-native capability identifier.
4. Poll with a bounded cadence. During a long run, report meaningful progress at least once per minute without flooding the user.
5. Preserve run IDs and the latest provider diagnostic. Support cancellation when the user requests it and the provider exposes it.
6. Resolve the actual entry explicitly, retrieve the artifact/source, inspect it according to intent and preserve its immutable identity before later iterations or handoff.

Open Design may launch Codex CLI as its configured inner agent. That is provider execution, not recursive invocation of this outer Skill. Do not hardcode a model when the provider can report the current configured model.

## Separate three kinds of state

### Provider execution state

Examples: queued, running, succeeded, failed, cancelled, timed out or unknown.

### Artifact readiness

Examples: missing, partial, corrupt, retrievable, rendered or snapshot-preserved.

### Design suitability

Examples: unreviewed, scope-sane, handoff-checked, human-selected or rejected.

Never collapse these into one “success.” A provider success does not prove a good design; a complete artifact can exist even when a provider run later fails.

Use these qualifiers when needed:

- `artifact-ready/run-unreconciled`: a complete retrievable artifact exists, but the provider run remains nonterminal or inconsistent;
- `artifact-ready/provider-failed`: the artifact remains complete and retrievable, but the provider later reports failure/timeout.

In both cases preserve the exact run locator, last update, failure diagnostic and artifact hash. Do not claim provider success or downstream acceptance. Retry only when the promised resource is incomplete/corrupt or the user requests another attempt; do not discard a useful independently inspected artifact merely because the terminal state differs.

## Explicit entry and immutable identity

Provider project metadata may omit or stale its entry file. Resolve in this order:

1. validate an explicit project entry path when present;
2. enumerate project files;
3. identify the intended provider-native entry from the current run/output rather than guessing;
4. retrieve that exact file/artifact;
5. preserve an SHA-256 digest or immutable snapshot before selection/handoff.

A preview URL is mutable navigation, not immutable identity. It may be reported for convenience only beside project/run/entry provenance and a digest. If the user explicitly selects the resource for durable use, export or snapshot it to a user-approved location; never silently choose a repository path.

## Review proportional to intent

- **Exploration:** open/render the requested entry, confirm artifact count/scope and obvious corruption, then show it. Do not launch a packaging or validator sequence.
- **Handoff:** additionally inspect relevant structure, key states/transitions, viewport behavior, obvious console/runtime errors and requested interaction hooks. State exactly what was and was not checked.
- **Selected-source preparation:** require explicit human selection basis, preserve identity/snapshot, and prepare downstream metadata. It still does not verify production behavior.

Provider self-checks, outer artifact sanity review and downstream project verification are separate evidence layers. Never claim native rendering, accessibility, responsive coverage, product correctness or acceptance unless the appropriate downstream project checks actually prove them.

## Figma and other specialist paths

Figma is optional. Select it only when editable collaboration or library handoff materially benefits the request and a real connector/plugin/export path plus authentication is operational. A listed plugin, skill description or catalogue entry is not proof that editable Figma export works.

If Figma is requested but unavailable:

- report the missing connector/auth/export capability precisely;
- offer a non-Figma artifact only when it still answers the user's design decision;
- never relabel HTML, an image or a manifest record as an editable Figma design.

Apply the same capability/readiness rule to image, video, 3D/WebGL and other specialist providers.

## Failure and recovery

- Preserve provider diagnostics; do not replace failures with generated placeholders.
- Avoid unbounded polling or repeated blind reruns.
- Re-discover capability after provider upgrades or registry mismatches.
- If structured paths fail but a UI artifact exists, UI inspection may recover it while retaining the degraded-provider qualifier.
- If the provider is unavailable and no justified fallback exists, return `unavailable` with the minimum setup needed rather than generating with an unrelated image tool and calling it equivalent.
