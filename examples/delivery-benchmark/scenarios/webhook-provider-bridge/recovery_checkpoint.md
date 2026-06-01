# Recovery Checkpoint

Pause after local tests pass and live provider smoke is blocked.

A fresh Agent should identify:

- The canonical mock provider path.
- The live-provider blocker and credential reference name.
- What must not be retried.
- Which evidence is local, mock-provider or live-provider.
- Whether testing can proceed with mock evidence or must wait for live credentials.
