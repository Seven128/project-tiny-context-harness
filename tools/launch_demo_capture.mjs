#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const options = {
    clean: false,
    outDir: null,
    packageSpec: "project-tiny-context-harness@latest",
    help: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--clean") {
      options.clean = true;
    } else if (arg === "--out-dir") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--out-dir requires a path");
      }
      options.outDir = path.resolve(value);
      index += 1;
    } else if (arg === "--package-spec") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--package-spec requires a value");
      }
      options.packageSpec = value;
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function printHelp() {
  console.log(`launch_demo_capture.mjs

Runs the public launch demo against a disposable repository and writes a trimmed
terminal transcript for Show HN, Product Hunt and README/social copy.

Usage:
  node tools/launch_demo_capture.mjs [--out-dir tmp/sdlc/launch-demo/latest] [--clean]
  node tools/launch_demo_capture.mjs --package-spec project-tiny-context-harness@0.2.39
`);
}

function commandSpec(command, args) {
  if (process.platform === "win32" && (command === "npm" || command === "npx")) {
    return {
      command: process.env.ComSpec || "cmd.exe",
      args: ["/d", "/s", "/c", command, ...args]
    };
  }
  return { command, args };
}

function makeDefaultOutDir() {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  return path.join(repoRoot, "tmp", "sdlc", "launch-demo", `${stamp}-${process.pid}`);
}

function run(command, args, cwd) {
  const spec = commandSpec(command, args);
  const result = spawnSync(spec.command, spec.args, {
    cwd,
    encoding: "utf8"
  });
  if (result.error) {
    throw result.error;
  }
  return {
    command,
    args,
    cwd,
    status: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || ""
  };
}

function requirePass(step) {
  if (step.status !== 0) {
    throw new Error(`${step.command} ${step.args.join(" ")} failed with exit ${step.status}\n${step.stdout}\n${step.stderr}`);
  }
  return step;
}

function commandLine(step, root) {
  const relative = path.relative(root, step.cwd).replaceAll("\\", "/") || ".";
  return `${relative}$ ${step.command} ${step.args.join(" ")}`;
}

function selectedOutput(step) {
  const output = `${step.stdout}${step.stderr}`.replace(/\r\n/g, "\n").trim();
  if (!output) {
    return "(no output)";
  }
  const lines = output.split("\n").map((line) => line.trimEnd());
  const keep = [];
  for (const line of lines) {
    if (
      /created |sync changed=|init complete|harness root:|core package:|schema version:|doctor complete|Minimal Context validation passed|loaded project_context|checked project_context|added .*packages|found 0 vulnerabilities|Wrote to|package.json/i.test(line)
    ) {
      keep.push(line);
    }
  }
  const selected = keep.length > 0 ? keep : lines.slice(0, 8);
  return selected.slice(0, 18).join("\n");
}

function assertFile(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`expected generated file missing: ${filePath}`);
  }
}

function readFirstLines(filePath, count) {
  return readFileSync(filePath, "utf8")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .slice(0, count)
    .join("\n")
    .trim();
}

function markdownCode(value) {
  return `\`\`\`text\n${value.trim()}\n\`\`\``;
}

function renderTranscript({ outDir, demoDir, packageSpec, steps, expectedFiles }) {
  const lines = [
    "# Launch Demo Transcript",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Package spec: \`${packageSpec}\``,
    `Demo repo: \`${path.relative(repoRoot, demoDir).replaceAll("\\", "/")}\``,
    "",
    "## Terminal Flow",
    ""
  ];

  for (const step of steps) {
    lines.push(markdownCode(`${commandLine(step, outDir)}\n${selectedOutput(step)}`), "");
  }

  lines.push("## Generated Recovery Surface", "");
  for (const file of expectedFiles) {
    lines.push(`- \`${file}\``);
  }

  lines.push(
    "",
    "## Fresh-Agent Recovery Prompt",
    "",
    markdownCode("Read AGENTS.md and project_context/**, then summarize the project goal, non-goals, architecture boundaries and validation commands before proposing any code change."),
    "",
    "## File Excerpts",
    "",
    "### AGENTS.md",
    "",
    markdownCode(readFirstLines(path.join(demoDir, "AGENTS.md"), 8)),
    "",
    "### project_context/global.md",
    "",
    markdownCode(readFirstLines(path.join(demoDir, "project_context", "global.md"), 12)),
    "",
    "### project_context/architecture.md",
    "",
    markdownCode(readFirstLines(path.join(demoDir, "project_context", "architecture.md"), 12)),
    ""
  );

  return `${lines.join("\n")}\n`;
}

const options = parseArgs(process.argv.slice(2));
if (options.help) {
  printHelp();
  process.exit(0);
}

const outDir = options.outDir ?? makeDefaultOutDir();
const demoDir = path.join(outDir, "project-tiny-context-harness-demo");
const expectedFiles = [
  "AGENTS.md",
  "DESIGN.md",
  "Makefile",
  ".github/workflows/harness.yml",
  "project_context/context.toml",
  "project_context/global.md",
  "project_context/architecture.md",
  "project_context/areas/main.md",
  "project_context/areas/main/verification.md"
];

try {
  mkdirSync(demoDir, { recursive: true });

  const steps = [
    requirePass(run("git", ["init"], demoDir)),
    requirePass(run("npm", ["init", "-y"], demoDir)),
    requirePass(run("npm", ["install", "--save-dev", options.packageSpec], demoDir)),
    requirePass(run("npx", ["--no-install", "sdlc-harness", "init"], demoDir)),
    requirePass(run("npx", ["--no-install", "sdlc-harness", "validate-context"], demoDir)),
    requirePass(run("npx", ["--no-install", "sdlc-harness", "doctor"], demoDir))
  ];

  for (const file of expectedFiles) {
    assertFile(path.join(demoDir, file));
  }

  const transcript = renderTranscript({
    outDir,
    demoDir,
    packageSpec: options.packageSpec,
    steps,
    expectedFiles
  });
  writeFileSync(path.join(outDir, "transcript.md"), transcript, "utf8");
  writeFileSync(
    path.join(outDir, "summary.json"),
    `${JSON.stringify(
      {
        status: "passed",
        packageSpec: options.packageSpec,
        outDir,
        demoDir,
        generatedFiles: expectedFiles,
        transcript: path.join(outDir, "transcript.md")
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  console.log("Launch demo capture passed.");
  console.log(`Demo output: ${outDir}`);
  console.log(`Transcript: ${path.join(outDir, "transcript.md")}`);
  console.log("");
  const generated = readdirSync(path.join(demoDir, "project_context")).join(", ");
  console.log(`Generated project_context entries: ${generated}`);

  if (options.clean) {
    rmSync(outDir, { recursive: true, force: true });
    console.log(`Cleaned ${outDir}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  console.error(`Demo output kept at: ${outDir}`);
  process.exit(1);
}
