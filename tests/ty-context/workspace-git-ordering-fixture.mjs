import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { captureWorkspaceManifest } from "../../packages/ty-context/dist/lib/long-task-workspace.js";
import { createDeliveryFixture } from "./long-task-delivery-fixtures.mjs";

export async function assertWorkspaceGitOrdering() {
  const fixture = await createDeliveryFixture();
  const traceRoot = await mkdtemp(
    path.join(os.tmpdir(), "ty-context-git-trace-"),
  );
  const traceFile = path.join(traceRoot, "events.jsonl");
  const previousTrace = process.env.GIT_TRACE2_EVENT;
  try {
    process.env.GIT_TRACE2_EVENT = traceFile;
    await captureWorkspaceManifest(fixture.root, fixture.workdir);
    const events = (await readFile(traceFile, "utf8"))
      .trim()
      .split(/\r?\n/u)
      .map((line) => JSON.parse(line));
    const writeStart = events.find(
      (event) => event.event === "start" && event.argv?.at(1) === "write-tree",
    );
    const writeExit = events.find(
      (event) => event.event === "exit" && event.sid === writeStart?.sid,
    );
    assert.ok(writeStart, "Git trace must contain write-tree");
    assert.ok(writeExit, "Git trace must contain the write-tree exit");
    const overlappingRead = events.find(
      (event) =>
        event.event === "start" &&
        event.sid !== writeStart.sid &&
        event.time < writeExit.time,
    );
    assert.equal(
      overlappingRead,
      undefined,
      `read-only Git started before write-tree exited: ${JSON.stringify(overlappingRead)}`,
    );
  } finally {
    if (previousTrace === undefined) delete process.env.GIT_TRACE2_EVENT;
    else process.env.GIT_TRACE2_EVENT = previousTrace;
    await rm(fixture.root, { recursive: true, force: true });
    await rm(traceRoot, { recursive: true, force: true });
  }
}
