# Ready-Frontier Packet Authoring V3

Author every SFC returned by `advance.action=author_packets`, but keep one immutable `CompositeAuthoringPacketV3` revision chain per SFC. Run `composite-campaign contract --json` immediately before authoring; code owns the three strict V3 authority schemas and filenames.

Packet revision 1 uses `previous_packet_sha256: null`; later revisions bind the preceding immutable Packet hash. Legacy Packet schemas are rejected without compatibility parsing.

For each current frontier SFC:

1. Re-read the current Integration Branch Context/code after all dependencies are integration-verified.
2. Map its source refs and applicable global constraints into Product requirements, plan obligations/bindings, ACs, proofs, specs and counterfactual controls.
3. Preserve negative assertions, forbidden shortcuts, owner-surface proof, population policy and source/global constraint boundaries.
4. Publish with `apply-packet`, then run `render` and `preflight --json`.
5. Repair invalid authoring through a new Packet revision; never hand-edit rendered YAML or weaken an oracle to pass.

Packet preflight provides the final scheduling profile from implementation bindings, verification `input_paths`, schema/route/runtime keys, command steps, counterfactual fixtures, Context refs and declared resource locks. The CLI, not model prose, decides parallel placement.

The three rendered files remain separate authorities. Passing preflight proves contract consistency and scheduler input readiness only; it creates no Goal, run, Slice result or Campaign acceptance.
