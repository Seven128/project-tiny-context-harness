import { access, readFile } from "node:fs/promises";
import {
  applyScopeFitCas
} from "../../../packages/ty-context/dist/lib/composite-campaign-store.js";

const [projectRoot, inputPath, barrierPath] = process.argv.slice(2);
const input = JSON.parse(await readFile(inputPath, "utf8"));
process.stdout.write("ready\n");
while (true) {
  try {
    await access(barrierPath);
    break;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}
try {
  const snapshot = await applyScopeFitCas(projectRoot, input);
  process.stdout.write(`${JSON.stringify({ status: "success", generation: snapshot.generation })}\n`);
} catch (error) {
  process.stdout.write(`${JSON.stringify({ status: "error", message: error instanceof Error ? error.message : String(error) })}\n`);
}
