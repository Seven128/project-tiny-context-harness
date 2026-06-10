const RULES = [
  {
    label: "bug",
    terms: ["bug", "crash", "error", "exception", "broken"],
    reason: "Issue text describes broken behavior."
  },
  {
    label: "documentation",
    terms: ["docs", "documentation", "readme", "example"],
    reason: "Issue text asks for documentation or examples."
  },
  {
    label: "question",
    terms: ["question", "how do i", "clarify", "unclear"],
    reason: "Issue text asks for clarification."
  }
];

export function suggestLabels(issue) {
  const text = `${issue.title ?? ""} ${issue.body ?? ""}`.toLowerCase();
  return RULES.filter((rule) => rule.terms.some((term) => text.includes(term))).map(({ label, reason }) => ({ label, reason }));
}

export function buildReviewPayload(issue) {
  return {
    issueNumber: issue.number ?? null,
    advisoryOnly: true,
    applyUrl: null,
    suggestedLabels: suggestLabels(issue)
  };
}

