# Product Surface Contract

## Purpose

This Context records durable responsibilities for user-facing Product Surfaces in this project or product domain.

Write only project-specific facts that should guide future implementation. Do not copy generic platform rules, one-off audit notes, screenshots, test logs, implementation summaries, visual tokens or secrets into this file.

## Surfaces

### `<surface name>`

- Surface:
- Surface Platform:
- Owning Product Domain:
- Primary User Question:
- Surface Type:
- Main Surface Allows:
- Main Surface Forbids:
- Drilldown Ownership:
- Long Task State Requirement:
- Design Rationale:
- Empty / Loading / Stale / Unavailable:
- Security / Redaction:
- Verification:

## Cross-Surface Rules

- `<durable project-specific rule>`

## Registration Example

Use the existing `contract` role for cross-surface or cross-area contracts:

```toml
[[context]]
path = "project_context/areas/product-surface-contracts.md"
role = "contract"
triggers = ["surface", "screen", "ui", "ux", "web", "app", "mobile", "desktop", "game", "cli", "tui", "页面", "界面", "屏幕", "产品接触面", "信息架构", "页面职责", "界面职责", "product surface"]
read_policy = "on-demand"
```

If using front matter in a Context Markdown file, use `context_role: contract`; do not use `role = "contract"` in Markdown front matter.

## Maintenance Rules

Update this Context when:

- A surface responsibility changes.
- Main/drilldown ownership changes.
- A durable long-task state contract is introduced.
- A durable main/drilldown/diagnostic ownership rationale, rejected alternative or tradeoff will guide future changes.
- A repeated UI/product rule becomes reusable.
- A platform-specific interaction rule becomes stable.

Do not update this Context for:

- CSS-only fixes.
- One-off screenshot observations.
- Temporary audit notes.
- Test logs.
- Local implementation summaries.
- PR notes, command output, screenshot review notes, debug history, agent reasoning or rationale inferred only from current code shape.
