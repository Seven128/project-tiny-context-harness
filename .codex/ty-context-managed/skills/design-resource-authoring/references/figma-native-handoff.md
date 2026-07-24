# Figma-Native Design Resource Input

Use this reference only when a supplied or selected resource is native Figma input, or when the user explicitly asks for a Figma deliverable. Figma is an optional high-density source of inspectable UI/UX facts; it is not a prerequisite, a workflow authority or a replacement for the provider-neutral implementation handoff.

## 1. Establish an operational boundary

Feature-detect the current Figma connector and tools instead of assuming remembered names or availability. Confirm:

- the selected account can read the exact file, version and node set;
- authentication and disclosure are already authorized for this task;
- native design context, metadata, variables, screenshots and any needed motion, asset or Code Connect capabilities are operational;
- applicable plan, seat, rate limit and Code Connect constraints are known; and
- the chosen path can produce repository-readable immutable input rather than only a mutable link.

A catalogue entry, plugin description, URL, file thumbnail or metadata-only response is not operational proof. Do not install or persistently configure a connector, change authentication or add a disclosure path without separate authorization. If the native path is unavailable, say which capability is missing and use another resource only when it preserves the requested design decision; never relabel HTML, an image or a flattened export as native Figma.

## 2. Pin the selected identity before extraction

Record the editable upstream owner and locator separately from the selected implementation identity. The selected identity includes:

- exact file key or equivalent stable file identity;
- explicit immutable Figma version;
- selected node IDs, not only a page or canvas name;
- declared platform, viewport, mode, state, content, input and motion conditions;
- selection basis and whether the target is `exact-target`, `constraint` or supporting Source; and
- the authorized repository destination for frozen inputs.

A latest-only link, branch head, page name, screenshot or unversioned node reference cannot authorize an affected fidelity claim. If Figma exposes an exact version through its REST file/node endpoints, use it. Otherwise create an approved immutable export or capture and record why it is equivalent for the declared conditions.

## 3. Acquire small, addressable node sets

Large frames and undifferentiated canvas requests can time out, truncate results or omit relationships. Start with the smallest logical surface, component family, flow slice or node set that closes the declared gap. Use a staged acquisition sequence and explicitly route each needed fact to the corresponding current tool:

1. Call `get_metadata` on the selected logical node or small selection to discover structure and child node IDs.
2. Call `get_design_context` for the exact implementation-relevant node set and declared conditions.
3. Call `get_variable_defs` for applicable Variables, styles and token mappings.
4. Call `get_screenshot` for a visual reference of each selected condition; a screenshot supplements structured facts and never replaces them.
5. Call `get_motion_context` when transition or motion meaning is material and the tool is available.
6. Use `download_assets` for exact icons, illustrations, images or other bespoke assets rather than substituting placeholders.
7. Retrieve the Code Connect map or equivalent when Code Connect is available and materially maps Figma Components to repository components.

Tool names can evolve, so feature-detect compatible current tools while preserving the semantic sequence. If the response is incomplete or truncated, split the request into smaller nodes instead of accepting partial context. Batch compatible reads, cache immutable results and handle `429` or another rate limit explicitly; do not use unbounded polling or blind retries.

## 4. Prefer implementation-readable Figma structure

When the upstream file can be improved within the authorized scope, follow Figma's implementation-context guidance:

- model reusable UI with Components and Variants rather than disconnected copies;
- use Variables or explicit token mappings for reusable values and modes;
- use Auto Layout for intended sizing, spacing and responsive relationships;
- give layers and components semantic names that communicate role rather than appearance alone;
- add Annotations or development resources for non-obvious intent and implementation notes;
- keep logical sections and component sets small enough for addressable inspection; and
- use Code Connect when it is operational and materially links the selected design component to its real repository implementation.

These practices improve extraction quality but do not create product, Design or Contract authority. Code Connect is plan/seat dependent and must remain explicit when unavailable.

## 5. Freeze reproducible repository input

Preserve every selected native result at an authorized project path in a form the consuming Agent and checks can read without a live Figma session. The capture may contain structured design context, metadata, variable/token definitions, screenshots, motion descriptions, assets, Code Connect mappings and an extraction manifest as applicable. Record:

- provider/tool version and acquisition timestamp;
- exact file/version/node/condition provenance for every artifact;
- repository-relative path, media type and exact SHA-256;
- addressable node, property, variant, transition, annotation or asset locators;
- completeness and truncation status for each requested tool result; and
- editable upstream owner, locator and update/export route.

Keep editable upstream and immutable selected input distinct. Never overwrite an adopted baseline: update upstream, capture a new immutable version, obtain the required selection/adoption and update the owning reference. If the upstream later becomes unavailable but the immutable input remains readable, existing declared conditions may still be consumed; requested resource changes become a named manual or external boundary.

Missing version or node identity, mutable-only resources, unreadable files, stale hashes, oversized or truncated extraction, unresolved permission, incomplete tool results or contradictory conditions fail closed for the affected claim.

## 6. Compile the residual structured handoff

Native Figma facts reduce manual transcription; they do not eliminate semantic and coverage work. A selected implementation handoff still contains exactly one provider-neutral `design-resource-handoff-v1` block. Treat it as the residual handoff:

- reference addressable Figma-native facts and frozen paths instead of manually retyping every size, distance, border, color or component property;
- close all eight dimensions and distinguish `not_applicable` or `excluded_by_scope` from missing, `decision_required` or `unavailable`;
- state scope, necessary context, exclusions and declared conditions;
- preserve product, data, permission, recovery and error semantics owned by product or technical Source;
- record accessibility, input, responsive and motion meaning not actually modeled in Figma;
- retain unresolved facts, limitations and target-local acceptance blockers; and
- bind covered facts to Source Items and project verification methods.

Run `ty-context design-resource preflight <handoff.md>`. Preflight proves semantic-input completeness and resource integrity only. A native connector result, successful extraction, Code Connect mapping, screenshot, digest or passing handoff preflight never proves production conformance.

## 7. Preserve the downstream proof chain

The existing provider-neutral chain remains authoritative:

```text
selected Figma file/version/nodes/conditions
  -> repository-readable immutable capture
  -> residual design-resource-handoff-v1
  -> Context-reachable selected target
  -> Source Claims and applicable Controls/surface_bindings
  -> production route/component owner and cold-start journey
  -> independently failing design_conformance, interaction and target-runtime checks
  -> default Contract Conformance or the sole Long-Task Final Gate
```

Figma contributes Source facts; the handoff detects omission and binds residual meaning; Context and Contract owners adopt durable meaning; project checks falsify implementation drift. No step may substitute for a later one, and this profile creates no Figma-specific schema, pack, registry, Claim kind, readiness state, second Authority, second Gate or acceptance lifecycle.

## Official basis

This guidance was reconciled with Figma's official documentation on 2026-07-24:

- [Figma MCP server](https://developers.figma.com/docs/figma-mcp-server/)
- [Tools and prompts](https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/)
- [Structure your Figma file](https://developers.figma.com/docs/figma-mcp-server/structure-figma-file/)
- [Avoid large frames](https://developers.figma.com/docs/figma-mcp-server/avoid-large-frames/)
- [Code Connect](https://developers.figma.com/docs/code-connect/)
- [REST file endpoints](https://developers.figma.com/docs/rest-api/file-endpoints/)
- [REST API rate limits](https://developers.figma.com/docs/rest-api/rate-limits/)
- [Trigger specific MCP tools](https://developers.figma.com/docs/figma-mcp-server/trigger-specific-tools/)
