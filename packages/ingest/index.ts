import "./src/server.ts";
import { runRetention } from "./src/retention";

const RETENTION_INTERVAL_MS = 60 * 1000;

runRetention();
setInterval(runRetention, RETENTION_INTERVAL_MS);
