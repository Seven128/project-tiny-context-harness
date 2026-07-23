# Screen Contract

## Purpose

This optional on-demand Context records durable responsibility, information hierarchy and interaction semantics for one user-facing screen/surface when a Product Surface Contract is too coarse for future implementation and verification.

A screen may be a Web route, mobile screen, desktop window, game HUD/menu scene, CLI/TUI view, extension panel, kiosk or embedded-device interface. Use only the relevant sections. Do not create a Screen Contract for a semantics-preserving CSS/style fix, one-off UI bug or explicit throwaway prototype.

Write project-specific facts only. Do not copy visual token values, binary targets, implementation screenshots, test logs, raw payloads, implementation summaries or secrets into this file.

## Authority Boundary

- Product Surface Contract owns cross-surface responsibility, main/drilldown placement and shared invariants.
- This Screen Contract owns stable screen hierarchy, regions, state/navigation behavior and durable material-control semantics.
- `DESIGN.md` owns visual-system semantics, the authored token source/generation direction and durable target interpretations.
- Versioned authored design targets own their declared concrete composition for named viewport/mode/state/content conditions.
- Verification Context owns repeatable proof paths. Code is current implementation evidence, not silent design authority.

If these owners conflict, update the stale owner or retain a genuine decision. Do not resolve a conflict from file order, current code shape or an implementation-generated screenshot.

## Screen Identity

- Surface Key:
- Surface / Route / Command:
- Platform:
- Owning Product Domain:
- Primary User Question:
- In-Scope User Tasks:
- Explicit Non-Goals:

## Entry, Exit And Shared State

- Entry Context / Preconditions:
- Entry Points / Deep Links:
- Inherited Shared State:
- Locally Editable State:
- Committed State Changes:
- Exit Outcomes / Destinations:
- Back / Cancel / Interruption Behavior:
- Focus / Selection Restoration:

## Information Hierarchy

Record semantic order and responsibility, not pixel coordinates.

1. Primary judgment:
2. Primary action:
3. Supporting information:
4. Secondary actions:
5. Drilldown / evidence / diagnostics:
6. Information forbidden from permanent main-surface placement:

## Layout Contract

### Regions

| Region Key | Order | Responsibility | Fixed / Scroll / Overlay | Visibility Conditions |
|---|---:|---|---|---|
| `<region-key>` | 1 |  |  |  |

### Spatial And Container Ownership

- Safe-area / system-chrome ownership:
- Fixed or sticky elements:
- Scroll owner and restoration:
- Overlay / modal / sheet owner:
- Map / canvas / media visible-area contract:
- Keyboard / input-method behavior:
- Gesture competition / pointer ownership:

## Control Inventory

Each material control has a stable semantic key. Fill only applicable fields; do not add generic filler for non-applicable states.

### `<control-key>`

- Surface:
- Region:
- Location:
- Control Type:
- Label / Content:
- User Task:
- Visibility:
- Availability:
- Trigger:
- Input:
- Validation:
- Default Value / Restored State:
- Interaction / Commit / Cancel:
- Navigation / Result:
- Loading State:
- Empty / No-Result State:
- Success State:
- Failure / Degraded State:
- Recovery / Retry / Interruption:
- Permission / Denial Path:
- Feedback:
- Accessibility / Keyboard / Focus / Motion Alternative:

## Screen State Variants

Describe composition or responsibility changes, not one-off screenshots.

- Initial / loading:
- Empty / no results:
- Partial / stale / degraded:
- Error / unavailable:
- Permission denied:
- Disabled / saving / mutating:
- Success / confirmation:
- Offline / recovery when applicable:

## Responsive, Mode And Content Variants

- Viewport / size-class boundaries:
- Orientation / window-resize behavior:
- Theme / product-mode differences:
- Text scaling / localization / long-content behavior:
- Reduced motion / contrast / input-mode differences:
- Other explicitly unsupported combinations:

## Navigation And Interaction Contract

- Forward navigation and committed state:
- Back / system-back / predictive-back behavior:
- Deep-link behavior:
- Modal / sheet / popover lifecycle:
- Gesture ownership and accessible alternative:
- Cancellation, interruption and recovery:
- Cross-surface state/version consistency:

## Design Target References

Reference project-native targets; do not embed binary content.

| Target ID | Interpretation | Immutable Adopted Path / URI + Digest | Editable Upstream / Owner / Update Route | Viewport / Platform | Theme / Mode | State / Content Coverage | Selection Basis |
|---|---|---|---|---|---|---|---|
| `<stable-target-id>` | `exact-target` / `constraint` / `inspiration` |  |  |  |  |  |  |

An `exact-target` authorizes fidelity comparison only for its declared conditions. A `constraint` governs only its named rule. `inspiration` does not authorize reproduction. For an adopted exact target/constraint, the immutable locator must be readable and the editable upstream/update route must be verified or explicitly marked as a manual/external boundary. Relevant work opens the resource rather than treating this row as consumption. Update upstream and register a new immutable version/digest; never overwrite the adopted baseline. An implementation screenshot cannot register itself as its own target.

## Verification

- Semantic / information-hierarchy check:
- Control behavior / state check:
- Visual target / layout check:
- Accessibility / focus / motion check:
- Cross-surface shared-state check:
- Target-runtime / native-device check:
- Human or external confirmation boundary:
- Known unproved combinations:

## Stable Design Rationale

- Decision:
- Reason:
- Rejected alternative when still decision-relevant:
- Tradeoff that must guide future changes:

Do not invent rationale from current implementation shape. Record a rejected alternative or tradeoff only when it is durable enough to constrain future screen decisions.

## Registration Example

Use an existing role. A screen owned by one domain normally uses `subdomain` (or the owning `area` file when small); use `contract` only when the screen itself is a cross-area interface.

```toml
[[context]]
path = "project_context/areas/<area>/screens/<screen>.md"
role = "subdomain"
triggers = ["<surface-key>", "<route>", "<screen name>", "<material control key>"]
read_policy = "on-demand"
```

Do not introduce `screen`, `design`, `surface-contract` or another custom role.

## Maintenance Rules

Update this Context when durable screen responsibility, hierarchy, region ownership, navigation/shared-state behavior, responsive/mode semantics or reusable material-control behavior changes.

Do not update it for CSS-only fixes, one-off screenshot findings, generated diffs, temporary audit notes, test logs, command output, implementation summaries, PR notes or rationale inferred only from current code.
