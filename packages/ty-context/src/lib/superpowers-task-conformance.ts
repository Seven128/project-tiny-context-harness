import { primitiveText } from "./plan-validator-common.js";
import type { SuperpowersTaskState } from "./superpowers-task-state-schema.js";

export function validatePlanCompletionConformance(state: SuperpowersTaskState, errors: string[]): void {
  for (const [planId, item] of Object.entries(state.graph?.plan_items ?? {})) {
    if (item.status !== "complete") {
      continue;
    }
    if (item.implementation_paths.length === 0 && item.delivery_scope !== "out_of_scope_backlog") {
      errors.push(`plan item ${planId} is complete but has no implementation_paths`);
    }
    if ((item.owner_surfaces ?? []).length > 0 && !item.required_proof_layers.some((layer) => layer.endsWith(".ui_browser"))) {
      errors.push(`plan item ${planId} is complete but owner_surfaces has no related ui_browser proof layer`);
    }
    if ((item.required_tests ?? []).length === 0 && item.explicit_no_test_scope !== true) {
      errors.push(`plan item ${planId} is complete but required_tests is empty and no explicit_no_test_scope is recorded`);
    }
    const shortcuts = item.non_completing_shortcuts ?? [];
    const evidenceText = primitiveText(state.evidence.filter((evidence) => evidence.proves.some((layer) => item.required_proof_layers.includes(layer))));
    for (const shortcut of shortcuts) {
      if (shortcut && evidenceText.toLowerCase().includes(shortcut.toLowerCase())) {
        errors.push(`plan item ${planId} is complete but evidence uses forbidden shortcut: ${shortcut}`);
      }
    }
  }
}
