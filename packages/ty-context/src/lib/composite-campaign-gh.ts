import { spawn } from "node:child_process";

export type CampaignGhRunner = (
  cwd: string,
  args: string[],
) => Promise<{ exitCode: number; stdout: string }>;

export const runCampaignGh: CampaignGhRunner = async (cwd, args) =>
  new Promise((resolve) => {
    const child = spawn("gh", args, {
      cwd,
      shell: false,
      windowsHide: true,
      env: {
        ...process.env,
        GH_PROMPT_DISABLED: "1",
        GIT_TERMINAL_PROMPT: "0",
      },
      stdio: ["ignore", "pipe", "ignore"],
    });
    const chunks: Buffer[] = [];
    let bytes = 0;
    let settled = false;
    const finish = (exitCode: number) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        exitCode,
        stdout: Buffer.concat(chunks)
          .toString("utf8")
          .slice(0, 64 * 1024),
      });
    };
    child.stdout.on("data", (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes <= 64 * 1024) chunks.push(Buffer.from(chunk));
      else child.kill("SIGKILL");
    });
    child.on("error", () => finish(-1));
    child.on("close", (code) => finish(code ?? -1));
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(-1);
    }, 120_000);
  });
