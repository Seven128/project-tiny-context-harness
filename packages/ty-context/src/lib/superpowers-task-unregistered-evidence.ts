import path from "node:path";
import { listFiles, readText } from "./fs.js";
import { isRecord, type SuperpowersTaskState } from "./superpowers-task-state-schema.js";

export interface IgnoredUnregisteredEvidence {
  path: string;
  status: string;
  target_ac_ids: string[];
  target_proof_layers: string[];
}

export async function scanUnregisteredAssertionEvidence(
  workdir: string,
  state: SuperpowersTaskState
): Promise<{ ignored: IgnoredUnregisteredEvidence[]; errors: string[] }> {
  const registeredPaths = new Set<string>();
  for (const evidence of state.evidence ?? []) {
    for (const candidate of [evidence.artifact_path, ...(evidence.artifact_paths ?? []), ...(evidence.assertion_result?.artifacts ?? [])]) {
      if (candidate) {
        registeredPaths.add(slash(candidate));
        registeredPaths.add(slash(path.join(workdir, candidate)));
      }
    }
  }

  const ignored: IgnoredUnregisteredEvidence[] = [];
  for (const file of await listFiles(workdir)) {
    if (!/\.json$/i.test(file)) {
      continue;
    }
    const relative = slash(path.relative(workdir, file));
    if (registeredPaths.has(relative) || registeredPaths.has(slash(file))) {
      continue;
    }
    const parsed = await readJson(file);
    const assertion = assertionRecord(parsed);
    if (!assertion) {
      continue;
    }
    const status = String(assertion.status ?? "");
    if (status !== "passed") {
      continue;
    }
    ignored.push({
      path: relative,
      status,
      target_ac_ids: asStringArray(assertion.target_ac_ids),
      target_proof_layers: asStringArray(assertion.target_proof_layers)
    });
  }

  return {
    ignored,
    errors: ignored.map((item) => `ignored_unregistered_evidence: unregistered assertion JSON ${item.path} status=passed is not proof`)
  };
}

async function readJson(file: string): Promise<unknown> {
  try {
    return JSON.parse(await readText(file));
  } catch {
    return undefined;
  }
}

function assertionRecord(value: unknown): Record<string, unknown> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  if (looksLikeAssertion(value)) {
    return value;
  }
  if (isRecord(value.assertion_result) && looksLikeAssertion(value.assertion_result)) {
    return value.assertion_result;
  }
  return undefined;
}

function looksLikeAssertion(value: Record<string, unknown>): boolean {
  return /assertion-result-v\d+/i.test(String(value.schema_version ?? "")) || (typeof value.status === "string" && Array.isArray(value.target_ac_ids));
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function slash(value: string): string {
  return value.replace(/\\/g, "/");
}
