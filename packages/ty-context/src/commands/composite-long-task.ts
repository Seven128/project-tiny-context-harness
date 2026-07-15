export function compositeLongTask(_args: string[]): void {
  console.log(
    JSON.stringify({
      status: "retired",
      command: "composite-long-task",
      next_command: "ty-context long-task",
      historical_state_executed: false,
    }),
  );
}
