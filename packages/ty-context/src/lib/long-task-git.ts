import path from "node:path";

export function longTaskGitArgs(root: string, args: string[]): string[] {
  const resolved = path.resolve(root).replace(/^\\\\\?\\/u, "");
  const safeDirectory = process.platform === "win32" ? resolved.replace(/\\/gu, "/") : resolved;
  return ["-c", `safe.directory=${safeDirectory}`, ...args];
}
