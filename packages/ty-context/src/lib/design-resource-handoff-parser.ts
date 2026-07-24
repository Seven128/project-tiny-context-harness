import { parseDesignResourceHandoffShape } from "./design-resource-handoff-shape.js";
import type { ParsedDesignResourceHandoffV1 } from "./design-resource-handoff-types.js";
import { parseSourceItems } from "./long-task-source-item-parser.js";
import { parseStrictYaml } from "./strict-codec.js";

const FENCE =
  /^```yaml[ \t]+design-resource-handoff-v1[ \t]*\r?\n([\s\S]*?)^```[ \t]*$/gmu;

export function containsDesignResourceHandoff(content: string): boolean {
  FENCE.lastIndex = 0;
  return FENCE.test(content);
}

export function parseDesignResourceHandoffMarkdown(
  handoffPath: string,
  content: string,
): ParsedDesignResourceHandoffV1 {
  FENCE.lastIndex = 0;
  const blocks = [...content.matchAll(FENCE)];
  if (blocks.length !== 1)
    throw new Error(
      `design_resource_handoff_invalid:block_count:${handoffPath}:${blocks.length}`,
    );
  try {
    const sourceItems = parseSourceItems(handoffPath, content);
    return {
      handoff_path: handoffPath,
      handoff: parseDesignResourceHandoffShape(parseStrictYaml(blocks[0][1])),
      source_item_keys: sourceItems.map((item) => item.key),
      source_item_kinds: Object.fromEntries(
        sourceItems.map((item) => [item.key, item.kind]),
      ),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith("design_resource_handoff_invalid:")) throw error;
    throw new Error(`design_resource_handoff_invalid:shape:${message}`);
  }
}
