import type {
  CompiledDeliveryContractV2,
  ContextAuthoritySnapshotV2,
} from "./long-task-delivery-types.js";
import { canonicalValueJson } from "./strict-codec.js";

export interface NormalizedContextAuthoritySnapshotV2 extends ContextAuthoritySnapshotV2 {
  controlling_files: string[];
  supporting_files: string[];
}

export function normalizeContextAuthoritySnapshot(
  snapshot: ContextAuthoritySnapshotV2,
): NormalizedContextAuthoritySnapshotV2 {
  const files = uniqueSorted(snapshot.files);
  const available = new Set(files);
  const declaredAuthority = Array.isArray(snapshot.controlling_files)
    ? snapshot.controlling_files.filter((file) => available.has(file))
    : files;
  const declaredSupporting = Array.isArray(snapshot.supporting_files)
    ? snapshot.supporting_files.filter((file) => available.has(file))
    : [];
  const authority = new Set(declaredAuthority);
  const supporting = new Set(
    declaredSupporting.filter((file) => !authority.has(file)),
  );

  for (const file of files)
    if (!authority.has(file) && !supporting.has(file)) authority.add(file);

  return {
    mode: snapshot.mode,
    topology_sha256: snapshot.topology_sha256,
    files,
    sha256: Object.fromEntries(
      files
        .filter((file) => file in snapshot.sha256)
        .map((file) => [file, snapshot.sha256[file]]),
    ),
    controlling_files: [...authority].sort(),
    supporting_files: [...supporting].sort(),
  };
}

export function contextAuthorityProjection(
  snapshot: ContextAuthoritySnapshotV2,
): {
  mode: ContextAuthoritySnapshotV2["mode"];
  topology_sha256: string;
  controlling_files: string[];
  sha256: Record<string, string>;
} {
  const normalized = normalizeContextAuthoritySnapshot(snapshot);
  return {
    mode: normalized.mode,
    topology_sha256: normalized.topology_sha256,
    controlling_files: normalized.controlling_files,
    sha256: Object.fromEntries(
      normalized.controlling_files
        .filter((file) => file in normalized.sha256)
        .map((file) => [file, normalized.sha256[file]]),
    ),
  };
}

export function contextAuthorityChanged(
  previous: ContextAuthoritySnapshotV2,
  next: ContextAuthoritySnapshotV2,
): boolean {
  return !same(
    contextAuthorityProjection(previous),
    contextAuthorityProjection(next),
  );
}

export function canRetainProgressForSupportingContextRevision(
  previous: CompiledDeliveryContractV2,
  next: CompiledDeliveryContractV2,
): boolean {
  const previousContext = normalizeContextAuthoritySnapshot(
    previous.context_snapshot,
  );
  const nextContext = normalizeContextAuthoritySnapshot(next.context_snapshot);
  if (same(previousContext, nextContext)) return false;
  if (contextAuthorityChanged(previousContext, nextContext)) return false;
  return same(
    progressRetentionProjection(previous),
    progressRetentionProjection(next),
  );
}

function progressRetentionProjection(
  compiled: CompiledDeliveryContractV2,
): unknown {
  const {
    compiled_identity: _compiledIdentity,
    authority_revision: _authorityRevision,
    context_snapshot: contextSnapshot,
    authority_materials: authorityMaterials,
    ...rest
  } = compiled;
  return {
    ...rest,
    context_snapshot: contextAuthorityProjection(contextSnapshot),
    authority_materials: {
      ...authorityMaterials,
      context_snapshot: contextAuthorityProjection(
        authorityMaterials.context_snapshot,
      ),
    },
  };
}

function same(left: unknown, right: unknown): boolean {
  return canonicalValueJson(left) === canonicalValueJson(right);
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort();
}
