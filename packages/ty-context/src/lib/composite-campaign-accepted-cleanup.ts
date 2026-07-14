import path from "node:path";
import { runGit } from "./composite-campaign-git-baseline.js";
import {
  campaignWorktreesRoot,
  listCampaignWorktrees,
  listRepositoryWorktrees,
  portablePathSlug,
  removeCampaignWorktree,
} from "./composite-campaign-worktree.js";

export async function cleanupAcceptedCampaignAssetsV5(options: {
  repositoryRoot: string;
  campaignId: string;
}): Promise<void> {
  const repository = path.resolve(options.repositoryRoot);
  const ownedRoot = campaignWorktreesRoot(options);
  const worktrees = await listCampaignWorktrees(options);
  for (const worktree of worktrees.sort(
    (left, right) => right.path.length - left.path.length,
  )) {
    try {
      await removeCampaignWorktree({
        ...options,
        worktreePath: worktree.path,
        force: true,
        deleteBranch: true,
      });
    } catch (error) {
      if (!errorText(error).includes("worktree_cleanup_not_registered"))
        throw error;
    }
  }

  const prefix = `tyctx/campaign/${portablePathSlug(options.campaignId)}/`;
  const branches = (
    await runGit(repository, [
      "for-each-ref",
      "--format=%(refname:short)",
      `refs/heads/${prefix}`,
    ])
  ).stdout
    .split(/\r?\n/u)
    .map((value) => value.trim())
    .filter((value) => value.startsWith(prefix))
    .sort(asciiCompare);
  const registered = await listRepositoryWorktrees(repository);
  for (const branch of branches) {
    const checkout = registered.find((worktree) => worktree.branch === branch);
    if (checkout && !inside(ownedRoot, checkout.path))
      throw new Error("accepted_cleanup_branch_checked_out_outside_owned_root");
    const exists = await runGit(
      repository,
      ["show-ref", "--verify", "--quiet", `refs/heads/${branch}`],
      { throwOnError: false },
    );
    if (exists.exitCode === 0)
      await runGit(repository, ["branch", "-D", branch]);
  }
}

function inside(root: string, candidate: string): boolean {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}
function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
function asciiCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
