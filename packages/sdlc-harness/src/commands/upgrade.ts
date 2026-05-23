import { runUpgrade } from "../lib/upgrade.js";

export async function upgrade(): Promise<void> {
  const report = await runUpgrade(process.cwd());
  for (const line of report) {
    console.log(line);
  }
}
