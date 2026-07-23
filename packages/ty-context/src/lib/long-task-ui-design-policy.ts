import type { CompiledClaimsV2 } from "./long-task-claims.js";
import type {
  DeliveryCheckV2,
  DeliveryContractV2,
  DeliveryOutcomeV2,
  ProductClaimV2,
} from "./long-task-delivery-types.js";
import { matchesRepoPattern } from "./long-task-paths.js";
import {
  issue,
  type Reporter,
  unique,
  validateCarrierInputs,
  validateRootJourney,
  validateTargetLocalClaimProof,
} from "./long-task-ui-surface-validation.js";

interface UiDesignBindingContext {
  outcome: DeliveryOutcomeV2;
  binding: DeliveryOutcomeV2["product"]["surface_bindings"][number];
  outcomeClaims: Map<string, ProductClaimV2>;
  claims: CompiledClaimsV2;
  checks: Map<string, DeliveryCheckV2>;
  confirmations: Map<
    string,
    DeliveryContractV2["global"]["acceptance"]["external_confirmations"][number]
  >;
  carriers: string[];
  designTargetKeys: Set<string>;
  designAssertionRefs: Set<string>;
  report?: Reporter;
}

export function validateUiDesignBinding(context: UiDesignBindingContext): void {
  validateDesignTargets(context);
  validateBlockers(context);
}

function validateDesignTargets({
  outcome,
  binding,
  outcomeClaims,
  checks,
  carriers,
  designTargetKeys,
  designAssertionRefs,
  report,
}: UiDesignBindingContext): void {
  for (const target of binding.design_targets) {
    const label = `${outcome.key}:${binding.key}:${target.key}`;
    if (designTargetKeys.has(target.key))
      issue(report, "ui_design_target_key_duplicate", label);
    designTargetKeys.add(target.key);
    const assertionIdentity = `${target.conformance_check_ref}\0${target.conformance_assertion_ref}`;
    if (designAssertionRefs.has(assertionIdentity))
      issue(report, "ui_design_target_assertion_duplicate", label);
    designAssertionRefs.add(assertionIdentity);
    for (const [name, values] of [
      ["source_paths", target.source_paths],
      ["condition_keys", target.condition_keys],
      ["claim_refs", target.claim_refs],
    ] as const) {
      unique(values, `ui_design_target_${name}_duplicate`, label, report);
      if (!values.length)
        issue(report, `ui_design_target_${name}_required`, label);
    }
    for (const claimRef of target.claim_refs) {
      const claim = outcomeClaims.get(claimRef);
      if (
        !claim ||
        claim.kind !== "control" ||
        !binding.control_refs.some((control) =>
          claimRef.startsWith(`control.${control}.`),
        )
      )
        issue(
          report,
          "ui_design_target_control_claim_required",
          `${label}:${claimRef}`,
        );
    }
    const check = checks.get(target.conformance_check_ref);
    if (!check) {
      issue(
        report,
        "ui_design_target_conformance_check_unknown",
        `${label}:${target.conformance_check_ref}`,
      );
      continue;
    }
    validateRootJourney(binding, check, label, report);
    validateCarrierInputs(check, carriers, label, report);
    validateDesignAssertion(target, check, label, report);
    validateDesignFiles(target, check, label, report);
  }
}

function validateDesignAssertion(
  target: DeliveryOutcomeV2["product"]["surface_bindings"][number]["design_targets"][number],
  check: DeliveryCheckV2,
  label: string,
  report?: Reporter,
): void {
  const assertion = check.positive_assertions.find(
    (item) => item.key === target.conformance_assertion_ref,
  );
  if (!assertion) {
    issue(
      report,
      "ui_design_target_conformance_assertion_unknown",
      `${label}:${target.conformance_assertion_ref}`,
    );
    return;
  }
  for (const claimRef of target.claim_refs)
    if (!assertion.claims.includes(claimRef))
      issue(
        report,
        "ui_design_target_claim_not_asserted",
        `${label}:${claimRef}`,
      );
  for (const capability of [
    "design_conformance",
    "interaction_trace",
    "target_runtime",
  ] as const)
    if (!assertion.evidence_capabilities.includes(capability))
      issue(
        report,
        "ui_design_target_capability_required",
        `${label}:${capability}`,
      );
}

