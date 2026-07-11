import path from "node:path";

export function assertSafeContractPath(value: string, label: string): string {
  if (!value || value.includes("\0") || path.isAbsolute(value) || /^[A-Za-z]:/.test(value)) throw new Error(`${label} must be a safe repository-relative path`);
  const normalized = value.replace(/\\/g, "/");
  if (normalized.split("/").some((part) => part === "" || part === "." || part === "..")) throw new Error(`${label} contains an unsafe path segment`);
  return normalized;
}

export function assertNoCaseCollisions(paths: string[], label: string): void {
  const seen = new Map<string, string>();
  for (const candidate of paths) {
    const normalized = assertSafeContractPath(candidate, label);
    const folded = normalized.toLocaleLowerCase("en-US");
    const previous = seen.get(folded);
    if (previous && previous !== normalized) throw new Error(`${label} contains case-colliding paths: ${previous}, ${normalized}`);
    seen.set(folded, normalized);
  }
}

export function resolveInside(root: string, relative: string, label: string): string {
  const safe = assertSafeContractPath(relative, label);
  const resolved = path.resolve(root, safe);
  const prefix = `${path.resolve(root)}${path.sep}`;
  if (!resolved.startsWith(prefix)) throw new Error(`${label} escapes repository root`);
  return resolved;
}
