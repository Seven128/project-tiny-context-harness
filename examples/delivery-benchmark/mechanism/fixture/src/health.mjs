export function healthStatus() {
  return { status: "ok", checks: ["billing", "notifications", "worker"] };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.stdout.write(`${JSON.stringify(healthStatus())}\n`);
}
