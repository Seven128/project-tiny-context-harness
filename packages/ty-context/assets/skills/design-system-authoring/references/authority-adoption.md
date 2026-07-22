# Design-System Authority Adoption

Adopt one explicitly selected Open Design result through existing Minimal Context owners. This is a reconciliation step, not a new authority lifecycle.

## Preconditions

- Selection is explicit, or the user explicitly delegated selection and the stated criteria support one defensible choice.
- The exact provider design-system ID and selected revision/body are readable.
- `DESIGN.md`, generated token artifacts and relevant preview/workspace files have been inspected.
- The selected content has a stable digest or user-approved snapshot.
- Conflicts with product/surface Context are resolved or remain an explicit decision; provider output never silently overrides product meaning.

## Single-owner writeback

Use these owners:

- `project_context/**`: durable surface responsibility, information hierarchy, navigation, stable interaction/state, product accessibility requirements and repeatable verification entrypoints;
- root `DESIGN.md`: visual principles, typography, color, spacing, radius, elevation, motion rationale, component visual semantics, token-source declaration and interpretation of design references;
- one project-native authored token source or one explicit generation direction: exact values consumed by implementation;
- selected authored targets: concrete composition/condition coverage, kept as ordinary versioned project Source.

Do not copy the same fact into several owners. Open Design metadata is provenance only.

## Adoption procedure

1. Read the project's `DESIGN.md` format and lint expectations. Preserve valid project-specific content unless the user explicitly authorized replacement.
2. Reconcile selected provider semantics against controlling Context. Provider-invented business, permission, data or algorithmic rules are excluded unless independently authorized by product Source.
3. Write the selected visual system into `DESIGN.md` and declare exactly one authored exact-value token source or generation direction. Avoid style-only adjectives without implementation meaning.
4. Record provider provenance in a normal `DESIGN.md` section unless the format explicitly permits metadata fields. Include provider name/version, design-system ID, selected revision when applicable, selection basis, source/snapshot locator and SHA-256 digest. State that project files are canonical.
5. Update only relevant Context when durable surface/interaction/verification facts changed. Use stable surface/control/target keys to connect owners without duplicating the visual prose.
6. Put concrete selected targets/tokens in project-native versioned paths selected by the user or existing project convention. Never silently choose a repository directory merely because Open Design has a mutable workspace.
7. Accept the selected provider revision if one exists, then re-read the MCP design-system resource and compare its identity/body or digest with the adopted selection.
8. Verify downstream project binding by creating or reading a provider project with the selected ID. Provider mismatch is a synchronization problem, not evidence that project Design Authority is absent.

## Validation

Run the repository-owned Design Authority lint, Context validation and token generation/check paths. At minimum confirm:

- `DESIGN.md` is no longer an unconfigured starter;
- exactly one authored token source/generation direction is declared and resolvable;
- provenance points to the selected provider ID/revision/digest;
- no competing design-system authority or duplicate token owner was introduced;
- MCP can read the provider design system;
- a downstream Open Design project reports the matching `designSystemId`;
- candidate resources remain candidates unless independently selected.

Report changed owners and validation results. Do not claim production visual acceptance from these checks.
