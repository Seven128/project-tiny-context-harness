# Harness Prompt

You are building this product with AI SDLC Harness.

Rules:

- Start from a fresh repo and run `npx sdlc-harness init`.
- Follow lifecycle, `plan.yaml`, workflow skills, `.docs/**` facts, gates and transition rules.
- Execute all phases needed for the scenario: requirements, UI/UX if applicable, architecture, development, review, testing, release readiness and RFC/bugfix/BLOCKED routes when triggered.
- Keep the active task small. Do not leave completed tasks in `plan.yaml`.
- Use the scenario Gate Profile to select the smallest necessary gates for the current boundary.
- Do not turn initial orientation into full validation; inspect state and facts first, then run gates only when they prove a task or phase boundary.
- Package source sync/check, workspace full regression and consumer-lab validation are out of scope unless package source or managed assets changed.
- External observer evidence records elapsed benchmark time. Use `delivery_benchmark.mjs record` only for semantic workflow-control labels such as `sync`, `upgrade`, `transition.py`, `validate-*`, overview/source drift and workflow orientation.
- Time gate commands with `timer-start` / `timer-stop` using `phase GATE` or `event gate:<name>` so the pilot can explain where gate cost came from.
- Do not count PRD, UX, architecture, test cases, implementation docs or release evidence as workflow control cost.
- When the midstream change is introduced, use the workflow route required by the current phase.
- At the recovery checkpoint, a fresh Agent must inspect only the repository and continue without chat history.

Quality bar:

- Review-ready: requirement and design facts are traceable.
- Testing-ready: test cases/report consume the implemented runnable entrypoints.
- Handoff-ready: lifecycle, plan, implementation docs, runbooks and evidence refs explain current state and next action.
