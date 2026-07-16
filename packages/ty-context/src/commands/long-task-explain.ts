import { compileProductClaimCoverage } from "../lib/long-task-claims.js";
import { sourceCoverage } from "../lib/long-task-authoring-preflight-diagnostics.js";
import { parseDeliveryContractBundle } from "../lib/long-task-delivery-parser.js";
import { explainSourceLinks } from "../lib/long-task-explain-source-links.js";
import { classifyLongTaskRisk } from "../lib/long-task-risk.js";

export async function explainLongTask(workdir: string): Promise<void> {
  const parsed = await parseDeliveryContractBundle(workdir);
  const coverage = compileProductClaimCoverage(parsed.contract);
  const risk = classifyLongTaskRisk(parsed.contract);
  const globalClaims = Object.entries(coverage.summary.claims_by_global).map(
    ([claimKey, value]) => ({
      claim: `GLOBAL.${claimKey}`,
      covered: value.covered,
      checks: value.proofs.map((proof) => proof.check_key),
      assertions: value.proofs.map((proof) => proof.assertion_key),
      polarity: value.proofs.map((proof) => proof.polarity),
      proof_surfaces: value.proofs.map((proof) => proof.proof_surface),
      strict_risk_obligations: [],
    }),
  );
  const outcomeClaims = Object.entries(
    coverage.summary.claims_by_outcome,
  ).flatMap(([outcomeKey, rows]) =>
    Object.entries(rows).map(([claimKey, value]) => ({
      claim: `OUTCOME.${outcomeKey}.${claimKey}`,
      covered: value.covered,
      checks: value.proofs.map((proof) => proof.check_key),
      assertions: value.proofs.map((proof) => proof.assertion_key),
      polarity: value.proofs.map((proof) => proof.polarity),
      proof_surfaces: value.proofs.map((proof) => proof.proof_surface),
      strict_risk_obligations: risk.reasons_by_outcome[outcomeKey],
    })),
  );
  console.log(
    JSON.stringify(
      {
        schema_version: "long-task-explain-v2",
        claims: [...globalClaims, ...outcomeClaims],
        coverage: coverage.summary,
        source_coverage: sourceCoverage(parsed.contract),
        source_items: parsed.contract.source_claims.map((source) => ({
          key: source.key,
          source_ref: source.source_ref,
          statement: source.statement,
          disposition: source.disposition,
          links: explainSourceLinks(parsed.contract, coverage.summary, source),
        })),
      },
      null,
      2,
    ),
  );
}
