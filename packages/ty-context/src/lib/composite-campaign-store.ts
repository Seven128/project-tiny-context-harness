import { createCompositeCampaignStore } from "./composite-campaign-store-internal.js";

const store = createCompositeCampaignStore();

export const campaignsRoot = store.campaignsRoot;
export const createCampaign = store.createCampaign;
export const loadCampaignSnapshot = store.loadCampaignSnapshot;
export const applyScopeFitCas = store.applyScopeFitCas;
export const createPacketRevisionCas = store.createPacketRevisionCas;
