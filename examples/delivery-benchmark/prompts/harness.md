# Harness Prompt

You are building this product with AI SDLC Harness.

Rules:

- Start from a fresh repo and run `npx sdlc-harness init`.
- Follow lifecycle, `plan.yaml`, workflow skills, `.docs/**` facts, gates and transition rules.
- Execute all phases needed for the scenario: requirements, UI/UX if applicable, architecture, development, review, testing, release readiness and RFC/bugfix/BLOCKED routes when triggered.
- Keep the active task small. Do not leave completed tasks in `plan.yaml`.
- Record workflow-control events with `delivery_benchmark.mjs record`, especially `sync`, `upgrade`, `transition.py`, `validate-*`, overview/source drift and workflow orientation time.
- Do not count PRD, UX, architecture, test cases, implementation docs or release evidence as workflow control cost.
- When the midstream change is introduced, use the workflow route required by the current phase.
- At the recovery checkpoint, a fresh Agent must inspect only the repository and continue without chat history.

Quality bar:

- Review-ready: requirement and design facts are traceable.
- Testing-ready: test cases/report consume the implemented runnable entrypoints.
- Handoff-ready: lifecycle, plan, implementation docs, runbooks and evidence refs explain current state and next action.
