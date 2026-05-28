# .docs/07_test overview

<!-- generated-by: AI SDLC Harness build_doc_overviews.py -->
<!-- source-hash: 63f37f4d514ca759 -->

Generated artifact. Markdown slices remain the source of truth.

Source hash: `63f37f4d514ca759`

## Source Slices

1. [TEST_REPORT.md](TEST_REPORT.md)
2. [harness_consumer_lab.md](harness_consumer_lab.md)

---

## TEST_REPORT.md

Source: [TEST_REPORT.md](TEST_REPORT.md)

# Test Report（测试报告）

## 1. 测试范围

- Release candidate: `agent-project-sdlc@0.1.0`
- Latest validation batch: RFC_006 / DEV-020 package rename.
- Commit range: `8f7f8c8..c7fcd72`
- Review input: `.docs/06_review/REVIEW_REPORT.md`
- 覆盖目标：npm package scaffold、sync/init/doctor、upgrade/migration、source sync、validate-* CLI、managed file merge、Markdown overview、角色提示词、task commit workflow。

## 2. Test Matrix（测试矩阵）

| 需求/风险 | 测试项 | 命令/证据 | 结果 |
|---|---|---|---|
| npm package runtime 可构建并通过单元/集成测试 | Full package regression | `npm test` | PASS：5 个 test files 全部通过，workspace selector 为 `agent-project-sdlc`。 |
| package assets 与仓库事实源无漂移 | Source drift check | `node packages/sdlc-harness/dist/cli.js package check-source` | PASS：`package source OK`。 |
| Harness 结构、prompt language 和 overview 派生视图一致 | Harness validation | `make validate-harness` | PASS：scaffold、prompt language、overview check 全部通过。 |
| npm tarball 内容可发布 | Pack dry run | `npm pack --dry-run --workspace agent-project-sdlc` | PASS：81 files，package size 34.7 kB，unpacked size 111.4 kB，tarball `agent-project-sdlc-0.1.0.tgz`。 |
| package rename consumer path | Local installed-consumer smoke | 从 `agent-project-sdlc-0.1.0.tgz` 安装后运行 `npx sdlc-harness help`、`init --harness-folder .agent`、`doctor` | PASS：`doctor` 输出 `core package: agent-project-sdlc@0.1.0`。 |
| 阶段 gate 可执行 | TESTING gate placeholder | `make test-all` | PASS：当前 Makefile 仍为占位输出，需要后续替换为项目级 regression suite。 |

## 3. Regression Evidence（回归证据）

- `npm test` 运行 `npm run build` 后执行 `node --test ../../tests/sdlc-harness/*.test.mjs`，通过：
  - `harness-root.test.mjs`
  - `package-source.test.mjs`
  - `sync-init-doctor.test.mjs`
  - `upgrade.test.mjs`
  - `validators.test.mjs`
- `npm pack --dry-run` 触发 `prepack` build 并列出 tarball 内容，确认 `dist`、`assets`、`migrations`、`source-mappings.yaml` 和 `package.json` 被包含。
- `make validate-harness` 确认 `.docs/**/overview.md` 未过期。
- DEV-020 后重新执行 local tarball consumer smoke，确认包名改动不影响 `sdlc-harness` CLI。

## 4. Runnable Entry/Exit Coverage（可运行入口/出口覆盖）

- Existing entry points under test: `sdlc-harness` CLI, package validators, package sync/source commands, generated Makefile gates.
- Expected exits / side effects: validation reports, package asset sync/check output, generated overview checks and consumer lab smoke output.
- Config contract used: `package.json#sdlcHarness.harnessFolderName`, `<harnessRoot>/config.yaml`, `<harnessRoot>/state/lifecycle.yaml`, `<harnessRoot>/state/plan.yaml`.
- Fixture/live boundary: npm package and local consumer smoke are fixture/local validation; npm registry publish remains release-stage live validation.
- Missing entry/exit blocker: none for the recorded package release candidate.

## 5. Coverage Gaps（覆盖缺口）

- `make test-all` 仍是通用占位命令，真实项目级 regression 目前由 `npm test`、source drift check、Harness validation 和 pack dry run 覆盖。
- npm registry publish 需要在 RELEASING 阶段用实际 npm auth、包名可用性和 2FA/token policy 验证。
- published package smoke 尚未完成；需要发布后从 registry 安装执行 CLI smoke。

## 6. Final Decision（最终结论）

- Decision: `PASS`
- Required before release: 完成 release note、publish checklist、smoke evidence 和 rollback plan。

---

## harness_consumer_lab.md

Source: [harness_consumer_lab.md](harness_consumer_lab.md)

# Harness Consumer Lab Full Test

## Scope

