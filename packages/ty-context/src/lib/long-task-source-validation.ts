import { readFile } from "node:fs/promises";
import path from "node:path";
import type { SourceClaimV2 } from "./long-task-delivery-types.js";
import { assertProtectedRepositoryFile } from "./long-task-protected-files.js";

export async function validateSourceAnchors(
  repository: string,
  sourceClaims: SourceClaimV2[],
): Promise<void> {
  const anchorsByFile = new Map<string, Set<string>>();
  for (const [index, claim] of sourceClaims.entries()) {
    const [relative, anchor] = claim.source_ref.split("#");
    if (!anchor) continue;
    let anchors = anchorsByFile.get(relative);
    if (!anchors) {
      const file = await assertProtectedRepositoryFile(
        repository,
        path.resolve(repository, ...relative.split("/")),
        `source[${index}]`,
      );
      anchors = markdownAnchors(await readFile(file, "utf8"));
      anchorsByFile.set(relative, anchors);
    }
    if (!anchors.has(anchor))
      throw new Error(
        `source_claim_anchor_not_found:${claim.key}:${claim.source_ref}`,
      );
  }
}

export function markdownAnchors(content: string): Set<string> {
  const anchors = new Set<string>();
  const slugCounts = new Map<string, number>();
  for (const line of content.split(/\r?\n/u)) {
    const heading = /^(?: {0,3})#{1,6}\s+(.+?)\s*#*\s*$/u.exec(line);
    if (heading) {
      const base = githubSlug(heading[1]);
      if (base) {
        const count = slugCounts.get(base) ?? 0;
        anchors.add(count === 0 ? base : `${base}-${count}`);
        slugCounts.set(base, count + 1);
      }
    }
    for (const match of line.matchAll(
      /(?:\{#([A-Za-z0-9._:-]+)\}|(?:id|name)=["']([^"']+)["'])/gu,
    ))
      anchors.add(match[1] ?? match[2]);
  }
  return anchors;
}

function githubSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/<[^>]*>/gu, "")
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s+/gu, "-")
    .replace(/-+/gu, "-");
}
