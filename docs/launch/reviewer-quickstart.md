# Reviewer Quickstart

Snapshot date: 2026-06-10.

This is the one-page link to send to a private reviewer before broad promotion. It is for focused product feedback, not for stars, upvotes, public promotion or proof claims.

## What To Review

Project Tiny Context Harness adds minimal repo-native project memory for AI coding agents:

- `AGENTS.md` stays the short startup router.
- `project_context/**` keeps the durable facts a fresh agent should recover.
- `validate-context` checks context recoverability and blocks false "tests passed" claims from becoming durable context.

The core bet is: keep project memory, drop SDLC-stage ceremony.

## Fastest Review Path

Start here if you only have 5 minutes:

1. Read the [fresh-agent recovery walkthrough](../examples/fresh-agent-recovery.md).
2. Inspect the [Minimal Context sample guide](../examples/minimal-context-sample.md).
3. Browse the tiny generated sample repository at [examples/minimal-context-sample/](../../examples/minimal-context-sample/).

Then answer:

```text
Does this solve a real "new agent chat lost the project context" problem, or is the missing context somewhere else?
```

## Hands-On Source Preview

Use this if the idea looks relevant and you can spend 10-15 minutes on the repository source path. For a normal install, use `project-tiny-context-harness@latest` from npm.

Browser path:

```text
Open https://codespaces.new/Seven128/project-tiny-context-harness
```

When the Codespace finishes `npm ci`, run:

```sh
npm run smoke:quickstart
npm run preview:pack
```

Local path:

```sh
git clone https://github.com/Seven128/project-tiny-context-harness.git
cd project-tiny-context-harness
npm ci
npm run smoke:quickstart
npm run preview:pack
```

Optional disposable-repo trial:

```sh
cd /path/to/your/test-repo
npm install -D /path/to/project-tiny-context-harness/tmp/sdlc/source-preview/package/project-tiny-context-harness-0.2.41.tgz
npx --no-install sdlc-harness init --adopt
make validate-context
```

Use only a disposable branch or copy of a repository.

## Feedback Questions

Answer whichever are easy from your experience:

1. What project facts do your coding agents repeatedly rediscover?
2. Would `AGENTS.md` plus `project_context/**` have helped in one real handoff, debug or fresh-chat situation?
3. Which README concept felt unclear or too internal?
4. Was the no-install preview enough before touching a real repository?
5. What would make this worth trying on one real repo through npm?

## If Setup Fails

Open a [Source preview report](https://github.com/Seven128/project-tiny-context-harness/issues/new?template=source_preview_report.yml) with:

- command you ran,
- operating system and Node version,
- shortest useful output,
- whether you used Codespaces, local checkout or a disposable repo.

Do not include private source code, tokens, logs with secrets or private repository names.

## Consent Boundary

Private feedback stays private unless you explicitly approve a quote, paraphrase or public attribution.

Useful consent levels:

- no quote,
- anonymous paraphrase,
- public name,
- public link.

This review is for product clarity and launch copy. It is not benchmark evidence, adoption proof or a request for stars.
