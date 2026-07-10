import { open } from "node:fs/promises";
import { TextDecoder } from "node:util";
import { assertCompositeCampaignPathSafe } from "./composite-campaign-paths.js";
import { COMPOSITE_CAMPAIGN_TRACKED_FILE_MAX_BYTES } from "./composite-campaign-security.js";

export async function readCompositeCampaignRegularFile(
  projectRoot: string,
  filePath: string,
  label: string,
  maximumBytes = COMPOSITE_CAMPAIGN_TRACKED_FILE_MAX_BYTES
): Promise<{ content: string; raw: Buffer; bytes: number }> {
  await assertCompositeCampaignPathSafe(projectRoot, filePath);
  const handle = await open(filePath, "r");
  try {
    const metadata = await handle.stat();
    if (!metadata.isFile()) throw new Error(`${label} must be a regular file`);
    if (metadata.size > maximumBytes) throw new Error(`${label} exceeds its ${maximumBytes}-byte allocation boundary`);
    const buffer = Buffer.alloc(metadata.size);
    let offset = 0;
    while (offset < buffer.byteLength) {
      const read = await handle.read(buffer, offset, buffer.byteLength - offset, offset);
      if (read.bytesRead === 0) throw new Error(`${label} changed while it was being read`);
      offset += read.bytesRead;
    }
    const after = await handle.stat();
    if (!after.isFile() || after.size !== metadata.size) throw new Error(`${label} changed while it was being read`);
    const content = decodeCompositeCampaignUtf8(buffer, label);
    return { content, raw: buffer, bytes: buffer.byteLength };
  } finally {
    await handle.close();
  }
}

export function decodeCompositeCampaignUtf8(value: Uint8Array, label: string): string {
  try {
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(value);
  } catch {
    throw new Error(`${label} must contain valid UTF-8`);
  }
}
