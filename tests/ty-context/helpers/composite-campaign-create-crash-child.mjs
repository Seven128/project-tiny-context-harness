import { createCompositeCampaignStore } from "../../../packages/ty-context/dist/lib/composite-campaign-store-internal.js";

const [root, crashAt = "before_create_publish"] = process.argv.slice(2);
const store = createCompositeCampaignStore({
  checkpoint: async (name) => {
    if (name === crashAt) process.exit(73);
  }
});

await store.createCampaign(root, {
  campaign_id: "campaign-1",
  request: "Recover interrupted creation.\n",
  operation_id: "create:crash"
});
