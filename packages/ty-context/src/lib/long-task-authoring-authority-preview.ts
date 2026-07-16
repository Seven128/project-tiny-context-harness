import { computeAuthorityHashes } from "./long-task-authority.js";
import {
  computeAuthorityMaterials,
  compiledAuthorityMaterials,
} from "./long-task-authority-materials.js";
import { addDiagnosticError } from "./long-task-authoring-preflight-diagnostics.js";
import type {
  AuthoringPreflightDiagnosticV1,
  AuthoringRevisionPreviewV1,
} from "./long-task-authoring-preflight-types.js";
import type {
  ContextAuthoritySnapshotV2,
  DeliveryContractV2,
} from "./long-task-delivery-types.js";
import {
  loadActiveLongTaskAuthority,
  type ActiveLongTaskAuthorityV3,
} from "./long-task-state.js";
import { canonicalValueJson, sha256Hex } from "./strict-codec.js";

export async function loadAuthoringActiveAuthority(
  repository: string,
  workdir: string,
  diagnostics: AuthoringPreflightDiagnosticV1[],
): Promise<ActiveLongTaskAuthorityV3 | null> {
  try {
    const active = (await loadActiveLongTaskAuthority(repository)).authority;
    if (active && active.workdir !== workdir)
      diagnostics.push({
        level: "error",
        code: "active_task_exists",
        message: `Another workdir owns Active Authority: ${active.workdir}`,
      });
    return active;
  } catch (error) {
    addDiagnosticError(diagnostics, error);
    return null;
  }
}

export function authoringRevisionPreview(
  contract: DeliveryContractV2,
  sourceHashes: Record<string, string> | null,
  context: ContextAuthoritySnapshotV2 | null,
  active: ActiveLongTaskAuthorityV3 | null,
): AuthoringRevisionPreviewV1 {
  if (!active)
    return {
      active: false,
      authority_revision: null,
      contract_changed: false,
      source_or_context_changed: false,
      declared_authority_sections_changed: [],
    };
  const hashes = computeAuthorityHashes(contract);
  const declaredChanged = (Object.keys(hashes) as Array<keyof typeof hashes>)
    .filter(
      (key) =>
        key !== "acceptance_authority_hash" &&
        hashes[key] !== active.authority_snapshot.authority_hashes[key],
    )
    .map((key) => key.replace(/_authority_hash$/u, ""));
  let sourceOrContextChanged = false;
  if (sourceHashes && context) {
    const next = computeAuthorityMaterials(contract, sourceHashes, context);
    const previous = compiledAuthorityMaterials(active.authority_snapshot);
    sourceOrContextChanged =
      canonicalValueJson({
        source_hashes: next.source_hashes,
        context_snapshot: next.context_snapshot,
      }) !==
      canonicalValueJson({
        source_hashes: previous.source_hashes,
        context_snapshot: previous.context_snapshot,
      });
  }
  return {
    active: true,
    authority_revision: active.authority_revision,
    contract_changed:
      sha256Hex(canonicalValueJson(contract)) !==
      active.authority_snapshot.contract_sha256,
    source_or_context_changed: sourceOrContextChanged,
    declared_authority_sections_changed: declaredChanged,
  };
}
