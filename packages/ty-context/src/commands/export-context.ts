import { parseArgs, helpText } from "./export-context-args.js";
import type { ExportContextArgs } from "./export-context-args.js";
import { runExportContext } from "../lib/context-export.js";
import { runSourcePackExport } from "../lib/source-pack-export.js";
import type { SourcePackReport } from "../lib/source-pack-types.js";

export async function exportContext(args: string[]): Promise<void> {
  let parsed: ExportContextArgs;
  try {
    parsed = parseArgs(args);
  } catch (error) {
    console.error(`error: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
    return;
  }

  if (parsed.help || (!parsed.full && !parsed.code && !parsed.all && !parsed.sourceMode)) {
    console.log(helpText());
    if (!parsed.help) {
      process.exitCode = 1;
    }
    return;
  }

  try {
    if (parsed.sourceMode) {
      printSourcePackReport(
        await runSourcePackExport(process.cwd(), {
          mode: parsed.sourceMode,
          check: parsed.check,
          command: `ty-context export-context ${args.join(" ")}`.trim(),
          profile: parsed.profile,
          includeContext: parsed.includeContext,
          includeCode: parsed.includeCode,
          bundleStrategy: parsed.bundleStrategy,
          maxPackFiles: parsed.maxPackFiles,
          maxBundleCharacters: parsed.maxBundleCharacters,
          redactionStrict: parsed.redactionStrict,
          prune: parsed.prune,
          taskName: parsed.taskName
        }),
        parsed.check
      );
      return;
    }

    if (parsed.all) {
      await runLegacyAll(parsed.check);
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

async function runLegacyAll(check: boolean): Promise<void> {
  const now = new Date();
  const fullReport = await runExportContext(process.cwd(), { full: true, check, now });
  const codeReport = await runExportContext(process.cwd(), { code: true, check, now });
  console.log(check ? "export-context check OK" : "export-context wrote artifacts");
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
}

function printSourcePackReport(report: SourcePackReport, check: boolean): void {
  console.log(check ? "export-context check OK" : "export-context wrote artifacts");
  console.log(`mode: ${report.mode}`);
  console.log(`output directory: ${report.outputRelativePath}`);
  console.log(`source code count: ${report.sourceCodeCount}`);
  console.log(`total lines: ${report.totalLines}`);
  console.log(`total characters: ${report.totalCharacters}`);
  console.log("artifacts:");
  for (const artifact of report.artifacts) {
    console.log(`- ${artifact.kind}: ${artifact.path} (${artifact.characters} chars, ${artifact.source_count} sources)`);
  }
  console.log("recommended upload sets:");
  for (const [name, files] of Object.entries(report.recommendedUploadSets)) {
    console.log(`- ${name}: ${files.join(", ")}`);
  }
  console.log("warnings:");
  printWarnings(report.warnings);
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
