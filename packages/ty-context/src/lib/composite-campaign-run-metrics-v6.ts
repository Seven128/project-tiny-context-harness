import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { canonicalJson, parseStrictJson } from "./composite-campaign-codec.js";

const DURATION_KEYS = [
  "worker_wait_wall_ms",
  "packet_authoring_wall_ms",
  "wave_execution_wall_ms",
  "integration_wall_ms",
  "gate_wall_ms",
  "repair_wall_ms",
  "finalization_wall_ms",
] as const;
type DurationKeyV6 = (typeof DURATION_KEYS)[number];
type CountKeyV6 =
  "worktree_create_count" | "worktree_remove_count" | "worker_attempt_count";

export interface CampaignRunSummaryV6 {
  schema_version: "composite-campaign-run-summary-v6";
  campaign_id: string;
  run_generation: number;
  started_at: string;
  completed_at: string;
  run_wall_ms: number;
  worker_wait_wall_ms: number;
  packet_authoring_wall_ms: number;
  wave_execution_wall_ms: number;
  integration_wall_ms: number;
  gate_wall_ms: number;
  repair_wall_ms: number;
  finalization_wall_ms: number;
  worktree_create_count: number;
  worktree_remove_count: number;
  worker_attempt_count: number;
  mechanical_scheduler_wall_ms: number;
}

export class CampaignRunMetricsV6 {
  readonly #started = performance.now();
  readonly #startedAt = new Date().toISOString();
  readonly #durations = Object.fromEntries(
    DURATION_KEYS.map((key) => [key, 0]),
  ) as Record<DurationKeyV6, number>;
  readonly #active = new Map<DurationKeyV6, { count: number; start: number }>();
  readonly #counts: Record<CountKeyV6, number> = {
    worktree_create_count: 0,
    worktree_remove_count: 0,
    worker_attempt_count: 0,
  };

  constructor(
    readonly campaignId: string,
    readonly runGeneration: number,
  ) {}

  async measure<T>(key: DurationKeyV6, action: () => Promise<T>): Promise<T> {
    this.begin(key);
    try {
      return await action();
    } finally {
      this.end(key);
    }
  }

  increment(key: CountKeyV6, amount = 1): void {
    if (!Number.isInteger(amount) || amount < 0)
      throw new Error("campaign_run_metric_increment_invalid");
    this.#counts[key] += amount;
  }

  summary(): CampaignRunSummaryV6 {
    const completedAt = new Date().toISOString();
    const runWall = elapsed(this.#started);
    const workerWait = rounded(this.#durations.worker_wait_wall_ms);
    const gate = rounded(this.#durations.gate_wall_ms);
    return {
      schema_version: "composite-campaign-run-summary-v6",
      campaign_id: this.campaignId,
      run_generation: this.runGeneration,
      started_at: this.#startedAt,
      completed_at: completedAt,
      run_wall_ms: runWall,
      worker_wait_wall_ms: workerWait,
      packet_authoring_wall_ms: rounded(
        this.#durations.packet_authoring_wall_ms,
      ),
      wave_execution_wall_ms: rounded(this.#durations.wave_execution_wall_ms),
      integration_wall_ms: rounded(this.#durations.integration_wall_ms),
      gate_wall_ms: gate,
      repair_wall_ms: rounded(this.#durations.repair_wall_ms),
      finalization_wall_ms: rounded(this.#durations.finalization_wall_ms),
      ...this.#counts,
      mechanical_scheduler_wall_ms: Math.max(0, runWall - workerWait - gate),
    };
  }

  begin(key: DurationKeyV6): void {
    const current = this.#active.get(key);
    if (current) current.count += 1;
    else this.#active.set(key, { count: 1, start: performance.now() });
  }

  end(key: DurationKeyV6): void {
    const current = this.#active.get(key);
    if (!current) throw new Error(`campaign_run_metric_not_active:${key}`);
    current.count -= 1;
    if (current.count === 0) {
      this.#durations[key] += performance.now() - current.start;
      this.#active.delete(key);
    }
  }
}

export async function writeCampaignRunSummaryV6(
  campaignRoot: string,
  metrics: CampaignRunMetricsV6,
): Promise<CampaignRunSummaryV6> {
  const summary = metrics.summary();
  const directory = path.join(campaignRoot, "runs");
  const file = path.join(
    directory,
    `run-${summary.run_generation}-summary.json`,
  );
  await mkdir(directory, { recursive: true });
  await writeFile(file, canonicalJson(summary), {
    encoding: "utf8",
    flag: "wx",
  });
  return summary;
}

export async function readLatestCampaignRunSummaryV6(
  campaignRoot: string,
): Promise<CampaignRunSummaryV6 | null> {
  const directory = path.join(campaignRoot, "runs");
  try {
    const candidates = (await readdir(directory))
      .map((name) => ({ name, match: /^run-(\d+)-summary\.json$/u.exec(name) }))
      .filter(
        (item): item is { name: string; match: RegExpExecArray } =>
          item.match !== null,
      )
      .sort((left, right) => Number(right.match[1]) - Number(left.match[1]));
    if (!candidates.length) return null;
    return parseStrictJson(
      await readFile(path.join(directory, candidates[0].name), "utf8"),
    ) as CampaignRunSummaryV6;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

function elapsed(started: number): number {
  return rounded(performance.now() - started);
}
function rounded(value: number): number {
  return Math.max(0, Math.round(value));
}
