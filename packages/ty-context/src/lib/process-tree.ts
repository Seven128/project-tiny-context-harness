import { spawn } from "node:child_process";
import {
  getProcessStartIdentity,
  isProcessAlive,
  matchesRecordedProcessIdentity,
} from "./process-identity.js";

export interface RecordedProcessIdentityV1 {
  pid: number;
  process_start_identity: string | null;
}

export interface ProcessTreeCleanupV1 {
  remaining_known_descendant_pids: number[];
  process_tree_cleanup_status:
    | "clean"
    | "graceful"
    | "forced"
    | "identity_mismatch_skipped"
    | "warning_unverified_remaining";
}

export function windowsTaskkillArgvV1(pid: number, force: boolean): string[] {
  if (!Number.isInteger(pid) || pid < 1) throw new Error("worker_pid_invalid");
  const args = ["/PID", String(pid), "/T"];
  if (force) args.push("/F");
  return args;
}

export async function captureKnownProcessTreeV1(
  rootPid: number,
): Promise<RecordedProcessIdentityV1[]> {
  if (process.platform === "win32") return windowsProcessTree(rootPid);
  const pids = [rootPid, ...(await unixDescendants(rootPid))];
  return Promise.all(
    [...new Set(pids)].map(async (pid) => ({
      pid,
      process_start_identity: await getProcessStartIdentity(pid),
    })),
  );
}

export async function terminateKnownProcessTree(
  pid: number,
  processStartIdentity: string | null,
  force: boolean,
  known: RecordedProcessIdentityV1[] = [],
): Promise<ProcessTreeCleanupV1> {
  if (!(await matchesRecordedProcessIdentity(pid, processStartIdentity)))
    return cleanupResult(
      known.filter((item) => item.pid !== pid && isProcessAlive(item.pid)),
      "identity_mismatch_skipped",
    );
  if (process.platform === "win32") {
    await runCommand("taskkill", windowsTaskkillArgvV1(pid, force));
  } else {
    const current = await captureKnownProcessTreeV1(pid);
    const records = mergeRecords(known, current);
    const signal: NodeJS.Signals = force ? "SIGKILL" : "SIGTERM";
    for (const record of records.sort((left, right) => right.pid - left.pid))
      if (
        record.process_start_identity &&
        (await matchesRecordedProcessIdentity(
          record.pid,
          record.process_start_identity,
        ))
      )
        signalProcess(record.pid, signal);
  }
  const remaining = known.filter(
    (item) => item.pid !== pid && isProcessAlive(item.pid),
  );
  return cleanupResult(remaining, force ? "forced" : "graceful");
}

export async function cleanupKnownProcessDescendantsV1(
  rootPid: number,
  known: RecordedProcessIdentityV1[],
): Promise<ProcessTreeCleanupV1> {
  const descendants = mergeRecords(known).filter(
    (record) => record.pid !== rootPid && isProcessAlive(record.pid),
  );
  let unverified = false;
  for (const record of descendants) {
    if (
      !record.process_start_identity ||
      !(await matchesRecordedProcessIdentity(
        record.pid,
        record.process_start_identity,
      ))
    ) {
      unverified = true;
      continue;
    }
    if (process.platform === "win32")
      await runCommand("taskkill", windowsTaskkillArgvV1(record.pid, true));
    else signalProcess(record.pid, "SIGKILL");
  }
  await new Promise((resolve) => setTimeout(resolve, 50));
  const remaining = descendants.filter((record) => isProcessAlive(record.pid));
  return cleanupResult(
    remaining,
    remaining.length || unverified ? "warning_unverified_remaining" : "clean",
  );
}

function cleanupResult(
  remaining: RecordedProcessIdentityV1[],
  status: ProcessTreeCleanupV1["process_tree_cleanup_status"],
): ProcessTreeCleanupV1 {
  return {
    remaining_known_descendant_pids: remaining
      .map((item) => item.pid)
      .sort((left, right) => left - right),
    process_tree_cleanup_status: status,
  };
}

function mergeRecords(
  ...groups: RecordedProcessIdentityV1[][]
): RecordedProcessIdentityV1[] {
  const merged = new Map<number, RecordedProcessIdentityV1>();
  for (const record of groups.flat()) {
    const prior = merged.get(record.pid);
    if (
      !prior ||
      (!prior.process_start_identity && record.process_start_identity)
    )
      merged.set(record.pid, record);
  }
  return [...merged.values()];
}

async function unixDescendants(parent: number): Promise<number[]> {
  const probe = await runCommand("ps", ["-eo", "pid=,ppid="]);
  if (!probe.ok) return [];
  const children = new Map<number, number[]>();
  for (const line of probe.stdout.split(/\r?\n/u)) {
    const match = /^\s*(\d+)\s+(\d+)\s*$/u.exec(line);
    if (!match) continue;
    const pid = Number(match[1]);
    const ppid = Number(match[2]);
    children.set(ppid, [...(children.get(ppid) ?? []), pid]);
  }
  const found: number[] = [];
  const visit = (pid: number) => {
    for (const child of children.get(pid) ?? []) {
      found.push(child);
      visit(child);
    }
  };
  visit(parent);
  return found;
}

async function windowsProcessTree(
  rootPid: number,
): Promise<RecordedProcessIdentityV1[]> {
  const script =
    '$rows=Get-CimInstance Win32_Process | ForEach-Object { $started=$null; try { $started=([DateTimeOffset]$_.CreationDate.ToUniversalTime()).ToUnixTimeMilliseconds() } catch {}; "$($_.ProcessId) $($_.ParentProcessId) $started" }; $rows';
  const probe = await runCommand("powershell.exe", [
    "-NoLogo",
    "-NoProfile",
    "-NonInteractive",
    "-Command",
    script,
  ]);
  if (!probe.ok)
    return [
      {
        pid: rootPid,
        process_start_identity: await getProcessStartIdentity(rootPid),
      },
    ];
  const children = new Map<number, number[]>();
  const identities = new Map<number, string | null>();
  for (const line of probe.stdout.split(/\r?\n/u)) {
    const match = /^\s*(\d+)\s+(\d+)\s*(\d*)\s*$/u.exec(line);
    if (!match) continue;
    const pid = Number(match[1]);
    const ppid = Number(match[2]);
    children.set(ppid, [...(children.get(ppid) ?? []), pid]);
    identities.set(pid, match[3] ? `windows:${match[3]}` : null);
  }
  const pids = [rootPid];
  for (let index = 0; index < pids.length; index += 1)
    pids.push(...(children.get(pids[index]) ?? []));
  return [...new Set(pids)].map((pid) => ({
    pid,
    process_start_identity: identities.get(pid) ?? null,
  }));
}

function signalProcess(pid: number, signal: NodeJS.Signals): void {
  try {
    process.kill(pid, signal);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
  }
}

async function runCommand(
  executable: string,
  args: string[],
): Promise<{ ok: boolean; stdout: string }> {
  return new Promise((resolve) => {
    const child = spawn(executable, args, {
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "ignore"],
    });
    const chunks: Buffer[] = [];
    let bytes = 0;
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve({
        ok,
        stdout: Buffer.concat(chunks)
          .toString("utf8")
          .slice(0, 512 * 1024),
      });
    };
    child.stdout.on("data", (chunk: Buffer) => {
      if (bytes >= 512 * 1024) return;
      const kept = chunk.subarray(0, 512 * 1024 - bytes);
      chunks.push(Buffer.from(kept));
      bytes += kept.length;
    });
    child.once("error", () => finish(false));
    child.once("close", (code) => finish(code === 0));
    timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(false);
    }, 15_000);
  });
}
