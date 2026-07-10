import { link } from "node:fs/promises";
import path from "node:path";
import {
  assertCompositeRegularFileIdentity,
  compositeRegularFileIdentity,
  hasCode,
  syncExactRegularFile
} from "./composite-campaign-atomic-io.js";
import { assertCompositeCampaignLockOwner, type CompositeCampaignLock } from "./composite-campaign-lock.js";
import { assertCompositeCampaignPathSafe } from "./composite-campaign-paths.js";

export async function installCompositeCampaignExactLink(input: {
  project_root: string;
  source: string;
  target: string;
  sha256: string;
  bytes: number;
  lock: CompositeCampaignLock;
  label: string;
}): Promise<void> {
  if (!await syncExactRegularFile(input.source, input.sha256, input.bytes)) {
    throw new Error(`${input.label} source changed before install`);
  }
  const identity = await compositeRegularFileIdentity(input.source);
  await assertCompositeCampaignPathSafe(input.project_root, input.source);
  await assertCompositeCampaignPathSafe(input.project_root, path.dirname(input.target));
  await assertCompositeCampaignPathSafe(input.project_root, input.target);
  await assertCompositeRegularFileIdentity(input.source, identity);
  await assertCompositeCampaignLockOwner(input.lock);
  let linked = false;
  try { await link(input.source, input.target); linked = true; }
  catch (error) { if (!hasCode(error, "EEXIST")) throw error; }
  if (!await syncExactRegularFile(input.target, input.sha256, input.bytes)) {
    throw new Error(`${input.label} destination conflicts with immutable content`);
  }
  if (linked) await assertCompositeRegularFileIdentity(input.target, identity);
}
