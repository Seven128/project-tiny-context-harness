# Campaign V5 App Server, Git, Goal, Integration, And Recovery Lifecycle

## Host And Routing

`composite-campaign run` launches local `codex app-server --listen stdio://`, initializes JSONL RPC, reads `model/list` and persists App Server version, catalog hash and controller profile. App Server is required; there is no manual/Fake fallback in real execution.

Only a catalog-resolved `gpt-5.6-sol / xhigh|max`, or an explicit catalog upgrade-chain successor at `xhigh|max`, routes execution to `gpt-5.6-sol / medium`: in profile terms, Sol `xhigh|max` routes to Sol `medium`. Sol below the threshold, Terra/Luna/other models, unknown profiles and unavailable Sol-medium targets pass through unchanged with a persisted reason. Authoring always uses the known controller profile. Every later Turn explicitly repeats its persisted profile.

## Baseline, Threads, And Wave Launch

Before execution, Git baseline logic validates identity/unfinished operations, protects against obvious raw credentials, checkpoints allowed dirty state, freezes `base_commit` and creates the Integration worktree. All serial/parallel SFCs use owned worktrees; a wave shares one base and later waves use the current Integration head.

Each SFC has one persistent App Server thread. Its read-only Authoring Turn precedes Goal creation. After Packet preflight, the CLI materializes the worktree, Contract V3 and Envelope-bound Goal Manifest V3, validates the 4000-character objective limit, resumes the thread, sets its Goal and starts a worktree-limited `workspaceWrite` Turn. V2 is audit-only. All initial wave Turns start before any is awaited.

The worker compiles Contract V3, implements allowed bindings, runs focused checks and optional targeted verify, commits cleanly, then runs mandatory full final-gate. `needs_work` uses machine findings in another Turn in the same thread; interruption resumes the same identity. Only a current accepted result produces Envelope-bound Receipt V2 and completes the Goal.

## Merge, Repair, And Final Authority

Accepted Slice branches merge to Integration in stable SFC order with base/head/receipt/contract integrity checks. Merge conflict, Integration Gate regression and Campaign Final Gate regression each use an independent execution-profile repair thread/worktree. Repair preserves all affected Packets/requirements/ACs, cannot alter Scope Fit or Packets, commits cleanly, and is applied only against the unchanged repair base.

After merges, Wave Impact V2 selects Specs from diff/evidence, includes global constraints and falls back to all. Once every SFC is `integration_verified`, Campaign Final Gate reruns bindings, Specs, counterfactuals and coverage on one snapshot. Target finalization fetches upstream. Exact verified commit/tree converges; different trees run the complete Target Snapshot Gate. A moved Target failing revalidation is repaired or delivered by non-force fast-forward or a matching OPEN PR; pushes are refetched. Only `target_snapshot_revalidated` Receipts bind verified revalidation; other bases exclude diagnostics. Immediately before acceptance, Target commit/tree must equal the Receipt. Stale Receipts record the change and retry once; a second in-run change returns `wait_external`. Accepted state, Final Result, Receipt and event commit atomically before cleanup. Accepted reruns validate authority before App Server/Gates/PRs/worktrees; cleanup failure never revokes acceptance.

## Recovery

Persist controller catalog/profile, thread IDs, routing, authoring/execution Turn IDs, Goal objective hash/status, launch token, phase and last failure. On App Server loss, reconnect once, `thread/resume`, `thread/read` and `thread/goal/get`, then reconcile known server/local identities. Recover an unpersisted correlated Turn only when exactly one candidate exists. Restore server Goal completion from accepted local state. Apply the same rules to repair threads.

Same-host live-PID leases survive expiry; heartbeat and operation-id checks guard each transaction replacement, and close removes only its lock.

If a thread/start or Turn launch may have reached the server but cannot be uniquely correlated, fail closed as `ambiguous_host_thread_launch`/`ambiguous_host_turn_launch`; never create duplicate work. A second server failure or missing external authorization becomes `wait_external`. V4 campaigns remain status/audit data and cannot enter automatic V5 execution.

Use `app-server-check`, `model-routing`, `threads` and `interrupt` for diagnostics/control. The one real App Server smoke is manual and non-CI: one SFC authoring Turn -> Goal -> execution Turn -> accepted. Default tests use the local Fake JSONL server.
