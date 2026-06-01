# Baseline Prompt

You are building this product with plain AI coding.

Rules:

- Do not use AI SDLC Harness files, lifecycle, plan, workflow skills or validators.
- Use the requirements and acceptance criteria below as the only product contract.
- Build the smallest maintainable implementation that satisfies the same final quality bar as the Harness run.
- Keep a short `.benchmark/transcript.md` with commands you ran, blockers and any known gaps.
- When the midstream change is introduced, update code, tests and docs as needed.
- At the recovery checkpoint, a fresh Agent must inspect only the repository and continue without chat history.

Quality bar:

- Review-ready: a reviewer can tell what changed and why.
- Testing-ready: runnable entrypoints and test/smoke evidence exist.
- Handoff-ready: a fresh Agent can identify current state, gaps and next action from files.
