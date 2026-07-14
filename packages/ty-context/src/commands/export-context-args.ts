import type { SourcePackMode } from "../lib/source-pack-types.js";

export interface ExportContextArgs {
  full: boolean;
  code: boolean;
  all: boolean;
  sourceMode?: SourcePackMode;
  taskName?: string;
  check: boolean;
  output?: string;
  profile?: string;
  includeContext: string[];
  includeCode: string[];
  bundleStrategy?: "auto" | "area" | "topdir" | "config";
  maxPackFiles?: number;
  maxBundleCharacters?: number;
  redactionStrict: boolean;
  prune?: number;
  help: boolean;
}

export function parseArgs(args: string[]): ExportContextArgs {
  const parsed: ExportContextArgs = {
    full: false,
    code: false,
    all: false,
    check: false,
    includeContext: [],
    includeCode: [],
    redactionStrict: false,
    help: false,
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--full") parsed.full = true;
    else if (arg === "--code") parsed.code = true;
    else if (arg === "--all") parsed.all = true;
    else if (arg === "--code-index") parsed.sourceMode = "code-index";
    else if (arg === "--source-pack") parsed.sourceMode = "source-pack";
    else if (arg === "--code-bundles") parsed.sourceMode = "code-bundles";
    else if (arg === "--check") parsed.check = true;
    else if (arg === "--help" || arg === "-h") parsed.help = true;
    else if (arg === "--redaction-strict") parsed.redactionStrict = true;
    else if (arg === "--task-context")
      index = readValue(
        args,
        index,
        "export-context --task-context requires a name",
        (value) => {
          parsed.sourceMode = "task-context";
          parsed.taskName = value;
        },
      );
    else if (arg.startsWith("--task-context=")) {
      parsed.sourceMode = "task-context";
      parsed.taskName = inlineValue(
        arg,
        "--task-context",
        "export-context --task-context requires a name",
      );
    } else if (arg === "--output")
      index = readValue(
        args,
        index,
        "export-context --output requires a path",
        (value) => (parsed.output = value),
      );
    else if (arg.startsWith("--output="))
      parsed.output = inlineValue(
        arg,
        "--output",
        "export-context --output requires a path",
      );
    else if (arg === "--profile")
      index = readValue(
        args,
        index,
        "export-context --profile requires an id",
        (value) => (parsed.profile = value),
      );
    else if (arg.startsWith("--profile="))
      parsed.profile = inlineValue(
        arg,
        "--profile",
        "export-context --profile requires an id",
      );
    else if (arg === "--include-context")
      index = readValue(
        args,
        index,
        "export-context --include-context requires a repo-relative path or glob",
        (value) => parsed.includeContext.push(value),
      );
    else if (arg.startsWith("--include-context="))
      parsed.includeContext.push(
        inlineValue(
          arg,
          "--include-context",
          "export-context --include-context requires a repo-relative path or glob",
        ),
      );
    else if (arg === "--include-code")
      index = readValue(
        args,
        index,
        "export-context --include-code requires a repo-relative path or glob",
        (value) => parsed.includeCode.push(value),
      );
    else if (arg.startsWith("--include-code="))
      parsed.includeCode.push(
        inlineValue(
          arg,
          "--include-code",
          "export-context --include-code requires a repo-relative path or glob",
        ),
      );
    else if (arg === "--bundle-strategy")
      index = readValue(
        args,
        index,
        "export-context --bundle-strategy requires auto, area, topdir or config",
        (value) => (parsed.bundleStrategy = parseBundleStrategy(value)),
      );
    else if (arg.startsWith("--bundle-strategy="))
      parsed.bundleStrategy = parseBundleStrategy(
        inlineValue(
          arg,
          "--bundle-strategy",
          "export-context --bundle-strategy requires auto, area, topdir or config",
        ),
      );
    else if (arg === "--max-pack-files")
      index = readValue(
        args,
        index,
        "export-context --max-pack-files requires a positive integer",
        (value) =>
          (parsed.maxPackFiles = parseInteger(
            value,
            "--max-pack-files",
            false,
          )),
      );
    else if (arg.startsWith("--max-pack-files="))
      parsed.maxPackFiles = parseInteger(
        inlineValue(
          arg,
          "--max-pack-files",
          "export-context --max-pack-files requires a positive integer",
        ),
        "--max-pack-files",
        false,
      );
    else if (arg === "--max-bundle-characters")
      index = readValue(
        args,
        index,
        "export-context --max-bundle-characters requires a positive integer",
        (value) =>
          (parsed.maxBundleCharacters = parseInteger(
            value,
            "--max-bundle-characters",
            false,
          )),
      );
    else if (arg.startsWith("--max-bundle-characters="))
      parsed.maxBundleCharacters = parseInteger(
        inlineValue(
          arg,
          "--max-bundle-characters",
          "export-context --max-bundle-characters requires a positive integer",
        ),
        "--max-bundle-characters",
        false,
      );
    else if (arg === "--prune")
      index = readValue(
        args,
        index,
        "export-context --prune requires a non-negative integer",
        (value) => (parsed.prune = parseInteger(value, "--prune", true)),
      );
    else if (arg.startsWith("--prune="))
      parsed.prune = parseInteger(
        inlineValue(
          arg,
          "--prune",
          "export-context --prune requires a non-negative integer",
        ),
        "--prune",
        true,
      );
    else throw new Error(`unknown export-context argument: ${arg}`);
  }
  validateParsedArgs(parsed);
  return parsed;
}

