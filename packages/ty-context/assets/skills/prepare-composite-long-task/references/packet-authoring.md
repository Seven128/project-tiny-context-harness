# Current-SFC Packet Authoring V2

Author only the selected dependency-ready SFC as `CompositeAuthoringPacketV2`. Run `ty-context composite-campaign contract --json` immediately before authoring; code owns the three strict authority schemas and canonical YAML filenames.

```json
{
  "schema_version": "composite-authoring-packet-v2",
  "campaign_id": "<id>",
  "slice_id": "SFC-001",
  "revision": 1,
  "previous_packet_sha256": null,
  "authorities": {
    "product_architecture_source": { "schema_version": "product-source-v2" },
    "technical_realization_plan": { "schema_version": "technical-plan-v2" },
    "acceptance_checklist": { "schema_version": "acceptance-checklist-v2" }
  }
}
```

Revision 1 uses `previous_packet_sha256: null`; later revisions bind the preceding immutable packet hash. V1 packets are rejected without compatibility parsing.

Product requirements, boundaries and non-completing outcomes must map to atomic plan obligations, ACs and executable verifier specs. Preserve negative assertions, forbidden shortcuts, owner UI browser proof and full-population enumerators. Do not weaken acceptance, invent commands or turn prose/manual review into proof.

```text
ty-context composite-campaign apply-packet --campaign <path> --slice <id> --input <packet.json>
ty-context composite-campaign render --campaign <path> --slice <id>
ty-context composite-campaign preflight --campaign <path> --slice <id> --json
```

Rendering deterministically writes the three YAML authorities. Do not hand-edit their projections. If preflight fails, repair the packet in a new revision; do not mutate an old revision, drop a negative condition or relax an oracle. Stop for a material missing user decision.

Before handoff, review intent preservation, population/scope boundaries, Product→obligation→AC→verifier coverage, negative coverage, oracle provenance and current Context/code relevance. Passing preflight proves contract consistency only.
