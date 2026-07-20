export function option(args: string[], name: string): string | undefined {
  const indexes = args.flatMap((value, index) =>
    value === name ? [index] : [],
  );
  if (indexes.length > 1) throw new Error(`duplicate option: ${name}`);
  if (!indexes.length) return undefined;
  const value = args[indexes[0] + 1];
  if (!value || value.startsWith("--"))
    throw new Error(`${name} requires a value`);
  return value;
}

export function rejectOptions(args: string[], allowed: string[]): void {
  for (let index = 0; index < args.length; index += 2)
    if (!allowed.includes(args[index]) || !args[index + 1])
      throw new Error(`Unknown or injected arguments: ${args.join(" ")}`);
}

export function rejectUnknown(actual: string[], allowed: string[]): void {
  if (actual.join("\0") !== allowed.join("\0"))
    throw new Error(`Unknown or injected arguments: ${actual.join(" ")}`);
}