export function helpText(): string {
  return `ty-context export-context:
  export-context --full [--output tmp/ty-context/context-exports/<name>.md] [--check]
  export-context --code [--output tmp/ty-context/context-exports/<name>.md] [--check]
  export-context --all [--check]
  export-context --code-index [--profile <id>] [--include-code <path-or-glob>] [--check]
  export-context --source-pack [--profile <id>] [--bundle-strategy auto|area|topdir|config] [--max-pack-files 5] [--max-bundle-characters <n>] [--redaction-strict] [--check]
  export-context --code-bundles [--profile <id>] [--include-code <path-or-glob>] [--max-pack-files 5] [--check]
  export-context --task-context <name> [--profile <id>] [--include-context <path-or-glob>] [--include-code <path-or-glob>] [--max-pack-files 5] [--redaction-strict] [--check]

Creates temporary Markdown artifacts for copying or external-tool ingestion.
--full exports the project Context summary as a full-project-context artifact.
--code exports one current implementation snapshot as a code-level-implementation artifact.
--all exports both default artifacts in one command.
Source Pack modes write only tmp/ty-context/context-exports/latest/ and remove old timestamped rounds.
--source-pack and --task-context are bounded to at most 5 files; --max-pack-files cannot exceed 5.
Profiles are export selectors read from <harnessRoot>/config.yaml; verification entries are listed, not executed.
Secret redaction is always enabled; --redaction-strict fails if redaction was required.
The artifact must stay under tmp/ty-context/context-exports/** and must not be referenced from project_context/context.toml.`;
}

function validateParsedArgs(parsed: ExportContextArgs): void {
  const modeCount =
    Number(parsed.full) +
    Number(parsed.code) +
    Number(parsed.all) +
    Number(parsed.sourceMode !== undefined);
  if (modeCount > 1) {
    throw new Error(
      "export-context accepts exactly one mode: --full, --code, --all, --code-index, --source-pack, --code-bundles or --task-context",
    );
  }
  if (parsed.all && parsed.output) {
    throw new Error(
      "export-context --all writes two default artifacts; --output is only supported with --full or --code",
    );
  }
  if (parsed.sourceMode && parsed.output) {
    throw new Error(
      "export-context --output is only supported with legacy --full or --code single-artifact modes",
    );
  }
  if (!parsed.sourceMode && hasSourcePackOnlyOptions(parsed)) {
    throw new Error(
      "profile/include/bundle/max/prune/redaction-strict options are only supported with Source Pack modes",
    );
  }
}

function readValue(
  args: string[],
  index: number,
  message: string,
  apply: (value: string) => void,
): number {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(message);
  }
  apply(value);
  return index + 1;
}

function inlineValue(arg: string, flag: string, message: string): string {
  const value = arg.slice(`${flag}=`.length).trim();
  if (!value) throw new Error(message);
  return value;
}

function parseBundleStrategy(
  value: string,
): "auto" | "area" | "topdir" | "config" {
  if (
    value === "auto" ||
    value === "area" ||
    value === "topdir" ||
    value === "config"
  )
    return value;
  throw new Error(
    "export-context --bundle-strategy must be one of auto, area, topdir or config",
  );
}

function parseInteger(value: string, flag: string, allowZero: boolean): number {
  const parsed = Number.parseInt(value, 10);
  if (
    !Number.isInteger(parsed) ||
    String(parsed) !== value.trim() ||
    parsed < 0 ||
    (!allowZero && parsed === 0)
  ) {
    throw new Error(
      `export-context ${flag} requires ${allowZero ? "a non-negative" : "a positive"} integer`,
    );
  }
  return parsed;
}

function hasSourcePackOnlyOptions(parsed: ExportContextArgs): boolean {
  return Boolean(
    parsed.profile ||
    parsed.includeContext.length > 0 ||
    parsed.includeCode.length > 0 ||
    parsed.bundleStrategy ||
    parsed.maxPackFiles ||
    parsed.maxBundleCharacters ||
    parsed.redactionStrict ||
    parsed.prune !== undefined,
  );
}
