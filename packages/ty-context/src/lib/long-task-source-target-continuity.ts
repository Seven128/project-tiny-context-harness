import type {
  CompiledSourceItemV2,
  DeliveryContractV2,
  SourceClaimV2,
} from "./long-task-delivery-types.js";
import { resolveAcceptanceAssertion } from "./long-task-acceptance-reference.js";
import {
  buildCanonicalSourceTargetIndex,
  sourceKindForTarget,
  type CanonicalSourceTarget,
} from "./long-task-source-target-index.js";

export function validateSourceTargetContinuity(
  contract: DeliveryContractV2,
  items: CompiledSourceItemV2[],
  report?: ValidationReporter,
): void {
  const itemByKey = new Map(items.map((item) => [item.key, item]));
  const targets = buildCanonicalSourceTargetIndex(contract);
  const owners = new Map<string, string>();
  const sourceBackedOutcomeClaims = new Set<string>();
  const sourceBackedGlobalClaims = new Set<string>();
  const acceptanceBindings: Array<{
    claim: SourceClaimV2;
    target: CanonicalSourceTarget;
  }> = [];

  for (const claim of contract.source_claims) {
    const item = itemByKey.get(claim.key);
    if (!item || claim.disposition.type === "decision_required") continue;
    const refs = dispositionRefs(claim.disposition);
    if (refs.length !== 1) {
      issue(
        report,
        `source_claim_target_ref_count:${claim.key}:${refs.length}`,
      );
      continue;
    }
    const ref = refs[0];
    const target = targets.get(ref);
    if (!target || sourceKindForTarget(target) !== item.kind) {
      issue(
        report,
        `source_target_kind_mismatch:${claim.key}:${item.kind}:${target ? sourceKindForTarget(target) : "unknown"}:${ref}`,
      );
      continue;
    }
    if (
      item.kind === "risk_fact" &&
      (target.risk_fact !== item.risk_semantics?.fact ||
        target.affected_outcome !== item.risk_semantics?.affected_outcome)
    ) {
      issue(
        report,
        `source_risk_target_mismatch:${claim.key}:${item.risk_semantics?.fact ?? "missing"}:${item.risk_semantics?.affected_outcome ?? "missing"}:${ref}`,
      );
      continue;
    }
    if (
      target.normalized_text !== undefined &&
      target.normalized_text !== item.normalized_text
    ) {
      issue(report, `source_target_statement_mismatch:${claim.key}:${ref}`);
      continue;
    }
    const owner = owners.get(ref);
    if (owner) {
      issue(report, `source_target_already_owned:${claim.key}:${ref}:${owner}`);
      continue;
    }
    owners.set(ref, claim.key);
    if (
      target.outcome_key &&
      [
        "requirement",
        "control",
        "technical_obligation",
        "non_completing",
        "forbidden_shortcut",
      ].includes(target.kind)
    )
      sourceBackedOutcomeClaims.add(ref);
    if (
      !target.outcome_key &&
      ["global_constraint", "non_goal", "forbidden_shortcut"].includes(
        target.kind,
      )
    )
      sourceBackedGlobalClaims.add(ref);
    if (target.kind === "acceptance")
      acceptanceBindings.push({ claim, target });
  }

  for (const { claim, target } of acceptanceBindings) {
    const resolved = resolveAcceptanceAssertion(contract, target.ref);
    const sourceBacked =
      resolved?.scope === "outcome" && target.outcome_key
        ? resolved.assertion.claims.some(
            (localKey) =>
              localKey !== "result" &&
              sourceBackedOutcomeClaims.has(
                `${target.outcome_key}.${localKey}`,
              ),
          )
        : resolved?.scope === "global"
          ? resolved.assertion.claims.some((localKey) =>
              sourceBackedGlobalClaims.has(localKey),
            )
          : false;
    if (!sourceBacked)
      issue(
        report,
        `source_acceptance_without_source_backed_claim:${claim.key}:${target.ref}`,
      );
  }
}

function dispositionRefs(disposition: SourceClaimV2["disposition"]): string[] {
  if (disposition.type === "decision_required") return [];
  if (disposition.type === "outcome_result") return [disposition.ref];
  return disposition.refs;
}

type ValidationReporter = (message: string) => void;

function issue(report: ValidationReporter | undefined, message: string): void {
  if (!report) throw new Error(message);
  report(message);
}
