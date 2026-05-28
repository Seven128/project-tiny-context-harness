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