function validateDesignFiles(
  target: DeliveryOutcomeV2["product"]["surface_bindings"][number]["design_targets"][number],
  check: DeliveryCheckV2,
  label: string,
  report?: Reporter,
): void {
  for (const source of target.source_paths)
    if (
      !check.verification_inputs.some((pattern) =>
        matchesRepoPattern(source, pattern),
      )
    )
      issue(
        report,
        "ui_design_target_verification_input_missing",
        `${label}:${source}`,
      );
  if (target.actual_artifact_path === target.comparison_artifact_path)
    issue(report, "ui_design_target_artifacts_must_differ", label);
  for (const artifact of [
    target.actual_artifact_path,
    target.comparison_artifact_path,
  ])
    if (
      !check.artifact_globs.some((pattern) =>
        matchesRepoPattern(artifact, pattern),
      )
    )
      issue(
        report,
        "ui_design_target_artifact_glob_missing",
        `${label}:${artifact}`,
      );
}

function validateBlockers(context: UiDesignBindingContext): void {
  const {
    outcome,
    binding,
    outcomeClaims,
    claims,
    checks,
    confirmations,
    report,
  } = context;
  const label = `${outcome.key}:${binding.key}`;
  unique(
    binding.acceptance_blockers.map((item) => item.key),
    "ui_design_blocker_key_duplicate",
    label,
    report,
  );
  for (const blocker of binding.acceptance_blockers) {
    const blockerLabel = `${label}:${blocker.key}`;
    unique(
      blocker.refs,
      "ui_design_blocker_ref_duplicate",
      blockerLabel,
      report,
    );
    if (!blocker.refs.length)
      issue(report, "ui_design_blocker_ref_required", blockerLabel);
    if (blocker.status === "machine_claim")
      validateMachineBlocker(context, blocker.refs, blockerLabel);
    if (blocker.status === "external_confirmation")
      validateExternalBlocker(
        outcome,
        confirmations,
        blocker.refs,
        blockerLabel,
        report,
      );
  }
}

function validateMachineBlocker(
  {
    outcome,
    binding,
    outcomeClaims,
    claims,
    checks,
    report,
  }: UiDesignBindingContext,
  claimRefs: string[],
  label: string,
): void {
  for (const claimRef of claimRefs) {
    const claim = outcomeClaims.get(claimRef);
    if (!claim)
      issue(
        report,
        "ui_design_blocker_machine_claim_unknown",
        `${label}:${claimRef}`,
      );
    else
      validateTargetLocalClaimProof(
        outcome,
        claim,
        binding.target_ref,
        null,
        claims,
        checks,
        label,
        report,
      );
  }
}

function validateExternalBlocker(
  outcome: DeliveryOutcomeV2,
  confirmations: UiDesignBindingContext["confirmations"],
  confirmationRefs: string[],
  label: string,
  report?: Reporter,
): void {
  for (const confirmationRef of confirmationRefs) {
    const confirmation = confirmations.get(confirmationRef);
    if (!confirmation)
      issue(
        report,
        "ui_design_blocker_confirmation_unknown",
        `${label}:${confirmationRef}`,
      );
    else if (!confirmation.blocks_target)
      issue(
        report,
        "ui_design_blocker_confirmation_must_block_target",
        `${label}:${confirmationRef}`,
      );
    else if (
      !confirmation.impact_claims.some((claim) =>
        claim.startsWith(`${outcome.key}.`),
      )
    )
      issue(
        report,
        "ui_design_blocker_confirmation_impact_mismatch",
        `${label}:${confirmationRef}`,
      );
  }
}
