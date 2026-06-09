import { runExportContext } from "../lib/context-export.js";

interface ExportContextArgs {
  full: boolean;
  code: boolean;
  all: boolean;
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

  if (parsed.help || (!parsed.full && !parsed.code && !parsed.all)) {
    console.log(helpText());
    if (!parsed.help) {
      process.exitCode = 1;
    }
    return;
  }

  try {
    if (parsed.all) {
      const now = new Date();
      const fullReport = await runExportContext(process.cwd(), {
        full: true,
        check: parsed.check,
        now
      });
      const codeReport = await runExportContext(process.cwd(), {
        code: true,
        check: parsed.check,
        now
      });
      console.log(parsed.check ? "export-context check OK" : "export-context wrote artifacts");
      console.log("mode: all");
      console.log("outputs:");
      console.log(`- full: ${fullReport.outputRelativePath}`);
      console.log(`- code: ${codeReport.outputRelativePath}`);
      console.log(`source context count: ${fullReport.sourceContextCount}`);
      console.log(`source code count: ${codeReport.sourceCodeCount ?? codeReport.sourceFiles.length}`);
      console.log(`total code lines: ${codeReport.totalLines ?? 0}`);
      console.log(`total code characters: ${codeReport.totalCharacters ?? 0}`);
      console.log("warnings:");
      printWarnings([
        ...fullReport.warnings.map((warning) => `full: ${warning}`),
        ...codeReport.warnings.map((warning) => `code: ${warning}`)
      ]);
      return;
    }

    const report = await runExportContext(process.cwd(), {
      full: parsed.full,
      code: parsed.code,
      check: parsed.check,
      output: parsed.output
    });
    console.log(parsed.check ? "export-context check OK" : "export-context wrote artifact");
    console.log(`mode: ${report.mode}`);
    console.log(`output: ${report.outputRelativePath}`);
    if (report.mode === "code") {
      console.log(`source code count: ${report.sourceCodeCount ?? report.sourceFiles.length}`);
      console.log(`total lines: ${report.totalLines ?? 0}`);
      console.log(`total characters: ${report.totalCharacters ?? 0}`);
    } else {
      console.log(`source context count: ${report.sourceContextCount}`);
    }
    console.log("source files:");
    for (const file of report.sourceFiles) {
      console.log(`- ${file}`);
    }
    console.log("warnings:");
    printWarnings(report.warnings);
  } catch (error) {
    console.error(`error: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

function parseArgs(args: string[]): ExportContextArgs {
  const parsed: ExportContextArgs = { full: false, code: false, all: false, check: false, help: false };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--full") {
      parsed.full = true;
      continue;
    }
    if (arg === "--code") {
      parsed.code = true;
      continue;
    }
    if (arg === "--all") {
      parsed.all = true;
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
  const modeCount = Number(parsed.full) + Number(parsed.code) + Number(parsed.all);
  if (modeCount > 1) {
    throw new Error("export-context accepts exactly one of --full, --code or --all");
  }
  if (parsed.all && parsed.output) {
    throw new Error("export-context --all writes two default artifacts; --output is only supported with --full or --code");
  }
  return parsed;
}

function printWarnings(warnings: string[]): void {
  if (warnings.length === 0) {
    console.log("- none");
    return;
  }
  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
}

function helpText(): string {
  return `sdlc-harness export-context:
  export-context --full [--output tmp/sdlc/context-exports/<name>.md] [--check]
  export-context --code [--output tmp/sdlc/context-exports/<name>.md] [--check]
  export-context --all [--check]

Creates temporary Markdown artifacts for copying or external-tool ingestion.
--full exports the project Context summary as 当前项目context.
--code exports one current implementation snapshot as 当前项目代码实现.
--all exports both default artifacts in one command.
The artifact must stay under tmp/sdlc/context-exports/** and must not be referenced from project_context/context.toml.`;
}
