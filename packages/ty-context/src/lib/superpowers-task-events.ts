import path from "node:path";
import { ensureDir, readText, writeTextIfChanged, pathExists } from "./fs.js";

export async function appendSuperpowersEvent(
  workdir: string,
  eventType: string,
  payload: Record<string, unknown> = {}
): Promise<void> {
  const eventsPath = path.join(workdir, "events.ndjson");
  await ensureDir(workdir);
  const event = {
    event_type: eventType,
    created_at: new Date().toISOString(),
    ...payload
  };
  const previous = (await pathExists(eventsPath)) ? await readText(eventsPath) : "";
  await writeTextIfChanged(eventsPath, `${previous}${JSON.stringify(event)}\n`);
}

