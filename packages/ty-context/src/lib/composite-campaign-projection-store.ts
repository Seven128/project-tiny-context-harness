import { createCompositeCampaignStore } from "./composite-campaign-store-internal.js";

const store = createCompositeCampaignStore();

export const publishProjectionCas = store.publishProjectionCas;
