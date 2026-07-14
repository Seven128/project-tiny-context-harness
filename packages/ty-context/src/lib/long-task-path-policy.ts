import path from "node:path";

export function assertSafeContractPath(value: string, label: string): string {
  if (
    !value ||
    value.includes("\0") ||
    value.includes("\\") ||
    path.isAbsolute(value) ||
    /^[A-Za-z]:|^\/|^\\\\|^\\[?.]\\/.test(value) ||
    /%(?:2f|5c)/i.test(value)
  )
    throw new Error(
      `${label} must be a safe repository-relative path using POSIX separators`,
    );
  const parts = value.split("/");
  if (
    parts.some(
      (part) =>
        part === "" ||
        part === "." ||
        part === ".." ||
        part.endsWith(".") ||
        part.endsWith(" ") ||
        /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i.test(part) ||
        part.includes(":"),
    )
  )
    throw new Error(`${label} contains an unsafe path segment`);
  return value;
}

export function assertLongTaskAuthorPath(value: string, label: string): string {
  const normalized = assertSafeContractPath(value, label);
  const literalPrefix = normalized
    .replace(/[?*{[]/u, "\0")
    .split("\0", 1)[0]
    .replace(/\/$/u, "");
  const protectedPaths = [
    ".git",
    ".codex",
    "tmp/ty-context/plan-acceptance",
    "runs",
    "compiled-contract.json",
    "current-status.json",
    "final-result.json",
  ];
  if (
    protectedPaths.some(
      (entry) =>
        literalPrefix === entry ||
        literalPrefix.startsWith(`${entry}/`) ||
        entry.startsWith(`${literalPrefix}/`),
    )
  )
    throw new Error(`protected_path_declared:${label}:${value}`);
  return normalized;
}

export function assertNoCaseCollisions(paths: string[], label: string): void {
  const seen = new Map<string, string>();
  for (const candidate of paths) {
    const normalized = assertSafeContractPath(candidate, label);
    const folded = normalized.toLocaleLowerCase("en-US");
    const previous = seen.get(folded);
    if (previous && previous !== normalized)
      throw new Error(
        `${label} contains case-colliding paths: ${previous}, ${normalized}`,
      );
    seen.set(folded, normalized);
  }
}

export function resolveInside(
  root: string,
  relative: string,
  label: string,
): string {
  const safe = assertSafeContractPath(relative, label);
  const resolved = path.resolve(root, safe);
  const prefix = `${path.resolve(root)}${path.sep}`;
  if (!resolved.startsWith(prefix))
    throw new Error(`${label} escapes repository root`);
  return resolved;
}
