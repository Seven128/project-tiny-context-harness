import { currentHead, runGit } from "./composite-campaign-git-baseline.js";
import {
  runCampaignGh,
  type CampaignGhRunner,
} from "./composite-campaign-gh.js";

export interface TargetAuthorityV1 {
  authoritative_ref: string;
  target_commit: string;
  target_tree: string;
  upstream_ref: string | null;
  remote: string | null;
}

export async function resolveTargetAuthority(options: {
  repository: string;
  targetBranch: string;
}): Promise<TargetAuthorityV1> {
  const upstream = await upstreamRef(options.repository, options.targetBranch);
  const remote = await configuredRemote(
    options.repository,
    options.targetBranch,
  );
  if (upstream && remote && remote !== ".")
    await runGit(options.repository, ["fetch", "--prune", remote], {
      timeoutMs: 120_000,
    });
  const authoritativeRef = upstream ?? options.targetBranch;
  const targetCommit = await currentHead(options.repository, authoritativeRef);
  const targetTree = (
    await runGit(options.repository, ["rev-parse", `${targetCommit}^{tree}`])
  ).stdout.trim();
  return {
    authoritative_ref: authoritativeRef,
    target_commit: targetCommit,
    target_tree: targetTree,
    upstream_ref: upstream,
    remote: remote && remote !== "." ? remote : null,
  };
}

export async function isAncestor(
  repository: string,
  ancestor: string,
  descendant: string,
): Promise<boolean> {
  return (
    (
      await runGit(
        repository,
        ["merge-base", "--is-ancestor", ancestor, descendant],
        { throwOnError: false },
      )
    ).exitCode === 0
  );
}

export async function fastForwardIntegrationToTarget(
  integration: string,
  targetRef: string,
): Promise<string> {
  await runGit(integration, ["merge", "--ff-only", targetRef], {
    timeoutMs: 120_000,
  });
  return currentHead(integration);
}

export async function rebaseIntegrationOntoTarget(
  integration: string,
  targetRef: string,
): Promise<
  | { status: "rebased"; integration_head: string }
  | {
      status: "repair_required";
      conflicted_paths: string[];
      target_ref: string;
    }
> {
  const rebase = await runGit(
    integration,
    ["rebase", "--rebase-merges", targetRef],
    { timeoutMs: 120_000, throwOnError: false },
  );
  if (rebase.exitCode === 0)
    return {
      status: "rebased",
      integration_head: await currentHead(integration),
    };
  const conflicts = await conflictedPaths(integration);
  await runGit(integration, ["rebase", "--abort"], { throwOnError: false });
  return {
    status: "repair_required",
    conflicted_paths: conflicts,
    target_ref: targetRef,
  };
}

export async function attemptRemoteFastForward(options: {
  repository: string;
  remote: string;
  targetBranch: string;
  expectedTargetCommit: string;
  integrationCommit: string;
}): Promise<
  | { status: "pushed"; target_commit: string; target_tree: string }
  | { status: "target_moved" }
  | { status: "approval_required" }
  | { status: "failed"; reason: string }
> {
  const pushed = await runGit(
    options.repository,
    [
      "push",
      options.remote,
      `${options.integrationCommit}:refs/heads/${options.targetBranch}`,
    ],
    { timeoutMs: 120_000, throwOnError: false },
  );
  const authority = await resolveTargetAuthority({
    repository: options.repository,
    targetBranch: options.targetBranch,
  });
  if (authority.target_commit !== options.expectedTargetCommit) {
    if (
      pushed.exitCode === 0 &&
      authority.target_commit === options.integrationCommit
    )
      return {
        status: "pushed",
        target_commit: authority.target_commit,
        target_tree: authority.target_tree,
      };
    return { status: "target_moved" };
  }
  if (pushed.exitCode === 0)
    throw new Error(
      "campaign_remote_push_reported_success_without_target_move",
    );
  const detail = `${pushed.stderr}\n${pushed.stdout}`;
  if (protectedOrPermissionRejection(detail))
    return { status: "approval_required" };
  return { status: "failed", reason: "remote_fast_forward_failed" };
}

export async function openAutomaticPullRequest(options: {
  repository: string;
  remote: string;
  targetBranch: string;
  integrationBranch: string;
  campaignId: string;
  ghRunner?: CampaignGhRunner;
}): Promise<string | null> {
  const gh = options.ghRunner ?? runCampaignGh;
  const published = await runGit(
    options.repository,
    ["push", "--set-upstream", options.remote, options.integrationBranch],
    { timeoutMs: 120_000, throwOnError: false },
  );
  if (published.exitCode !== 0) return null;
  const existing = await gh(options.repository, [
    "pr",
    "list",
    "--state",
    "open",
    "--base",
    options.targetBranch,
    "--head",
    options.integrationBranch,
    "--json",
    "url,state,baseRefName,headRefName",
    "--limit",
    "20",
  ]);
  if (existing.exitCode === 0) {
    try {
      const rows = JSON.parse(existing.stdout) as Array<{
        url?: unknown;
        state?: unknown;
        baseRefName?: unknown;
        headRefName?: unknown;
      }>;
      const match = rows.find(
        (row) =>
          row.state === "OPEN" &&
          row.baseRefName === options.targetBranch &&
          row.headRefName === options.integrationBranch &&
          typeof row.url === "string" &&
          /^https:\/\//u.test(row.url),
      );
      if (match && typeof match.url === "string") return match.url;
    } catch {
      // An invalid gh payload is not reusable authority; creation may still work.
    }
  }
  const created = await gh(options.repository, [
    "pr",
    "create",
    "--base",
    options.targetBranch,
    "--head",
    options.integrationBranch,
    "--title",
    `ty-context Campaign ${options.campaignId}`,
    "--body",
    `Automated integration pull request for ty-context Campaign ${options.campaignId}. Campaign acceptance remains pending until the authoritative target satisfies the Campaign.`,
  ]);
  return created.exitCode === 0
    ? (created.stdout
        .split(/\r?\n/u)
        .map((line) => line.trim())
        .find((line) => /^https:\/\//u.test(line)) ?? null)
    : null;
}

async function upstreamRef(
  repository: string,
  branch: string,
): Promise<string | null> {
  const result = await runGit(
    repository,
    [
      "rev-parse",
      "--abbrev-ref",
      "--symbolic-full-name",
      `${branch}@{upstream}`,
    ],
    { throwOnError: false },
  );
  return result.exitCode === 0 && result.stdout.trim()
    ? result.stdout.trim()
    : null;
}

async function configuredRemote(
  repository: string,
  branch: string,
): Promise<string | null> {
  const value = (
    await runGit(repository, ["config", "--get", `branch.${branch}.remote`], {
      throwOnError: false,
    })
  ).stdout.trim();
  return value || null;
}

async function conflictedPaths(root: string): Promise<string[]> {
  const output = (
    await runGit(root, ["diff", "--name-only", "--diff-filter=U", "-z"], {
      throwOnError: false,
    })
  ).stdout;
  return output
    .split("\0")
    .map((item) => item.trim())
    .filter(Boolean)
    .sort(asciiCompare);
}

function protectedOrPermissionRejection(value: string): boolean {
  return /protected branch|pre-receive hook declined|permission(?: denied)?|not permitted|remote rejected|GH006|GH013|deny updating a hidden ref/iu.test(
    value,
  );
}

function asciiCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
