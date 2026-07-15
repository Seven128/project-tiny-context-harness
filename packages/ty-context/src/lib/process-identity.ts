import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";

export function isProcessAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid < 1) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

export async function getProcessStartIdentity(
  pid: number,
): Promise<string | null> {
  if (!Number.isInteger(pid) || pid < 1) return null;
  if (process.platform === "linux") {
    try {
      const value = await readFile(`/proc/${pid}/stat`, "utf8");
      const end = value.lastIndexOf(")");
      if (end < 0) return null;
      const startTicks = value
        .slice(end + 2)
        .trim()
        .split(/\s+/u)[19];
      return startTicks ? `linux:${startTicks}` : null;
    } catch {
      return null;
    }
  }
  if (process.platform === "win32")
    return probeProcessIdentity(
      "powershell.exe",
      [
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        `$p=Get-Process -Id ${pid} -ErrorAction Stop; ([DateTimeOffset]$p.StartTime.ToUniversalTime()).ToUnixTimeMilliseconds()`,
      ],
      "windows",
    );
  return probeProcessIdentity(
    "ps",
    ["-o", "lstart=", "-p", String(pid)],
    process.platform,
  );
}

export async function matchesRecordedProcessIdentity(
  pid: number,
  identity: string | null | undefined,
): Promise<boolean> {
  if (!identity || !isProcessAlive(pid)) return false;
  return (await getProcessStartIdentity(pid)) === identity;
}

async function probeProcessIdentity(
  executable: string,
  args: string[],
  prefix: string,
): Promise<string | null> {
  return new Promise((resolve) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let settled = false;
    const child = spawn(executable, args, {
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "ignore"],
    });
    const chunks: Buffer[] = [];
    let bytes = 0;
    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(value);
    };
    child.stdout.on("data", (chunk: Buffer) => {
      if (bytes >= 4096) return;
      const kept = chunk.subarray(0, 4096 - bytes);
      chunks.push(Buffer.from(kept));
      bytes += kept.length;
    });
    child.once("error", () => finish(null));
    child.once("close", (code) => {
      const value = Buffer.concat(chunks).toString("utf8").trim();
      finish(code === 0 && value ? `${prefix}:${value}` : null);
    });
    timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(null);
    }, 5_000);
  });
}
