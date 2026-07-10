# Current-SFC Packet Authoring

## Authority

Author only the current dependency-ready SFC as `CompositeAuthoringPacketV1`. Run `ty-context composite-campaign contract --json` immediately before authoring; the returned descriptor owns required fields, types, enums, canonical filenames, order, and hash. This reference explains semantics, not a duplicate field whitelist.

Use the raw request, chosen Scope Fit slice, current project Context/code, and explicit user decisions as sources. Keep source references and uncertainty visible. Context Delta in the packet is a candidate; the future Goal executor resolves it against then-current Context before implementation.

Use this code-validated envelope and fill authority `fields` from `composite-campaign contract --json` rather than a copied whitelist:

```json
{
  "schema_version": "composite-authoring-packet-v1",
  "campaign_id": "<id>", "slice_id": "SFC-001", "revision": 1,
  "created_at": "<ISO timestamp>", "request_sha256": "<request hash>",
  "previous_packet_sha256": null,
  "input_contract": { "schema_version": "composite-input-contract-v1", "contract_sha256": "<contract hash>" },
  "context_delta_candidate": { "product": "none | required", "technical": "none | required", "notes": [] },
  "authorities": {
    "product_architecture_source": { "fields": {} },
    "technical_realization_plan": { "plan_items": [{ "id": "PI-001", "title": "...", "fields": {} }] },
    "acceptance_checklist": { "acceptance_criteria": [{ "id": "AC-001", "title": "...", "fields": {} }] }
  }
}
```

Revision 1 uses `previous_packet_sha256: null`; later revisions increment `revision` and bind the preceding packet hash. Campaign/request/slice/revision identities must come from the current campaign, never chat memory.

## Semantic Invariants

- Product source preserves intent, owner boundary, primary capability path, delivery/population boundary, out-of-scope backlog, and every non-completing outcome.
- Plan items are executable capability changes with trigger, state transition, observable result, implementation surfaces, assertion support, forbidden shortcuts, and reciprocal AC links.
- Acceptance items distinguish what they validate and do not validate, required proof layers, executable assertions and artifacts, positive and negative assertions, machine blocking, invalid completion signals, and reciprocal PI links.
- Representative samples validate only the declared sample boundary. They never imply full-population operation.
- Every Product non-completing outcome must remain blocking or explicitly non-completing in linked PI/AC semantics.
- Do not weaken acceptance, omit negative assertions, invent unsupported commands, or turn prose/manual review into machine proof.

## Publish, Render, Preflight

Write the packet JSON in-root and run:

```text
ty-context composite-campaign apply-packet --campaign <path> --slice <id> --input <packet.json>
ty-context composite-campaign render --campaign <path> --slice <id>
ty-context composite-campaign preflight --campaign <path> --slice <id> --json
```

Rendering is deterministic. Do not hand-write or repair `product-architecture-source.md`, `technical-realization-plan.md`, or `acceptance-checklist.md`.

For a preflight failure, map structured diagnostics back to source facts. Repair the packet by publishing a new revision, which is immutable after publication, then render and preflight again. Never mutate an old revision, backfill a field with generic filler, delete a non-completing condition, or relax an assertion merely to make validation pass. If the missing fact requires a material user decision, stop and ask. If evidence cannot support a valid packet, report the exact unresolved diagnostics and do not hand off.

## Review

Before handoff, review the current packet plus all three rendered projections for intent preservation, scope boundary, reciprocal PI/AC coverage, executable verification, invalid-completion protection, and current Context/code relevance. A passing preflight proves contract consistency only; it does not prove the proposed product or implementation is correct.
