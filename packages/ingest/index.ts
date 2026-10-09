import "./src/server.ts";
import { runRetention } from "./src/retention";
import { closeOpenRuleEvents } from "./src/storage/db";
import { runWatchdog } from "./src/watchdog";

const RETENTION_INTERVAL_MS = 60 * 1000;
const WATCHDOG_INTERVAL_MS = 5 * 1000;

const closed = closeOpenRuleEvents(Date.now());
if (closed > 0) {
  console.log(`closed ${closed} rule events left open by the last run`);
}

runRetention();
setInterval(runRetention, RETENTION_INTERVAL_MS);
setInterval(runWatchdog, WATCHDOG_INTERVAL_MS);
