import type {
  CompiledSourceItemV2,
  DeliveryContractV2,
  SourceClaimV2,
  SourceItemKind,
} from "./long-task-delivery-types.js";
import { resolveAcceptanceAssertion } from "./long-task-acceptance-reference.js";
import { normalizeSourceItemText } from "./long-task-source-item-parser.js";

export function validateSourceContinuity(
  contract: DeliveryContractV2,
  items: CompiledSourceItemV2[],
  report?: ValidationReporter,
): void {
  const itemByKey = new Map(items.map((item) => [item.key, item]));
  const claimByKey = new Map(
    contract.source_claims.map((claim) => [claim.key, claim]),
  );
  for (const claim of contract.source_claims) {
    const item = itemByKey.get(claim.key);
    if (!item) {
      issue(report, `source_claim_item_unknown:${claim.key}`);
      continue;
    }
    const sourcePath = claim.source_ref.split("#")[0];
    if (sourcePath !== item.source_path)
      issue(
        report,
        `source_claim_item_file_mismatch:${claim.key}:${sourcePath}:${item.source_path}`,
      );
    if (normalizeSourceItemText(claim.statement) !== item.normalized_text)
      issue(report, `source_claim_statement_mismatch:${claim.key}`);
    validateDispositionKind(claim, item.kind, report);
    if (claim.disposition.type === "acceptance") {
      const resolved = resolveAcceptanceAssertion(
        contract,
        claim.disposition.refs[0],
      );
      if (
        !resolved?.assertion.criterion ||
        normalizeSourceItemText(resolved.assertion.criterion) !==
          item.normalized_text
      )
        issue(report, `source_acceptance_criterion_mismatch:${claim.key}`);
    }
  }
  for (const item of items)
    if (!claimByKey.has(item.key))
      issue(report, `source_item_unmapped:${item.key}`);
}

function validateDispositionKind(
  claim: SourceClaimV2,
  kind: SourceItemKind,
  report?: ValidationReporter,
): void {
  const allowed = new Set<string>(
    kind === "outcome_result"
      ? ["outcome_result"]
      : kind === "technical_obligation"
        ? ["claim", "global_constraint"]
        : kind === "requirement" ||
            kind === "control" ||
            kind === "non_completing"
          ? ["claim"]
          : kind === "acceptance"
            ? ["acceptance"]
            : kind === "non_goal"
              ? ["global_constraint"]
              : kind === "forbidden_shortcut"
                ? ["claim", "global_constraint"]
                : kind === "risk_fact"
                  ? ["risk_fact"]
                  : kind === "external_confirmation"
                    ? ["external_confirmation"]
                    : ["decision_required"],
  );
  if (!allowed.has(claim.disposition.type))
    issue(
      report,
      `source_item_disposition_mismatch:${claim.key}:${kind}:${claim.disposition.type}`,
    );
}

type ValidationReporter = (message: string) => void;

function issue(report: ValidationReporter | undefined, message: string): void {
  if (!report) throw new Error(message);
  report(message);
}
