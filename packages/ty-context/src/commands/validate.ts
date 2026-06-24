import { runValidator } from "../lib/validators.js";

export async function validate(args: string[]): Promise<void> {
  const gate = args[0] ?? "validate-harness";
  const report = await runValidator(process.cwd(), gate, args.slice(1));
  for (const line of report.info) {
    console.log(line);
  }
  for (const error of report.errors) {
    console.error(`error: ${error}`);
  }
  if (report.errors.length > 0) {
    process.exitCode = 1;
  }
}
