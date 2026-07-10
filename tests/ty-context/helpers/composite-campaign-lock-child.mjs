import {
  acquireCompositeCampaignLock
} from "../../../packages/ty-context/dist/lib/composite-campaign-lock.js";

const [projectRoot, campaignsRoot, campaignId] = process.argv.slice(2);
const lock = await acquireCompositeCampaignLock(projectRoot, campaignsRoot, campaignId, {
  token: () => `child-${process.pid}`,
  now: () => new Date().toISOString(),
  timeout_ms: 5_000,
  retry_ms: 10
});
process.stdout.write(`ready:${lock.owner.token}\n`);
setInterval(() => undefined, 1_000);
