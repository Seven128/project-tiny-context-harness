import { lstat, realpath } from "node:fs/promises";
import path from "node:path";

export async function assertProtectedRepositoryFile(
  repositoryInput: string,
  fileInput: string,
  label: string,
): Promise<string> {
  const repositoryPath = path.resolve(repositoryInput);
  const repository = await realpath(repositoryPath);
  const candidate = path.resolve(fileInput);
  assertInside(repositoryPath, candidate, label, fileInput);
  const info = await lstat(candidate).catch(() => null);
  if (!info)
    throw new Error(`protected_input_not_found:${label}:${display(fileInput)}`);
  if (info.isSymbolicLink())
    throw new Error(
      `protected_input_symlink_not_allowed:${label}:${display(fileInput)}`,
    );
  if (!info.isFile())
    throw new Error(
      `protected_input_not_regular_file:${label}:${display(fileInput)}`,
    );
  const resolved = await realpath(candidate);
  assertInside(repository, resolved, label, fileInput);
  if (typeof info.nlink === "number" && info.nlink > 1)
    throw new Error(
      `protected_input_hardlink_not_allowed:${label}:${display(fileInput)}`,
    );
  return resolved;
}

function assertInside(
  repository: string,
  candidate: string,
  label: string,
  original: string,
): void {
  const relative = path.relative(repository, candidate);
  if (
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  )
    throw new Error(
      `protected_input_realpath_outside_repository:${label}:${display(original)}`,
    );
}

function display(file: string): string {
  return file.replace(/\\/gu, "/");
}
