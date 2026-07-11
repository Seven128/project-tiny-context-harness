import { randomBytes } from "node:crypto";
import { chmod, mkdir, open, readFile, readdir, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { canonicalJson, parseStrictJson, sha256Hex } from "./composite-campaign-codec.js";
import { LongTaskHostSignerV1, type HostSignatureV1 } from "./long-task-host-signing.js";

export interface HostStorageOptionsV1 {
  stateRoot: string;
  keyRoot?: string;
  now?: () => number;
  fault?: (point: string) => void;
}

export interface HostStorageWriteV1 {
  path: string;
  content: string | null;
}

interface JournalWriteV1 extends HostStorageWriteV1 {
  content_sha256: string | null;
}

interface JournalTransactionV1 extends HostSignatureV1 {
  schema_version: "ty-context-host-journal-v1";
  transaction_id: string;
  sequence: number;
  operation: string;
  created_at: string;
  writes: JournalWriteV1[];
}

interface AppliedMarkerV1 extends HostSignatureV1 {
  schema_version: "ty-context-host-journal-applied-v1";
  transaction_id: string;
  transaction_sha256: string;
  applied_at: string;
}

export class LongTaskHostStorageV1 {
  readonly stateRoot: string;
  readonly signer: LongTaskHostSignerV1;
  readonly now: () => number;
  private readonly fault?: (point: string) => void;

  constructor(options: HostStorageOptionsV1) {
    this.stateRoot = path.resolve(options.stateRoot);
    this.signer = new LongTaskHostSignerV1(path.resolve(options.keyRoot ?? this.stateRoot));
    this.now = options.now ?? Date.now;
    this.fault = options.fault;
  }

  async withExclusive<T>(operation: () => Promise<T>): Promise<T> {
    await this.ensureLayout();
    const release = await this.acquireLock();
    try {
      await this.recoverUnlocked();
      return await operation();
    } finally {
      await release();
    }
  }

  async readJson<T>(relativePath: string): Promise<T | null> {
    const file = this.inside(relativePath);
    try {
      return parseStrictJson(await readFile(file, "utf8")) as T;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      if (error instanceof SyntaxError || /JSON/u.test(message(error))) throw new Error(`host_registry_integrity_failure:invalid_json:${relativePath}`);
      throw error;
    }
  }

  async commitUnlocked(operation: string, inputWrites: HostStorageWriteV1[]): Promise<void> {
    const paths = new Set<string>();
    const writes: JournalWriteV1[] = inputWrites.map((write) => {
      this.inside(write.path);
      if (paths.has(write.path)) throw new Error(`host_registry_transaction_invalid:duplicate_path:${write.path}`);
      paths.add(write.path);
      return { ...write, content_sha256: write.content === null ? null : sha256Hex(write.content) };
    });
    const sequence = await this.nextSequence();
    const transaction = await this.signer.sign({
      schema_version: "ty-context-host-journal-v1" as const,
      transaction_id: uuidV7(this.now()),
      sequence,
      operation,
      created_at: new Date(this.now()).toISOString(),
      writes
    });
    const journalPath = `journal/${String(sequence).padStart(16, "0")}-${transaction.transaction_id}.json`;
    await this.atomicWrite(this.inside(journalPath), canonicalJson(transaction), true, 0o444);
    this.fault?.(`after_journal_commit:${operation}`);
    for (const write of writes) await this.applyWrite(write);
    await this.writeApplied(transaction);
  }

  async recoverUnlocked(): Promise<void> {
    await this.quarantineStaging();
    const transactions = await this.transactions();
    const final = new Map<string, JournalWriteV1>();
    const pending: JournalTransactionV1[] = [];
    for (const [index, transaction] of transactions.entries()) {
      for (const write of transaction.writes) final.set(write.path, write);
      const markerPath = this.appliedPath(transaction.transaction_id);
      const marker = await this.readJson<AppliedMarkerV1>(markerPath);
      if (marker) {
        await this.signer.verify(marker);
        if (marker.schema_version !== "ty-context-host-journal-applied-v1" || marker.transaction_id !== transaction.transaction_id || marker.transaction_sha256 !== transaction.record_sha256) throw new Error("host_registry_integrity_failure:journal_marker");
      } else if (index !== transactions.length - 1) throw new Error("host_registry_integrity_failure:historical_journal_marker_missing");
      else pending.push(transaction);
    }
    for (const transaction of pending) { for (const write of transaction.writes) await this.applyWrite(write); await this.writeApplied(transaction); }
    for (const write of final.values()) await this.assertApplied(write);
  }

  private async transactions(): Promise<JournalTransactionV1[]> {
    const directory = this.inside("journal");
    const entries = await readdir(directory, { withFileTypes: true });
    const unknown = entries.filter((entry) => entry.name !== "applied" && (entry.isFile() || !entry.isDirectory()) && !/^\d{16}-[0-9a-f-]+\.json$/u.test(entry.name));
    if (unknown.length) throw new Error(`host_registry_integrity_failure:unknown_journal_entry:${unknown[0].name}`);
    const names = entries.filter((entry) => entry.isFile() && /^\d{16}-[0-9a-f-]+\.json$/u.test(entry.name)).map((entry) => entry.name).sort();
    const result: JournalTransactionV1[] = [];
    let prior = 0;
    for (const name of names) {
      const value = await this.readJson<JournalTransactionV1>(`journal/${name}`);
      if (!value) throw new Error("host_registry_integrity_failure:journal_missing");
      await this.signer.verify(value);
      if (value.schema_version !== "ty-context-host-journal-v1" || value.sequence !== prior + 1 || !Array.isArray(value.writes)) throw new Error("host_registry_integrity_failure:journal_order");
      if (!name.startsWith(`${String(value.sequence).padStart(16, "0")}-${value.transaction_id}`)) throw new Error("host_registry_integrity_failure:journal_identity");
      for (const write of value.writes) {
        this.inside(write.path);
        if ((write.content === null ? null : sha256Hex(write.content)) !== write.content_sha256) throw new Error("host_registry_integrity_failure:journal_content");
      }
      prior = value.sequence;
      result.push(value);
    }
    return result;
  }

  private async assertApplied(write: JournalWriteV1): Promise<void> {
    const file = this.inside(write.path);
    try {
      const content = await readFile(file, "utf8");
      if (write.content === null || sha256Hex(content) !== write.content_sha256) throw new Error(`host_registry_integrity_failure:state_mismatch:${write.path}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT" && write.content === null) return;
      if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new Error(`host_registry_integrity_failure:state_missing:${write.path}`);
      throw error;
    }
  }

  private async applyWrite(write: JournalWriteV1): Promise<void> {
    const file = this.inside(write.path);
    if (write.content === null) {
      await chmod(file, 0o600).catch(() => undefined);
      await rm(file, { force: true });
      return;
    }
    await this.atomicWrite(file, write.content, false, 0o444);
  }

  private async writeApplied(transaction: JournalTransactionV1): Promise<void> {
    const marker = await this.signer.sign({
      schema_version: "ty-context-host-journal-applied-v1" as const,
      transaction_id: transaction.transaction_id,
      transaction_sha256: transaction.record_sha256,
      applied_at: new Date(this.now()).toISOString()
    });
    await this.atomicWrite(this.inside(this.appliedPath(transaction.transaction_id)), canonicalJson(marker), true, 0o444);
  }

  private async atomicWrite(file: string, content: string, createOnly: boolean, mode: number): Promise<void> {
    await mkdir(path.dirname(file), { recursive: true });
    const temporary = path.join(this.inside("staging"), `${path.basename(file)}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`);
    const handle = await open(temporary, "wx", 0o600);
    try {
      await handle.writeFile(content, "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    await chmod(temporary, mode);
    if (createOnly) {
      try { await stat(file); throw new Error(`host_registry_create_only_conflict:${file}`); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    } else {
      await chmod(file, 0o600).catch(() => undefined);
    }
    try {
      await rename(temporary, file);
    } catch (error) {
      if (!createOnly && ["EEXIST", "EPERM"].includes((error as NodeJS.ErrnoException).code ?? "")) {
        await rm(file, { force: true });
        await rename(temporary, file);
      } else {
        await rm(temporary, { force: true });
        throw error;
      }
    }
    await this.syncParent(path.dirname(file));
  }

  private async quarantineStaging(): Promise<void> {
    const staging = this.inside("staging");
    const quarantine = this.inside("quarantine");
    await mkdir(quarantine, { recursive: true });
    for (const name of await readdir(staging)) {
      const target = path.join(quarantine, `${Date.now()}-${randomBytes(6).toString("hex")}-${name}`);
      await rename(path.join(staging, name), target);
    }
  }

  private async nextSequence(): Promise<number> {
    const names = await readdir(this.inside("journal"));
    return names.reduce((maximum, name) => Math.max(maximum, Number(name.slice(0, 16)) || 0), 0) + 1;
  }

  private async ensureLayout(): Promise<void> {
    for (const directory of ["keys", "registry/contracts", "registry/active/records", "registry/active/by-repository", "registry/active/by-workdir", "registry/reservations/by-repository", "registry/reservations/by-workdir", "journal", "journal/applied", "staging", "quarantine", "locks", "audit"]) await mkdir(this.inside(directory), { recursive: true });
  }

  private async acquireLock(): Promise<() => Promise<void>> {
    const file = this.inside("locks/registry.lock");
    for (let attempt = 0; attempt < 400; attempt += 1) {
      try {
        const handle = await open(file, "wx", 0o600);
        await handle.writeFile(canonicalJson({ pid: process.pid, created_at: new Date(this.now()).toISOString(), nonce: randomBytes(16).toString("base64url") }));
        await handle.sync();
        return async () => { await handle.close(); await rm(file, { force: true }); };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        const info = await stat(file).catch(() => null);
        if (info && this.now() - info.mtimeMs > 60_000) {
          const lock = await this.readJson<{ pid?: number }>("locks/registry.lock").catch(() => null);
          if (!lock?.pid || !processAlive(lock.pid)) await rename(file, this.inside(`quarantine/stale-lock-${this.now()}-${randomBytes(4).toString("hex")}.json`)).catch(() => undefined);
        }
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
    }
    throw new Error("host_registry_unavailable:lock_timeout");
  }

  private inside(relativePath: string): string {
    if (!relativePath || path.isAbsolute(relativePath) || relativePath.split(/[\\/]/u).includes("..")) throw new Error(`host_registry_path_invalid:${relativePath}`);
    const result = path.resolve(this.stateRoot, relativePath);
    if (!result.startsWith(`${this.stateRoot}${path.sep}`)) throw new Error(`host_registry_path_invalid:${relativePath}`);
    return result;
  }

  private appliedPath(transactionId: string): string {
    return `journal/applied/${transactionId}.json`;
  }

  private async syncParent(directory: string): Promise<void> {
    try { const handle = await open(directory, "r"); try { await handle.sync(); } finally { await handle.close(); } } catch (error) { if (!["EINVAL", "EISDIR", "EPERM", "EACCES"].includes((error as NodeJS.ErrnoException).code ?? "")) throw error; }
  }
}

function uuidV7(now: number): string {
  const bytes = randomBytes(16);
  let timestamp = BigInt(Math.floor(now));
  for (let index = 5; index >= 0; index -= 1) { bytes[index] = Number(timestamp & 0xffn); timestamp >>= 8n; }
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function processAlive(pid: number): boolean {
  try { process.kill(pid, 0); return true; } catch { return false; }
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
