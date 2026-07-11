import { createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify } from "node:crypto";
import { chmod, mkdir, open, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { canonicalValueJson, sha256Hex } from "./composite-campaign-codec.js";

export interface HostSignatureV1 {
  key_id: string;
  record_sha256: string;
  signature: string;
}

export class LongTaskHostSignerV1 {
  constructor(private readonly stateRoot: string) {}

  async sign<T extends object>(payload: T): Promise<T & HostSignatureV1> {
    const keys = await this.keys();
    const withKey = { ...payload, key_id: keys.keyId };
    const recordSha256 = sha256Hex(canonicalValueJson(withKey));
    const signature = sign(null, Buffer.from(recordSha256, "hex"), keys.privateKey).toString("base64url");
    return { ...withKey, record_sha256: recordSha256, signature };
  }

  async verify(value: object & HostSignatureV1): Promise<void> {
    const keys = await this.keys();
    const { signature, record_sha256, ...withKey } = value as HostSignatureV1 & Record<string, unknown>;
    if (withKey.key_id !== keys.keyId || sha256Hex(canonicalValueJson(withKey)) !== record_sha256) throw new Error("host_registry_integrity_failure:record_hash");
    if (!verify(null, Buffer.from(record_sha256, "hex"), keys.publicKey, Buffer.from(signature, "base64url"))) throw new Error("host_registry_integrity_failure:signature");
  }

  private async keys(): Promise<{ keyId: string; privateKey: ReturnType<typeof createPrivateKey>; publicKey: ReturnType<typeof createPublicKey> }> {
    const directory = path.join(this.stateRoot, "keys");
    const privateFile = path.join(directory, "host-ed25519-private.pem");
    const publicFile = path.join(directory, "host-ed25519-public.pem");
    await mkdir(directory, { recursive: true });
    const existing = await readPair(privateFile, publicFile);
    if (existing) return material(existing.privatePem, existing.publicPem);
    await this.createKeys(privateFile, publicFile);
    return material(await readFile(privateFile), await readFile(publicFile));
  }

  private async createKeys(privateFile: string, publicFile: string): Promise<void> {
    const lockFile = path.join(path.dirname(privateFile), ".create.lock");
    for (let attempt = 0; attempt < 200; attempt += 1) {
      let handle;
      try {
        handle = await open(lockFile, "wx", 0o600);
        try {
          if (await readPair(privateFile, publicFile)) return;
          const pair = generateKeyPairSync("ed25519");
          const privatePem = pair.privateKey.export({ type: "pkcs8", format: "pem" });
          const publicPem = pair.publicKey.export({ type: "spki", format: "pem" });
          await writeFile(privateFile, privatePem, { flag: "wx", mode: 0o600 });
          await writeFile(publicFile, publicPem, { flag: "wx", mode: 0o644 });
          await chmod(privateFile, 0o600);
          return;
        } finally {
          await handle.close();
          await import("node:fs/promises").then(({ rm }) => rm(lockFile, { force: true }));
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
    }
    throw new Error("host_registry_unavailable:key_creation_timeout");
  }
}

function material(privatePem: Buffer, publicPem: Buffer) {
  const privateKey = createPrivateKey(privatePem);
  const publicKey = createPublicKey(publicPem);
  const der = publicKey.export({ type: "spki", format: "der" });
  return { keyId: sha256Hex(der), privateKey, publicKey };
}

async function readPair(privateFile: string, publicFile: string): Promise<{ privatePem: Buffer; publicPem: Buffer } | null> {
  const [privateResult, publicResult] = await Promise.allSettled([readFile(privateFile), readFile(publicFile)]);
  if (privateResult.status === "fulfilled" && publicResult.status === "fulfilled") return { privatePem: privateResult.value, publicPem: publicResult.value };
  const privateMissing = privateResult.status === "rejected" && (privateResult.reason as NodeJS.ErrnoException).code === "ENOENT";
  const publicMissing = publicResult.status === "rejected" && (publicResult.reason as NodeJS.ErrnoException).code === "ENOENT";
  if (privateMissing && publicMissing) return null;
  if (privateMissing !== publicMissing) throw new Error("host_registry_integrity_failure:key_pair_partial");
  throw (privateResult.status === "rejected" ? privateResult.reason : (publicResult as PromiseRejectedResult).reason);
}
