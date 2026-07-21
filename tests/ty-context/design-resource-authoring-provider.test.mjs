import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { runOpenDesignMcpDiscoverySmoke } from "../../tools/open_design_live_smoke.mjs";

const fixture = fileURLToPath(
  new URL("./fixtures/mock-open-design-mcp.mjs", import.meta.url),
);

test("Open Design discovery transport verifies capabilities without provider mutations", async () => {
  const result = await runOpenDesignMcpDiscoverySmoke({
    command: process.execPath,
    args: [fixture],
  });
  assert.equal(result.schema_version, "open-design-discovery-smoke-v1");
  assert.equal(result.provider.name, "mock-open-design");
  assert.equal(result.mutations_performed, false);
  assert.ok(result.required_tools.includes("start_run"));
  assert.ok(result.required_tools.includes("get_artifact"));
  assert.deepEqual(Object.keys(result.probes).sort(), [
    "list_agents",
    "list_plugins",
    "list_skills",
  ]);
  for (const probe of Object.values(result.probes)) {
    assert.equal(probe.content_blocks, 1);
    assert.equal(probe.has_structured_content, true);
  }
});

test("mock provider gaps and discovery errors fail closed", async () => {
  for (const [mode, expected] of [
    ["missing-tool", /missing required.*get_artifact/iu],
    ["probe-error", /list_skills returned isError=true/iu],
  ]) {
    await assert.rejects(
      runOpenDesignMcpDiscoverySmoke({
        command: process.execPath,
        args: [fixture],
        env: { ...process.env, MOCK_OPEN_DESIGN_MODE: mode },
      }),
      expected,
    );
  }
});

test(
  "live Open Design discovery smoke is explicitly opt-in and read-only",
  { skip: process.env.TY_CONTEXT_OPEN_DESIGN_LIVE !== "1" },
  async () => {
    const command = process.env.TY_CONTEXT_OPEN_DESIGN_MCP_COMMAND;
    assert.ok(command, "TY_CONTEXT_OPEN_DESIGN_MCP_COMMAND is required");
    const args = JSON.parse(
      process.env.TY_CONTEXT_OPEN_DESIGN_MCP_ARGS_JSON ?? "[]",
    );
    const result = await runOpenDesignMcpDiscoverySmoke({ command, args });
    assert.equal(result.mutations_performed, false);
    assert.ok(result.tool_count >= result.required_tools.length);
  },
);
