# Baseline Prompt

You are building this product with plain AI coding.

Rules:

- Do not use Project Tiny Context Harness files, lifecycle, plan, workflow skills or validators.
- Use the requirements and acceptance criteria below as the only product contract.
- Build the smallest maintainable implementation that satisfies the same final quality bar as the Harness run.
- Use the scenario Gate Profile for product verification boundaries, but do not run Harness validators.
- Do not turn orientation into heavy validation; first inspect the prompt, scenario, repository files, README/docs and tests.
- At the end of `INITIAL_DELIVERY`, after product tests/smoke pass, create one normal product delivery commit and push `main` to the existing local `origin`. This is a benchmark recovery boundary, not Harness workflow. Do not commit `.benchmark/**`.
- If local git commit or push fails, stop and report `BLOCKED`; do not continue to recovery/RFC/debug with an uncommitted product worktree.
- When the midstream change is introduced, update code, tests and docs as needed.
- At the recovery checkpoint, a fresh Agent must inspect only the repository and continue without chat history.

Quality bar:

- Review-ready: a reviewer can tell what changed and why.
- Testing-ready: runnable entrypoints and test/smoke evidence exist.
- Handoff-ready: a fresh Agent can identify current state, gaps and next action from files.
