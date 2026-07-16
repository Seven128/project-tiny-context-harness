import type { SourceClaimV2 } from "./long-task-delivery-types.js";
import {
  array,
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
      ["refs", "reason"],
    );
    const type = literal(
      disposition.type,
      [
        "claim",
        "acceptance",
        "global_constraint",
        "external_confirmation",
        "out_of_scope",
        "decision_required",
      ] as const,
      `${itemLabel}.disposition.type`,
    );
    return {
      key: key(row.key, `${itemLabel}.key`),
      source_ref: repositorySourceRef(
        row.source_ref,
        `${itemLabel}.source_ref`,
      ),
      statement: string(row.statement, `${itemLabel}.statement`),
      disposition:
        type === "out_of_scope" || type === "decision_required"
          ? {
              type,
              reason: string(
                disposition.reason,
                `${itemLabel}.disposition.reason`,
              ),
            }
          : {
              type,
              refs: strings(disposition.refs, `${itemLabel}.disposition.refs`),
            },
    };
  });
}
