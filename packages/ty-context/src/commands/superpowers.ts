import { runCompositeLongTaskCommand } from "./composite-long-task.js";

export async function superpowers(args: string[]): Promise<void> {
  await runCompositeLongTaskCommand(args, {
    commandName: "ty-context superpowers",
    label: "superpowers task",
    showHelp: false
  });
}
