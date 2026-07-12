import test from "node:test";
import assert from "node:assert/strict";
import { copyFile, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { runSealedOracle } from "../../packages/ty-context/dist/lib/long-task-oracle-runner.js";
import { LongTaskRedactorV3 } from "../../packages/ty-context/dist/lib/long-task-redaction.js";

const helper = process.env.TY_CONTEXT_HOST_HELPER_BIN;

test("sealed Oracle production runner crosses the real Host OS sandbox boundary", { skip: !helper, timeout: 60_000 }, async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ltw-oracle-host-sandbox-"));
  const readable = path.join(root, "read"); const writable = path.join(root, "write");
  await Promise.all([mkdir(readable), mkdir(writable)]);
  const executable = path.join(readable, process.platform === "win32" ? "node.exe" : "node");
  await copyFile(process.execPath, executable);
  const bundle = path.join(readable, "oracle.mjs");
  await writeFile(bundle, `import {writeFileSync} from "node:fs";import net from "node:net";
const port=Number(process.env.PROBE_PORT);
const network=await new Promise(resolve=>{const socket=net.createConnection({host:"127.0.0.1",port});const timer=setTimeout(()=>{socket.destroy();resolve(false)},1000);socket.once("connect",()=>{clearTimeout(timer);socket.destroy();resolve(true)});socket.once("error",()=>{clearTimeout(timer);resolve(false)})});
const value=JSON.stringify({schema_version:"ty-context-observation-v2",network});
if(process.env.TY_CONTEXT_ORACLE_PROTOCOL_FILE)writeFileSync(process.env.TY_CONTEXT_ORACLE_PROTOCOL_FILE,value);else writeFileSync(3,value);
`);
  const server = net.createServer((socket) => socket.end());
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  try {
    const result = await runSealedOracle(executable, bundle, readable, 15_000, { ...process.env, PROBE_PORT: String(server.address().port) }, { read_paths: [readable], write_paths: [writable] }, new LongTaskRedactorV3({}), { helper_path: helper, control_root: writable });
    assert.equal(result.exit_code, 0, result.stderr.toString("utf8"));
    assert.deepEqual(JSON.parse(result.protocol.toString("utf8")), { schema_version: "ty-context-observation-v2", network: false });
  } finally { server.close(); }
});
