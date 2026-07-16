export const ACTIVE_AUTHORITY_TRANSITION_POLICY = {
  compile_first: {
    reads_authority: "none",
    modifies_authority: true,
    requires_lock: true,
    cas: "expected_null",
  },
  compile_revise: {
    reads_authority: "active_snapshot",
    modifies_authority: true,
    requires_lock: true,
    cas: "expected_identity",
  },
  verify: {
    reads_authority: "active_snapshot",
    modifies_authority: false,
    requires_lock: false,
    cas: "recheck_before_progress_write",
  },
  final_gate: {
    reads_authority: "active_snapshot",
    modifies_authority: false,
    requires_lock: false,
    cas: "recheck_before_acceptance",
  },
  stop_accepted_clear: {
    reads_authority: "accepted_identity",
    modifies_authority: true,
    requires_lock: true,
    cas: "expected_identity",
  },
  close_accepted_clear: {
    reads_authority: "accepted_identity",
    modifies_authority: true,
    requires_lock: true,
    cas: "expected_identity",
  },
  abandon_valid: {
    reads_authority: "active_snapshot",
    modifies_authority: true,
    requires_lock: true,
    cas: "expected_identity",
  },
  abandon_corrupt: {
    reads_authority: "deterministic_local_paths",
    modifies_authority: true,
    requires_lock: true,
    cas: "explicit_force",
  },
  legacy_migration: {
    reads_authority: "legacy_plus_matching_cache",
    modifies_authority: true,
    requires_lock: true,
    cas: "expected_legacy_identity",
  },
  verifier_migration: {
    reads_authority: "active_snapshot",
    modifies_authority: true,
    requires_lock: true,
    cas: "expected_identity",
  },
} as const;
