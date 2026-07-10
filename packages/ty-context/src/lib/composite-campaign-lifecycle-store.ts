import { createCompositeCampaignStore } from "./composite-campaign-store-internal.js";

const store = createCompositeCampaignStore();

export const publishHandoffCas = store.publishHandoffCas;
export const bindGoalCas = store.bindGoalCas;
export const projectResultCas = store.projectResultCas;
