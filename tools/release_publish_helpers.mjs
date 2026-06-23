import { spawn } from "node:child_process";

export function resolveExecutable(command) {
  if (command === "node") {
    return process.execPath;
  }
  if (process.platform === "win32") {
    if (command === "npm") {
      return "npm.cmd";
    }
    if (command === "npx") {
      return "npx.cmd";
    }
  }
  return command;
}

export function commandLogEntry(command, commandArgs) {
  return {
    argv: [command, ...commandArgs],
    executable: resolveExecutable(command),
    shell: false
  };
}

export async function runCommand(command, commandArgs, options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const capture = options.capture ?? false;
  const allowFailure = options.allowFailure ?? false;
  return new Promise((resolve, reject) => {
    const child = spawn(resolveExecutable(command), commandArgs, {
      cwd,
      shell: false,
      stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit"
    });
    let stdout = "";
    let stderr = "";
    if (capture) {
      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
    }
    child.on("error", reject);
    child.on("close", (code) => {
      const result = { code, stdout, stderr, output: `${stdout}${stderr}` };
      if (code === 0 || allowFailure) {
        resolve(result);
      } else {
        reject(new Error(`${command} ${commandArgs.join(" ")} failed with exit code ${code}: ${result.output}`));
      }
    });
  });
}

export function parsePackJson(output) {
  const parsed = parseJsonFromOutput(output);
  const pack = Array.isArray(parsed) ? parsed[0] : parsed;
  if (!pack?.filename) {
    throw new Error("Could not parse npm pack output.");
  }
  return pack;
}

export function parseJsonFromOutput(output) {
  const trimmed = output.trim();
  const index = Math.min(
    ...["[", "{"].map((marker) => {
      const found = trimmed.indexOf(marker);
      return found < 0 ? Number.POSITIVE_INFINITY : found;
    })
  );
  const candidate = Number.isFinite(index) ? trimmed.slice(index) : trimmed;
  return JSON.parse(candidate);
}

export function singleLine(value) {
  return String(value).replace(/\s+/g, " ").trim();
}

export function delay(ms) {
  if (process.env.TY_CONTEXT_RELEASE_COMMAND_LOG) {
    return Promise.resolve();
  }
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function requireValue(argv, index, flag) {
  const value = argv[index];
  if (!value) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}
