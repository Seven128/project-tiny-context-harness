import type { ContextAuthoritySnapshotV2 } from "./long-task-delivery-types.js";
import { canonicalValueJson } from "./strict-codec.js";

type ClassifiedContextSnapshot = ContextAuthoritySnapshotV2 & {
  authority_files?: string[];
  supporting_files?: string[];
};

export interface NormalizedContextAuthoritySnapshotV2
  extends ContextAuthoritySnapshotV2 {
  authority_files: string[];
  supporting_files: string[];
}

export function normalizeContextAuthoritySnapshot(
  snapshot: ContextAuthoritySnapshotV2,
): NormalizedContextAuthoritySnapshotV2 {
  const classified = snapshot as ClassifiedContextSnapshot;
  const files = uniqueSorted(snapshot.files);
  const available = new Set(files);
  const declaredAuthority = Array.isArray(classified.authority_files)
    ? classified.authority_files.filter((file) => available.has(file))
    : files;
  const declaredSupporting = Array.isArray(classified.supporting_files)
    ? classified.supporting_files.filter((file) => available.has(file))
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
    sha256: sortRecord(snapshot.sha256),
    authority_files: [...authority].sort(),
    supporting_files: [...supporting].sort(),
  };
}

export function contextAuthorityProjection(
  snapshot: ContextAuthoritySnapshotV2,
): {
  mode: ContextAuthoritySnapshotV2["mode"];
  topology_sha256: string;
  authority_files: string[];
  sha256: Record<string, string>;
} {
  const normalized = normalizeContextAuthoritySnapshot(snapshot);
  return {
    mode: normalized.mode,
    topology_sha256: normalized.topology_sha256,
    authority_files: normalized.authority_files,
    sha256: Object.fromEntries(
      normalized.authority_files
        .filter((file) => file in normalized.sha256)
        .map((file) => [file, normalized.sha256[file]]),
    ),
  };
}

export function contextAuthorityChanged(
  previous: ContextAuthoritySnapshotV2,
  next: ContextAuthoritySnapshotV2,
): boolean {
  return (
    canonicalValueJson(contextAuthorityProjection(previous)) !==
    canonicalValueJson(contextAuthorityProjection(next))
  );
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function sortRecord<T>(value: Record<string, T>): Record<string, T> {
  return Object.fromEntries(
    Object.entries(value).sort(([left], [right]) => left.localeCompare(right)),
  );
}
