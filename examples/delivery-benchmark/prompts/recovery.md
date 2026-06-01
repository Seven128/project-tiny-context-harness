# Fresh-Session Recovery Prompt

You are a fresh Agent resuming a benchmark run. Do not use chat history.

Inspect only the repository and answer:

- Current phase or equivalent project status.
- Current task or most likely next task.
- Requirements already satisfied.
- Tests or gates already executed.
- Missing evidence, blockers or do-not-retry constraints.
- The next smallest action.

For a Harness run, read lifecycle, plan, docs, implementation evidence, test report and runbook refs. For a baseline run, infer from project files and local notes only.
