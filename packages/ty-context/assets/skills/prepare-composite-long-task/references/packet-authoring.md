# App Server Ready-Frontier Packet Authoring V3

Campaign V5 keeps one immutable `CompositeAuthoringPacketV3` revision chain and one persistent App Server thread per SFC. Contract V3 authority schemas and filenames are unchanged. Run `composite-campaign contract --json` before manual inspection; code owns the strict schema.

For every SFC returned by `author_packets`, the adapter concurrently starts/resumes its persisted thread and runs a read-only Authoring Turn in the Integration worktree. A known controller model/effort is passed explicitly; an unknown profile is recorded and left unchanged, never guessed. No Goal exists, network/product writes are disabled, and `outputSchema` requires the complete Packet.

The Packet must:

1. Re-read immutable plan, current Scope Fit/coverage, Integration Context and code after dependencies integrate.
2. Preserve every Source Unit and applicable global constraint.
3. Map every Source Unit through Requirement, PI Obligation, AC and Verification Spec with real entity-chain references.
4. Preserve negative assertions, forbidden shortcuts, owner-surface proof, population policy, proof capabilities and counterfactual controls.
5. Use revision 1 with `previous_packet_sha256: null`; later revisions bind the preceding immutable hash.

Turn computation is concurrent, but Campaign writes are serialized: structured parse, `apply-packet`, render and preflight complete as one ordered commit per SFC. Invalid output receives at most two repair Turns in the same thread. Only factual capacity failure may revise Scope Fit before any Goal; the revised graph/coverage remains subject to all V4 stability and maximality checks.

Packet preflight validates Contract V3 coverage, oracle paths, Source Unit entity chains, source/global bindings and the concrete conflict profile. Passing preflight proves authoring/scheduling readiness only. It creates no Goal, run, Slice result or Campaign acceptance. The same thread is retained for the later Goal Execution Turn.
