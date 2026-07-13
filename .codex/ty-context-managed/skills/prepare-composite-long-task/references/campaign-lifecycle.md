# Campaign V4 Git, Goal, Integration, And Recovery Lifecycle

## Resume

Resume from `campaign.yaml`, immutable source/coverage/graph/Packet/schedule revisions, receipts and CLI status. Do not reconstruct authority from chat memory. Run `status --json`, then `advance --json`; retry the returned idempotent action.

## Git Baseline

Before the first wave, the CLI verifies Git identity and unfinished operations, scans non-ignored changes for obvious raw credentials, creates the automatic checkpoint commit when needed, fetches, fast-forwards or rebases the target, freezes `base_commit`, and creates the Campaign Integration Branch/worktree. Ordinary text conflicts return a repair action; semantic contradictions alone require a decision.

All serial and parallel SFCs use worktrees. Same-wave worktrees must share exact `wave.base_commit`; later waves use the current integration head. Worktree startup verifies branch, HEAD, cleanliness, Campaign/SFC/Packet identity, three inputs, Hook and CLI identity.

## Launch A Wave

`advance.action=launch_wave` means every Goal manifest/objective/worktree and launch token is already persisted. Launch all returned workers before waiting. When one thread can hold only one unfinished Goal, use one native child agent/thread per SFC and let each bind its own Goal. Record every Goal ID with `bind-goal`; same ID/token is idempotent and a different ID conflicts.

Each worker must compile in its assigned worktree, implement only its allowed bindings, verify/repair, commit, confirm clean, then run final-gate. If final-gate needs work, repair and recommit before rerunning. After accepted it changes nothing. Workers never switch/merge branches, modify graph/other Packets/Integration Branch, delete worktrees or declare Campaign completion.

## Record Result

`record-result` validates the existing final result and receipts without rerunning final-gate. It binds campaign/SFC/wave/Goal, branch, wave base, head and commit range, contract, final result hash and clean worktree. A mismatch is recovery work or corruption; never edit state to make it pass.

## Merge And Repair

Accepted Slice branches merge only to the Integration Branch in stable SFC order. Pre-merge checks require base ancestry, exact receipt head, clean worktree, unchanged contract/source/oracle/verifier and unchanged commit range.

On a Git conflict, capture a conflict manifest, abort the partial integration merge, create a repair branch/worktree/Goal, and give it all affected Packets, requirements, ACs and accepted receipts. Repair must preserve both contracts. A normal conflict never asks the user.

Bind a repair Goal idempotently before waiting:

```text
ty-context composite-campaign bind-repair-goal --campaign <path> --repair-id <id> --goal-id <id> --launch-token <token>
```

After a wave merges, Integration Gate reruns every wave SFC, any prior SFC affected through bindings/input paths/diff, global build/typecheck/smoke and cross-SFC contracts. Unknown impact means conservative revalidation. A regression creates an integration-repair Goal and keeps downstream dependencies blocked.

## Campaign Final And Target

After every SFC is `integration_verified`, Campaign Final Gate materializes and compiles all Packet revisions against one final Integration snapshot, reruns all specs/bindings/counterfactuals, validates global constraints and source coverage, and requires a clean Integration Branch. Historical Slice results cannot substitute.

Before target integration, fetch and compare the target tip. A moved target is resynchronized and the Campaign gate reruns. Merge/push when allowed or open the automatic PR path. Auth/MFA/permission/approval and unavailable protected-branch automation are external blockers; never force push.

Cleanup only owned, merged, receipt-validated worktrees/branches/locks. Preserve source plan, coverage/graph, Packet/schedule revisions, receipts, final result and merge identities.

## Recovery Rules

- Persist launch intent before Host Goal creation; bind the returned ID immediately.
- Retry known Goal IDs and tokens; never duplicate an ambiguous launch.
- Recompute ready frontier after each integration-verified wave.
- Recompute conflicts and Packets when the integration base changes.
- Do not mark `finished` unless CLI returns Campaign `accepted` and the target commit.
