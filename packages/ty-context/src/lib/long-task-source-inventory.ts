import { readFile } from "node:fs/promises";
import path from "node:path";
import type { CompiledSourceItemV2 } from "./long-task-delivery-types.js";
import { assertProtectedRepositoryFile } from "./long-task-protected-files.js";
import { parseSourceItems } from "./long-task-source-item-parser.js";

export async function compileSourceInventory(
  repository: string,
  sourcePaths: string[],
): Promise<CompiledSourceItemV2[]> {
  const items: CompiledSourceItemV2[] = [];
  const seen = new Set<string>();
  for (const [index, relative] of sourcePaths.entries()) {
    const file = await assertProtectedRepositoryFile(
      repository,
      path.resolve(repository, ...relative.split("/")),
      `source[${index}]`,
    );
    const parsed = parseSourceItems(relative, await readFile(file, "utf8"));
    if (!parsed.length)
      throw new Error(`source_file_material_item_required:${relative}`);
    for (const item of parsed) {
      if (seen.has(item.key))
        throw new Error(`source_item_key_duplicate:${item.key}`);
      seen.add(item.key);
      items.push(item);
    }
  }
  return items.sort((left, right) => left.key.localeCompare(right.key));
}
