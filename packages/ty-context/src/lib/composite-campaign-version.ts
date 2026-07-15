import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { parseStrictYaml } from "./composite-campaign-codec.js";

export type CompositeCampaignSchemaVersion =
  "composite-campaign-v5" | "composite-campaign-v6";

export async function readCompositeCampaignSchemaVersion(
  projectRoot: string,
  supplied: string,
): Promise<CompositeCampaignSchemaVersion> {
  const project = await realpath(path.resolve(projectRoot));
  const base = await realpath(
    path.join(project, ".codex", "composite-long-task", "campaigns"),
  );
  const root = await realpath(path.resolve(project, supplied));
  const relative = path.relative(base, root);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative))
    throw new Error("campaign_path_escapes_campaign_root");
  const value = parseStrictYaml(
    await readFile(path.join(root, "campaign.yaml"), "utf8"),
  );
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("campaign_schema_version_missing");
  const schema = (value as Record<string, unknown>).schema_version;
  if (schema !== "composite-campaign-v5" && schema !== "composite-campaign-v6")
    throw new Error(`campaign_schema_version_unsupported:${String(schema)}`);
  return schema;
}
