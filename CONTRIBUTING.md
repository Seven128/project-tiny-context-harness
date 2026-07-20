# Contributing

Thanks for taking a look at Project Tiny Context Harness. This project is still small, so the highest-value contributions are clear bug reports, adoption feedback and narrowly scoped fixes.

For support routing, see [SUPPORT.md](SUPPORT.md). For decision and release authority, see [GOVERNANCE.md](GOVERNANCE.md). All project participation is covered by [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Project Boundary

The current product is **Minimal Context Harness**: small durable project memory for AI coding agents. Contributions should preserve that boundary:

- Keep long-lived project facts in `project_context/**`.
- Keep product quality in the user's own tests, CI, review and acceptance.
- Do not reintroduce lifecycle phases, phase gates, stage state, stage Skills or work-product trees as default package behavior.
- Do not claim benchmark wins until fresh Minimal Context benchmark evidence exists.

## Local Setup

```sh
npm ci
npm run test:affected
make validate-context
```

Before handing off a frozen Long-Task package candidate, run `npm run test:long-task:trust`. Use `npm test --workspace project-tiny-context-harness` for shared package/dependency changes or an explicit release rehearsal; `main` and publish always retain that complete release regression.

If you change package-managed assets, also run:

```sh
node packages/ty-context/dist/cli.js package sync-source
node packages/ty-context/dist/cli.js package check-source
git diff --check
```

## Useful Contribution Areas

- Reproduction cases where `init`, `sync`, `upgrade`, `doctor` or `validate-context` behaves poorly in a real repository.
- Documentation that helps a new user understand when Minimal Context is useful and when it is not.
- Tests for Windows/macOS path behavior, configured harness roots and non-destructive sync/upgrade behavior.
- Benchmark protocol improvements that keep evidence honest and do not reuse old stage-workflow results.

## Pull Requests

Keep PRs small enough to review. Include:

- What changed and why.
- Whether the change affects package behavior, managed assets, docs only or tests only.
- Validation commands you ran.
- Context status: `Context: updated ...` or `Context: no durable fact change`.

Maintainers handle npm releases.