- Package: `agent-project-sdlc@0.1.7`
- Source root: `/Users/momoooo/Documents/ProjectTemplate`
- Lab repository: `/Users/momoooo/Documents/sdlc-harness-consumer-lab`
- Lab cleanup: `deleted`
- Lab commit: `not recorded`
- Lab tag: `not recorded`
- Started: 2026-05-27T09:01:11.496Z
- Finished: 2026-05-27T09:01:31.465Z

This script installs the package tarball into the lab, does not copy source-repo `tools/**` into the consumer repository, and deletes the lab repository after reports are written unless `--keep-lab` is set.

## Summary

- PASS: 25
- BLOCKED: 11
- FAIL: 0
- Decision: BLOCKED

## Script Usage

~~~sh
node tools/consumer_lab_full_test.mjs --report-only --lab-dir /Users/momoooo/Documents/sdlc-harness-consumer-lab
node tools/consumer_lab_full_test.mjs --report-only --keep-lab --commit-lab --lab-dir /Users/momoooo/Documents/sdlc-harness-consumer-lab
~~~

Default reports are written to `/Users/momoooo/Documents/sdlc-harness-consumer-lab/.artifacts/consumer_lab_full_report.{json,md}` before cleanup. Pass `--markdown-report` or `--json-report` outside the lab when the report must persist after the default cleanup. Use `--reset-lab` only when the existing lab should be deleted before the run; use `--keep-lab` only for debugging; use `--commit-lab` with `--keep-lab` when a local evidence commit and tag should be created.

## Matrix

