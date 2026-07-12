import { access, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

interface ServerBrowser {
  close(progress: unknown, options?: { reason?: string }): Promise<void>;
}
interface CoreBundle {
  server: {
    createPlaywright(options: { sdkLanguage: string; isServer: boolean }): {
      chromium: {
        connectOverCDP(progress: unknown, options: { endpointURL: string; timeout: number; slowMo: number; headers: Array<{ name: string; value: string }> }): Promise<ServerBrowser>;
      };
    };
    nullProgress: unknown;
  };
  remote: {
    PlaywrightServer: new (options: { mode: "launchServer"; path: string; maxConnections: number; preLaunchedBrowser: ServerBrowser }) => {
      listen(port: number, host: string): Promise<string>;
      close(): Promise<void>;
    };
  };
}

const corePath = requiredPath("TY_CONTEXT_PLAYWRIGHT_CORE_BUNDLE");
const readyPath = requiredPath("TY_CONTEXT_PLAYWRIGHT_BRIDGE_READY");
const donePath = requiredPath("TY_CONTEXT_PLAYWRIGHT_BRIDGE_DONE");
const cdpEndpoint = required("TY_CONTEXT_PLAYWRIGHT_CDP_ENDPOINT");
if (!/^http:\/\/127\.0\.0\.1:\d+$/u.test(cdpEndpoint)) throw new Error("playwright_bridge_cdp_endpoint_invalid");
if (path.dirname(readyPath) !== path.dirname(donePath)) throw new Error("playwright_bridge_control_root_mismatch");

const core = createRequire(import.meta.url)(corePath) as CoreBundle;
const playwright = core.server.createPlaywright({ sdkLanguage: "javascript", isServer: true });
const browser = await playwright.chromium.connectOverCDP(core.server.nullProgress, {
  endpointURL: cdpEndpoint,
  timeout: 30_000,
  slowMo: 0,
  headers: [],
});
const server = new core.remote.PlaywrightServer({
  mode: "launchServer",
  path: "/ty-context-playwright",
  maxConnections: 1,
  preLaunchedBrowser: browser,
});
const wsEndpoint = await server.listen(0, "127.0.0.1");
await writeFile(readyPath, JSON.stringify({ schema_version: "ty-context-playwright-bridge-v1", ws_endpoint: wsEndpoint }), { flag: "wx" });

try {
  while (!(await exists(donePath))) await new Promise((resolve) => setTimeout(resolve, 50));
} finally {
  await server.close();
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`playwright_bridge_environment_missing:${name}`);
  return value;
}
function requiredPath(name: string): string {
  const value = path.resolve(required(name));
  if (!path.isAbsolute(value)) throw new Error(`playwright_bridge_path_invalid:${name}`);
  return value;
}
async function exists(file: string): Promise<boolean> {
  try { await access(file); return true; } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}
