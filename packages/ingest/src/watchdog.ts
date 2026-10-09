import { findNewlySilent } from "./rules/silence";
import { insertRuleEvent } from "./storage/db";

export function runWatchdog(): void {
  try {
    for (const agent of findNewlySilent(Date.now())) {
      const id = insertRuleEvent({
        agentId: agent.agentId,
        kind: "silence",
        startedAtMs: agent.lastHeardAtMs,
        detail: {},
      });
      console.log(`raised silence id=${id} agent=${agent.agentId}`);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Failed to run watchdog: ${error.message}`);
    } else {
      console.error("Failed to run watchdog:", error);
    }
  }
}