| Area | Evidence | Result | Details |
|---|---|---|---|
| Package smoke | npm pack current source package | PASS | agent-project-sdlc-0.1.7.tgz |
| Package smoke | install current source tarball | PASS | added 2 packages, and audited 3 packages in 2s  1 package is looking for funding   run `npm fund` for details  found 0 vulnerabilities |
| CLI lifecycle | init explicit .codex root | PASS | created .codex/config.yaml created .codex/state/lifecycle.yaml created .codex/state/plan.yaml created .codex/state/plan.draft.yaml created .codex/state/memory.md created .docs/INDEX.md sync changed=27 skipped=0 blocked=0 init complete |
| CLI lifecycle | doctor installed workspace | PASS | harness root: .codex core package: agent-project-sdlc@0.1.7 schema version: 1 doctor complete |
| CLI lifecycle | sync idempotency | PASS | sync changed=0 skipped=13 blocked=0 |
| CLI lifecycle | upgrade idempotency | PASS | migrations changed=0 skipped=15 sync changed=0 skipped=13 blocked=0 doctor warnings=0 errors=0 |
| Managed assets | expected generated files exist | PASS | 10 managed files checked |
| Adoption | init --adopt existing project | PASS | created .codex/config.yaml created .codex/state/lifecycle.yaml created .codex/state/plan.yaml created .codex/state/plan.draft.yaml created .codex/state/memory.md created .docs/INDEX.md sync changed=27 skipped=0 blocked=0 adopt mode complete |
| Configurable root | package.json#sdlcHarness.harnessFolderName | PASS | created .workflow/config.yaml created .workflow/state/lifecycle.yaml created .workflow/state/plan.yaml created .workflow/state/plan.draft.yaml created .workflow/state/memory.md created .docs/INDEX.md sync changed=27 skipped=0 blocked=0 adopt mode complete |
| Local overrides | known Skill override appends Local Override | PASS | override appended |
| Local overrides | unknown Skill override blocks sync | PASS | sync changed=0 skipped=4 blocked=1  blocked: unknown skill override: .codex/pjsdlc_managed/override_skills/pjsdlc_unknown.md |
| Local policy overrides | *.local.yaml preserved across sync | PASS | local policy preserved |
| Toy project | node:test fixture | PASS | ℹ tests 2 ℹ suites 0 ℹ pass 2 ℹ fail 0 ℹ cancelled 0 ℹ skipped 0 ℹ todo 0 ℹ duration_ms 73.193792 |
| CLI validators | validate-harness | PASS | validate-harness checked /Users/momoooo/Documents/sdlc-harness-consumer-lab (.codex) |
| CLI validators | validate-current | PASS | validate-pm checked 1 file(s) |
| CLI validators | validate-pm | PASS | validate-pm checked 1 file(s) |
| CLI validators | validate-design | PASS | validate-design checked 2 file(s) |
| CLI validators | validate-dev final empty plan | PASS | validate-dev checked 0 task(s) |
| Task protocol | done task retained in plan is rejected | PASS | validate-dev checked 1 task(s)  error: Completed task DEV-001 must not remain in plan.yaml |
| Task protocol | open task retained is rejected by completion gate | PASS | validate-dev checked 1 task(s)  error: Open tasks remain: DEV-001 |
| Parallel execution | valid explicit user_requested contract | PASS | validate-dev checked 0 task(s) |
| Parallel execution | automatic trigger is rejected | PASS | validate-dev checked 0 task(s)  error: parallel_execution.trigger must be "user_requested" |
| Natural-language control | static AGENTS/manager routing text | PASS | natural-language routing text present |
| Makefile gates | make validate-harness | BLOCKED | consumer repo is missing generated Makefile tools/** dependency |
| Makefile gates | make validate-current | BLOCKED | consumer repo is missing generated Makefile tools/** dependency |
| Makefile gates | make validate-review | BLOCKED | consumer repo is missing generated Makefile tools/** dependency |
| Makefile gates | make validate-test | BLOCKED | consumer repo is missing generated Makefile tools/** dependency |
| Makefile gates | make validate-release | BLOCKED | consumer repo is missing generated Makefile tools/** dependency |
| Docs overview | make docs-overview | BLOCKED | consumer repo is missing generated Makefile tools/** dependency |
| Lifecycle transition | python3 tools/transition.py --to ARCHITECTING | BLOCKED | consumer repo is missing generated Makefile tools/** dependency |
| Later-stage CLI validators | npx sdlc-harness validate validate-review | BLOCKED | package CLI does not expose this later-stage validator yet |
| Later-stage CLI validators | npx sdlc-harness validate validate-test | BLOCKED | package CLI does not expose this later-stage validator yet |
| Later-stage CLI validators | npx sdlc-harness validate validate-release | BLOCKED | package CLI does not expose this later-stage validator yet |
| Later-stage CLI validators | npx sdlc-harness validate validate-rfc | BLOCKED | package CLI does not expose this later-stage validator yet |
| GitHub Actions | workflow asset static coverage | PASS | static workflow asset checked; remote GitHub Actions execution is out of scope |
| Release automation | release automation static coverage | PASS | npm publish is out of scope for consumer lab |

## Blocked Items

- Makefile gates: make validate-harness (consumer repo is missing generated Makefile tools/** dependency)
- Makefile gates: make validate-current (consumer repo is missing generated Makefile tools/** dependency)
- Makefile gates: make validate-review (consumer repo is missing generated Makefile tools/** dependency)
- Makefile gates: make validate-test (consumer repo is missing generated Makefile tools/** dependency)
- Makefile gates: make validate-release (consumer repo is missing generated Makefile tools/** dependency)
- Docs overview: make docs-overview (consumer repo is missing generated Makefile tools/** dependency)
- Lifecycle transition: python3 tools/transition.py --to ARCHITECTING (consumer repo is missing generated Makefile tools/** dependency)
- Later-stage CLI validators: npx sdlc-harness validate validate-review (package CLI does not expose this later-stage validator yet)
- Later-stage CLI validators: npx sdlc-harness validate validate-test (package CLI does not expose this later-stage validator yet)
- Later-stage CLI validators: npx sdlc-harness validate validate-release (package CLI does not expose this later-stage validator yet)
- Later-stage CLI validators: npx sdlc-harness validate validate-rfc (package CLI does not expose this later-stage validator yet)

## Defect Candidates

| ID | Area | Evidence | Impact |
|---|---|---|---|
| LAB-001 | Makefile gates | make validate-harness | consumer repo is missing generated Makefile tools/** dependency |
| LAB-002 | Makefile gates | make validate-current | consumer repo is missing generated Makefile tools/** dependency |
| LAB-003 | Makefile gates | make validate-review | consumer repo is missing generated Makefile tools/** dependency |
| LAB-004 | Makefile gates | make validate-test | consumer repo is missing generated Makefile tools/** dependency |
| LAB-005 | Makefile gates | make validate-release | consumer repo is missing generated Makefile tools/** dependency |
| LAB-006 | Docs overview | make docs-overview | consumer repo is missing generated Makefile tools/** dependency |
| LAB-007 | Lifecycle transition | python3 tools/transition.py --to ARCHITECTING | consumer repo is missing generated Makefile tools/** dependency |
| LAB-008 | Later-stage CLI validators | npx sdlc-harness validate validate-review | package CLI does not expose this later-stage validator yet |
| LAB-009 | Later-stage CLI validators | npx sdlc-harness validate validate-test | package CLI does not expose this later-stage validator yet |
| LAB-010 | Later-stage CLI validators | npx sdlc-harness validate validate-release | package CLI does not expose this later-stage validator yet |
| LAB-011 | Later-stage CLI validators | npx sdlc-harness validate validate-rfc | package CLI does not expose this later-stage validator yet |

## Failures

- None

## Recommended RFC

- Title: RFC: Close installed-consumer workflow coverage gaps
- Impact areas: README, PROJECT_SPEC, package CLI, Makefile assets, validators, tools, tests, Makefile gates, Docs overview, Lifecycle transition, Later-stage CLI validators
