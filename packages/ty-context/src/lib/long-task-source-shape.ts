import type { SourceClaimV2 } from "./long-task-delivery-types.js";
import {
  array,
  fail,
  key,
  literal,
  object,
  repositorySourceRef,
  string,
  strings,
} from "./long-task-shape-primitives.js";

export function parseSourceClaims(
  value: unknown,
  label: string,
): SourceClaimV2[] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = object(item, itemLabel, [
      "key",
      "source_ref",
      "statement",
      "disposition",
    ]);
    const disposition = object(
      row.disposition,
      `${itemLabel}.disposition`,
      ["type"],
      ["refs", "ref", "reason"],
    );
    const type = literal(
      disposition.type,
      [
        "claim",
        "acceptance",
        "outcome_result",
        "global_constraint",
        "risk_fact",
        "external_confirmation",
        "out_of_scope",
        "decision_required",
      ] as const,
      `${itemLabel}.disposition.type`,
    );
    if (type === "out_of_scope")
      fail(
        "out_of_scope_requires_non_goal_or_decision",
        key(row.key, `${itemLabel}.key`),
      );
    const claimKey = key(row.key, `${itemLabel}.key`);
    return {
      key: claimKey,
      source_ref: repositorySourceRef(
        row.source_ref,
        `${itemLabel}.source_ref`,
      ),
      statement: string(row.statement, `${itemLabel}.statement`),
      disposition:
        type === "decision_required"
          ? {
              type,
              reason: string(
                disposition.reason,
                `${itemLabel}.disposition.reason`,
              ),
            }
          : type === "outcome_result"
            ? {
                type,
                ref: string(disposition.ref, `${itemLabel}.disposition.ref`),
              }
            : type === "acceptance"
              ? {
                  type,
                  refs: acceptanceRefs(
                    disposition.refs,
                    `${itemLabel}.disposition.refs`,
                  ),
                }
              : {
                  type,
                  refs: strings(
                    disposition.refs,
                    `${itemLabel}.disposition.refs`,
                  ),
                },
    };
  });
}

function acceptanceRefs(value: unknown, label: string): [string] {
  const refs = strings(value, label);
  if (refs.length !== 1) fail("source_claim_acceptance_ref_count", label);
  return [refs[0]];
}
