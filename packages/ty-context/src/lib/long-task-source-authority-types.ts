export type SourceItemKind =
  | "outcome_result"
  | "requirement"
  | "acceptance"
  | "technical_obligation"
  | "non_goal"
  | "forbidden_shortcut"
  | "risk_fact"
  | "external_confirmation"
  | "decision";

export interface CompiledSourceItemV2 {
  key: string;
  kind: SourceItemKind;
  source_path: string;
  normalized_text: string;
  text_sha256: string;
}
