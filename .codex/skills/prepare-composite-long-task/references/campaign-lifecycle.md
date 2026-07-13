# Campaign V5 App Server, Git, Goal, Integration, And Recovery Lifecycle

## Host And Routing

`composite-campaign run` launches local `codex app-server --listen stdio://`, initializes JSONL RPC, reads `model/list` and persists App Server version, catalog hash and controller profile. App Server is required; there is no manual/Fake fallback in real execution.

Only a catalog-resolved `gpt-5.6-sol / xhigh|max`, or an explicit catalog upgrade-chain successor at `xhigh|max`, routes execution to `gpt-5.6-sol / medium`. Sol below the threshold, Terra/Luna/other models, unknown profiles and unavailable Sol-medium targets pass through unchanged with a persisted reason. Authoring always uses the known controller profile. Every later Turn explicitly repeats its persisted profile.

## Baseline, Threads, And Wave Launch

Before execution, Git baseline logic validates identity/unfinished operations, protects against obvious raw credentials, checkpoints allowed dirty state, freezes `base_commit` and creates the Integration worktree. All serial/parallel SFCs use owned worktrees; a wave shares one base and later waves use the current Integration head.

Each SFC has exactly one persistent App Server thread. Its read-only Authoring Turn occurs before Goal creation. After Packet preflight, the CLI materializes the Slice worktree, Contract V3 inputs and Goal Manifest V2, validates the generated objective is at most 4000 characters, resumes the same thread, sets its Goal, switches cwd to the Slice worktree and starts a `workspaceWrite` Turn with writable roots limited to that worktree. All initial wave Turns start before any is awaited.

The worker compiles Contract V3, implements only allowed bindings, verifies/repairs, commits cleanly, then runs final-gate. `needs_work` findings start another explicit-profile Turn in the same thread. Interruption resumes the same Goal/thread/worktree. Only a current accepted result can produce the receipt; then the server/local Goal becomes complete.

## Merge, Repair, And Final Authority

Accepted Slice branches merge to Integration in stable SFC order with base/head/receipt/contract integrity checks. Merge conflict, Integration Gate regression and Campaign Final Gate regression each use an independent execution-profile repair thread/worktree. Repair preserves all affected Packets/requirements/ACs, cannot alter Scope Fit or Packets, commits cleanly, and is applied only against the unchanged repair base.

After each merge, Integration Gate reruns affected Slice and cross-SFC evidence. After every SFC becomes `integration_verified`, Campaign Final Gate materializes all current Packets on one Integration snapshot, validates source/global coverage and reruns all bindings/specs/counterfactuals. It is the sole Campaign completion authority. A moved target forces resynchronization and revalidation before final integration. Cleanup removes only owned validated worktrees/branches.

## Recovery

Persist controller catalog/profile, thread IDs, routing, authoring/execution Turn IDs, Goal objective hash/status, launch token, phase and last failure. On App Server loss, reconnect once, `thread/resume`, `thread/read` and `thread/goal/get`, then reconcile known server/local identities. Recover an unpersisted correlated Turn only when exactly one candidate exists. Restore server Goal completion from accepted local state. Apply the same rules to repair threads.

If a thread/start or Turn launch may have reached the server but cannot be uniquely correlated, fail closed as `ambiguous_host_thread_launch`/`ambiguous_host_turn_launch`; never create duplicate work. A second server failure or missing external authorization becomes `wait_external`. V4 campaigns remain status/audit data and cannot enter automatic V5 execution.

Use `app-server-check`, `model-routing`, `threads` and `interrupt` for diagnostics/control. The one real App Server smoke is manual and non-CI: one SFC authoring Turn -> Goal -> execution Turn -> accepted. Default tests use the local Fake JSONL server.
