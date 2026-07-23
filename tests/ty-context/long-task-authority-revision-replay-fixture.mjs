const VIN = "verification_input_removed_or_replaced";
const ANM = "acceptance_not_monotonic";
const CA = "context_authority_changed";
const ERM = "environment_requirement_removed";
const APE = "allowed_path_expanded";
const OPE = "owner_path_expanded";
const BRE = "binding_removed_or_expanded";

// Read-only replay of the 34 adopted Rev3-Rev36 lifecycle events. The
// normalized reasons are the structured invariants the revised mechanism can
// prove; narrative judgment alone is intentionally not an automatic basis.
export const adoptedAuthorityRevisionReplay = [
  {
    revision: 3,
    eventKey: "170e5bb8",
    observedReasons: [
      ANM,
      CA,
      "negative_assertion_removed",
      "obligation_removed_or_weakened",
      "product_claim_changed",
      "product_semantics_changed",
      "runner_definition_changed",
      "source_claim_removed_or_changed",
      "source_file_content_changed",
      VIN,
      "verifier_content_changed",
    ],
    normalizedReasons: [
      "product_claim_changed",
      "product_semantics_changed",
      "verifier_content_changed",
    ],
    productSemanticFields: ["task.goal"],
    expectedUserDecision: true,
    instructionCoverage: "partial",
  },
  { revision: 4, eventKey: "7c49f5ae", normalizedReasons: [VIN] },
  {
    revision: 5,
    eventKey: "ae4efc7e",
    normalizedReasons: [ANM, ERM, VIN],
  },
  { revision: 6, eventKey: "bba20d67", normalizedReasons: [VIN] },
  { revision: 7, eventKey: "58d10c8a", normalizedReasons: [VIN] },
  { revision: 8, eventKey: "05ddc0fd", normalizedReasons: [VIN] },
  {
    revision: 9,
    eventKey: "7d9ca7d7",
    normalizedReasons: [ANM, ERM, VIN],
  },
  { revision: 10, eventKey: "a221fb6a", normalizedReasons: [VIN] },
  { revision: 11, eventKey: "02ca01cf", normalizedReasons: [VIN] },
  {
    revision: 12,
    eventKey: "938168a0",
    normalizedReasons: [
      ANM,
      "check_removed",
      "counterfactual_removed",
      "negative_assertion_removed",
      "obligation_removed_or_weakened",
      "product_claim_changed",
      "product_semantics_changed",
      "source_claim_removed_or_changed",
    ],
    productSemanticFields: ["task.target_profile.required_target_refs"],
    expectedUserDecision: true,
    instructionCoverage: "exact",
  },
  {
    revision: 13,
    eventKey: "b924e939",
    normalizedReasons: [APE, OPE, "product_semantics_changed"],
    productSemanticFields: ["stages.quality.title"],
  },
  {
    revision: 14,
    eventKey: "0028dc5d",
    normalizedReasons: [APE, CA, OPE, VIN],
  },
  { revision: 15, eventKey: "d1e2f5e5", normalizedReasons: [CA, VIN] },
  {
    revision: 16,
    eventKey: "ce805809",
    normalizedReasons: [ANM, BRE, CA, VIN],
    bindingChanges: ["quality:screen-chain:apps/mobile/src/screens/**"],
  },
  { revision: 17, eventKey: "72421538", normalizedReasons: [CA, VIN] },
  { revision: 18, eventKey: "b7c4ab37", normalizedReasons: [VIN] },
  { revision: 19, eventKey: "a86d35a2", normalizedReasons: [VIN] },
  { revision: 20, eventKey: "bf60d892", normalizedReasons: [VIN] },
  { revision: 21, eventKey: "0a615595", normalizedReasons: [VIN] },
  { revision: 22, eventKey: "6c108f70", normalizedReasons: [VIN] },
  { revision: 23, eventKey: "03459db3", normalizedReasons: [VIN] },
  { revision: 24, eventKey: "a1ecfdf8", normalizedReasons: [VIN] },
  { revision: 25, eventKey: "bb479177", normalizedReasons: [VIN] },
  { revision: 26, eventKey: "8a048208", normalizedReasons: [VIN] },
  { revision: 27, eventKey: "0fd9c72f", normalizedReasons: [VIN] },
  { revision: 28, eventKey: "eee077fb", normalizedReasons: [VIN] },
  { revision: 29, eventKey: "a173a212", normalizedReasons: [VIN] },
  {
    revision: 30,
    eventKey: "95a06fe8",
    normalizedReasons: [BRE],
    bindingChanges: ["quality:admin-web:apps/admin-web/**"],
  },
  { revision: 31, eventKey: "22b5a77d", normalizedReasons: [VIN] },
  { revision: 32, eventKey: "a39ca8b6", normalizedReasons: [VIN] },
  { revision: 33, eventKey: "94eb241e", normalizedReasons: [VIN] },
  { revision: 34, eventKey: "53d6057c", normalizedReasons: [VIN] },
  { revision: 35, eventKey: "296f7921", normalizedReasons: [] },
  {
    revision: 36,
    eventKey: "3d4a87c6",
    normalizedReasons: [ANM, CA, ERM, VIN],
  },
].map((event) => ({
  observedReasons: event.observedReasons ?? event.normalizedReasons,
  productSemanticFields: [],
  bindingChanges: [],
  expectedUserDecision: false,
  instructionCoverage: "partial",
  ...event,
}));
