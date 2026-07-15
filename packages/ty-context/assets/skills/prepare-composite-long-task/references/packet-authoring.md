# Ready-Frontier Packet Authoring V3

Campaign V6 keeps one immutable `CompositeAuthoringPacketV3` revision chain per SFC. Contract V3 authority schemas and filenames are unchanged. Run `composite-campaign contract --json` before manual inspection; code owns the strict schema.

For every SFC in the ready frontier, the foreground scheduler launches a bounded, read-only, ephemeral `codex exec` authoring worker in the Integration worktree. It passes the known controller model/effort explicitly, disables subagents, supplies the strict Packet output schema and receives the last structured message through a bounded file. No product write or execution state exists. The Packet, not a conversation or process identity, is the handoff to the later execution worker.

The Packet must:

1. Re-read immutable plan, current Scope Fit/coverage, Integration Context and code after dependencies integrate.
2. Preserve every Source Unit and applicable global constraint.
3. Map every Source Unit through Requirement, PI Obligation, AC and Verification Spec with real entity-chain references.
4. Preserve negative assertions, forbidden shortcuts, owner-surface proof, population policy, proof capabilities and counterfactual controls.
5. Use revision 1 with `previous_packet_sha256: null`; later revisions bind the preceding immutable hash.

Worker computation may be concurrent up to the Campaign authoring limit, but Campaign mutation is serialized: the scheduler parses structured output, validates the Packet schema, applies the immutable revision, renders the three Contract V3 inputs and runs preflight as one ordered action per SFC. Invalid output gets at most two repair attempts after the initial attempt; every attempt is a fresh ephemeral worker whose prompt includes the prior structured/schema/preflight findings. Worker exit code or self-reported success cannot bypass schema validation or preflight.

Only factual capacity failure may revise Scope Fit before any execution worker starts. The revised graph/coverage remains subject to all V4 stability and maximality checks. Packet preflight proves authoring/scheduling readiness only; it creates no worktree, final result, Receipt or Campaign acceptance.
