import { loadSuperpowersState } from "./superpowers-task-state.js";

export async function nextSuperpowersSlices(workdir: string, limit = 5): Promise<string[]> {
  const state = await loadSuperpowersState(workdir);
  return Object.entries(state.graph.proof_layers)
    .filter(([, layer]) => layer.required && layer.status !== "satisfied")
    .slice(0, limit)
    .map(([layerId], index) => {
      const acId = layerId.split(".")[0];
      const planId = Object.entries(state.graph.plan_items).find(([, item]) => item.related_acs.includes(acId))?.[0] ?? "PI";
      return `${index + 1}. ${planId}/${acId}: close ${layerId}`;
    });
}

