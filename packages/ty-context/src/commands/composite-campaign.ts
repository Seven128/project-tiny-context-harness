export function compositeCampaign(_args: string[]): void {
  console.log(
    JSON.stringify({
      status: "retired",
      command: "composite-campaign",
      next_command: "ty-context long-task",
      historical_state_executed: false,
    }),
  );
}
