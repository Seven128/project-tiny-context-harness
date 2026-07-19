import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  AGENT_SESSION_FILE,
  AGENT_SESSION_TEMPLATE_FILE,
  quote,
} from "./agent-benchmark-shared.mjs";

export function renderCodexRunbook(metadata, runDir, harnessRoot) {
  const runner = path.join(
    harnessRoot,
    "examples",
    "delivery-benchmark",
    "runner",
    "delivery_benchmark.mjs",
  );
  const agentRunner = fileURLToPath(
    new URL("./agent_benchmark.mjs", import.meta.url),
  );
  const stages = metadata.expected_stages
    .map((stage, index) =>
      renderStageRun(stage, index + 1, metadata, runDir, runner),
    )
    .join("\n\n");
  return `# External Codex Agent Run

This packet is prepared for real, independent Codex stage sessions. This file
and \`.benchmark/agent-run.json\` are operator-only and must not be pasted into or
opened by the measured Agent. The gold set and hidden quality materials remain
outside the run directory.

## Locked configuration

- track: \`${metadata.track_id}\`
- role: \`${metadata.role}\`
- variant: \`${metadata.variant_id}\`
- scenario: \`${metadata.scenario}\`
- run index: \`${metadata.run_index}\`
- Harness commit: \`${metadata.harness_commit}\`
- Harness CLI sha256: \`${metadata.harness_cli_sha256}\`
- Agent benchmark tool sha256: \`${metadata.agent_benchmark_tool_sha256}\`
- operator assets sha256: \`${metadata.operator_assets_sha256}\`
- prepared tree: \`${metadata.prepared_repository_tree}\`
- model: \`${metadata.model}\`
- reasoning: \`${metadata.reasoning}\`
- measured stages: ${metadata.expected_stages.map((stage) => `\`${stage}\``).join(", ")}

## Stage runs

Every stage uses a **new Codex session rooted at this run directory** with the locked model and reasoning settings. Never reuse a session across stages or across the paired run. Do not expose files from the operator-only \`agent-benchmark/\` directory, recovery answer keys or hidden probes.

${stages}

## Final quality and validation

After the last measured stage, confirm the product/context worktree is clean and
that the final \`main\` commit has been pushed to the prepared local
\`origin/main\`. Then run the hidden product probe:

\`\`\`sh
node ${quote(runner)} quality-probe --scenario ${metadata.scenario} --stage final --run-dir ${quote(runDir)}
\`\`\`

Copy \`.benchmark/${AGENT_SESSION_TEMPLATE_FILE}\` to \`.benchmark/${AGENT_SESSION_FILE}\`, confirm stage-prompt timing, and replace only externally observed facts for every stage session. Agent-reported token/read counts remain diagnostic unless backed by a session/tool export.

Validate the completed run:

\`\`\`sh
node ${quote(agentRunner)} validate-run --run-dir ${quote(runDir)} --complete
\`\`\`

Early exposure of a later-stage prompt invalidates the formal run. Record every out-of-protocol prompt with \`intervention-record\`.
`;
}

function renderStageRun(stage, ordinal, metadata, runDir, runner) {
  const lower = stage === "INITIAL_DELIVERY" ? "initial" : stage.toLowerCase();
  const promptFile =
    stage === "INITIAL_DELIVERY"
      ? path.join(runDir, ".benchmark", "prompt.md")
      : path.join(runDir, ".benchmark", `${lower}-prompt.md`);
  const renderPrompt =
    stage === "INITIAL_DELIVERY"
      ? `Use the already prepared prompt at ${quote(promptFile)}.`
      : `Render and record this stage prompt only now:\n\n\`\`\`sh\nnode ${quote(runner)} stage-prompt --scenario ${metadata.scenario} --mode harness --stage ${lower} --run-dir ${quote(runDir)} > ${quote(promptFile)}\n\`\`\``;
  const recoveryScore =
    stage === "RECOVERY"
      ? `\n\nAfter the recovery session writes \`.benchmark/takeover-answer.md\`, score it against the hidden answer key:\n\n\`\`\`sh\nnode ${quote(runner)} recovery-score --scenario ${metadata.scenario} --run-dir ${quote(runDir)} --answer ${quote(path.join(runDir, ".benchmark", "takeover-answer.md"))}\n\`\`\``
      : "";
  return `### ${ordinal}. ${stage}

${renderPrompt}

Start the external observer, open a new Codex session, paste only the stage prompt, complete that stage, then stop the observer:

\`\`\`sh
node ${quote(runner)} observe-start --run-dir ${quote(runDir)}
# Open the new Codex session and paste ${quote(promptFile)}.
node ${quote(runner)} observe-stop --run-dir ${quote(runDir)}
\`\`\`${recoveryScore}`;
}
