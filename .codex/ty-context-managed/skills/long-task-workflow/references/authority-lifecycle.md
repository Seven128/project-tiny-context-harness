# Authority Lifecycle Reference

Read this before Preflight, Compile, revision, resume, targeted verify, Final Gate, Stop, close or abandon.

## Preflight And Compile

Run `ty-context long-task preflight <workdir>` before first formal Compile. Resolve every `error` and `decision_required` diagnostic and review warnings. Preflight is read-only: it creates no Active Authority, initial base, marker, cache, Progress, Receipt or pending revision, runs no project Check and persists no success record.

Preflight and Compile call the same activation-safety validator. Skipping Preflight bypasses no Source continuity, criterion, Claim/all-of-surface, adapter/Observation, risk, owner/path/Binding, runner/input, Counterfactual or sensitivity rule.

Preflight keeps every independently discovered diagnostic. When a structural duplicate makes the same Claim ambiguous or repeated, only that pair receives stable `diagnostic_id`, `repair_group`, `repair_priority` and `blocked_by` metadata so the structural blocker is repaired first. Independent findings keep their compact existing shape; no finding is hidden, reclassified or treated as resolved, and no repair state or authority is created.

The first successful `ty-context long-task compile <workdir>` is Authority Lock and freezes the immutable initial base and complete compiled authority snapshot in Git common-dir, bound to the worktree marker by task id, revision and compiled identity.

Its JSON result includes `execution_model_checkpoint.required: true`. Before product implementation, stop once and ask the user to continue with the current model or switch models and then resume the active Long-Task. A task-specific model choice already stated explicitly satisfies the checkpoint. Later Compile revisions return `required: false`; no checkpoint file, acknowledgement state, model route or automatic model switch is created.

## Protected Revision

After Authority Lock, Source/Product/Global semantics, Controlling Context, verifier content, runner/verification input replacement, proof reduction, scope expansion or unprovable containment must compare against active authority. Pure verifier relocation and proven proof/scope tightening may auto-revise; content weakening requires exact user approval. The executing Agent never approves its own pending revision.

Every path-bearing field uses canonical grammar. Internal `.`/`..`, control characters, empty segments, absolute/drive/UNC paths and unsupported glob syntax fail closed.

Controlling Context includes core Context, explicit `context_refs`, verification/deployment Context and every file in full snapshot mode. In referenced mode only graph-derived, non-explicit `implementation-index` and `archive` files are Supporting Context; a supporting-only `compile --revise` may preserve otherwise-fresh targeted Progress.

`context.toml` retrieval guidance (`triggers`, `read_when`, `read_policy`, default selection and unselected nodes) is excluded from the selected delivery-authority projection. Selected area ownership, role/dependency structure and selected Context contents remain protected revision material. Retrieval-only edits may preserve scoped Progress, but a changed final Git tree still invalidates historical final acceptance and must pass the Live Final Gate again.

## Targeted Verification And Recovery

`verify --outcome/--check` runs scoped current-snapshot checks for repair and rechecks active identity before writing Progress. A Counterfactual finding is projected into the owning Main Check, changes an otherwise passed Check to `invalid_evidence`, clears Claim proofs and remains recoverable through `status`/`resume`. Global Checks use the same record without a new Global Outcome state.

Progress freshness binds Outcome authority, runner, verification inputs, Controlling Context and implementation inputs. Retry defaults to none; one retry is allowed only for explicit `transient_once`, idempotent, read-only/test-sandbox work.

Status, Progress, Receipts and workdir compiled output are audit/recovery projections only. Development-period authority state is `manual_required` and never migrated.

## Final Gate And Terminal Paths

Before Final Gate, complete Context/code/tests and create a clean candidate commit. Final Gate captures active identity, recompiles Source authority, reads complete current Context, validates common-dir record/marker, creates a Git-tree snapshot, reruns all Checks and sensitivity controls and rechecks identity before acceptance. A concurrent revision returns `active_authority_changed_during_final_gate`.

Commit, verifier migration, clear and abandon share one active-state lock. Stop/close clear only the identity actually accepted through CAS and preserve `machine_accepted_external_pending` plus every named external confirmation in output. A stale Receipt exposes no accepted workflow status.

For invalid, mismatched, unrecoverable or stale-lock continuity, use only `ty-context long-task abandon <workdir> --force-corrupt-state`; it preserves authored Contract, Source, Context and Git content.
