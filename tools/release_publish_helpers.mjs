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
