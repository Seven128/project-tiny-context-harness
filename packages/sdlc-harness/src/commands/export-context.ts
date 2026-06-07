import { runExportContext } from "../lib/context-export.js";

interface ExportContextArgs {
  full: boolean;
  check: boolean;
  output?: string;
  help: boolean;
}

export async function exportContext(args: string[]): Promise<void> {
  let parsed: ExportContextArgs;
  try {
    parsed = parseArgs(args);
  } catch (error) {
    console.error(`error: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
    return;
  }

  if (parsed.help || !parsed.full) {
    console.log(helpText());
    if (!parsed.help) {
      process.exitCode = 1;
    }
    return;
  }

  try {
    const report = await runExportContext(process.cwd(), {
      full: parsed.full,
      check: parsed.check,
      output: parsed.output
    });
    console.log(parsed.check ? "export-context check OK" : "export-context wrote artifact");
    console.log(`output: ${report.outputRelativePath}`);
    console.log(`source context count: ${report.sourceContextCount}`);
    console.log("source files:");
    for (const file of report.sourceFiles) {
      console.log(`- ${file}`);
    }
    console.log("warnings:");
    if (report.warnings.length === 0) {
      console.log("- none");
    } else {
      for (const warning of report.warnings) {
        console.log(`- ${warning}`);
      }
    }
  } catch (error) {
    console.error(`error: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

function parseArgs(args: string[]): ExportContextArgs {
  const parsed: ExportContextArgs = { full: false, check: false, help: false };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--full") {
      parsed.full = true;
      continue;
    }
    if (arg === "--check") {
      parsed.check = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
      continue;
    }
    if (arg === "--output") {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("export-context --output requires a path");
      }
      parsed.output = value;
      index += 1;
      continue;
    }
    if (arg.startsWith("--output=")) {
      const value = arg.slice("--output=".length).trim();
      if (!value) {
        throw new Error("export-context --output requires a path");
      }
      parsed.output = value;
      continue;
    }
    throw new Error(`unknown export-context argument: ${arg}`);
  }
  return parsed;
}

function helpText(): string {
  return `sdlc-harness export-context:
  export-context --full [--output tmp/sdlc/context-exports/<name>.md] [--check]

Creates a temporary full project context Markdown artifact for copying or external-tool ingestion.
The artifact must stay under tmp/sdlc/context-exports/** and must not be referenced from project_context/context.toml.`;
}
