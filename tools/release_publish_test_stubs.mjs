import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export function stubbedReleasePublishResult({ command, commandArgs, options = {}, root, packageName }) {
  const invocation = [command, ...commandArgs].join(" ");
  if (invocation === "git status --porcelain") {
    return result("");
  }
  if (invocation === "git branch --show-current") {
    return result("main\n");
  }
  if (invocation === "git rev-parse HEAD" || invocation === "git rev-parse refs/remotes/origin/main") {
    return result("abc123\n");
  }
  if (invocation.startsWith(`npm view ${packageName}@`)) {
    return { code: 1, stdout: "", stderr: "E404\n", output: "E404\n" };
  }
  if (invocation === `npm view ${packageName} version dist-tags.latest dist.integrity --json`) {
    const version = readPackageVersionSync(root);
    const output = JSON.stringify({ version, "dist-tags.latest": version, "dist.integrity": "sha512-test" });
    return result(output);
  }
  if (invocation === "npm whoami") {
    return result("tester\n");
  }
  if (invocation.startsWith("npm pack --json")) {
    const version = readPackageVersionSync(root);
    const output = JSON.stringify([{ filename: `${packageName}-${version}.tgz`, shasum: "abc", integrity: "sha512-test" }]);
    return result(output);
  }
  if (invocation.startsWith("git tag -l ")) {
    return result("");
  }
  if (invocation.startsWith("node tools/github_release_publish.mjs")) {
    if (options.allowFailure) {
      return { code: 1, stdout: "", stderr: "gh not authenticated", output: "gh not authenticated" };
    }
    throw new Error("node tools/github_release_publish.mjs failed with exit code 1: gh not authenticated");
  }
  return result("");
}

function result(output) {
  return { code: 0, stdout: output, stderr: "", output };
}

function readPackageVersionSync(root) {
  const manifestPath = path.join(root, "packages", "ty-context", "package.json");
  const manifest = JSON.parse(existsSync(manifestPath) ? readFileSync(manifestPath, "utf8") : "{}");
  return manifest.version ?? "1.2.4";
}
