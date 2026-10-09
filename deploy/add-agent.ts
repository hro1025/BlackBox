import { randomBytes } from "node:crypto";

const AGENTS_PATH = `${import.meta.dir}/../packages/ingest/agents.json`;

const agentId = process.argv[2];

if (agentId === undefined || !/^[a-z0-9][a-z0-9-]*$/.test(agentId)) {
  console.error("Usage: bun run deploy/add-agent.ts <agent-id>");
  console.error("The id may contain lowercase letters, digits and dashes.");
  process.exit(1);
}

const file = Bun.file(AGENTS_PATH);
const agents = (await file.exists())
  ? ((await file.json()) as Record<string, string>)
  : {};

if (agents[agentId] !== undefined) {
  console.error(`An agent called "${agentId}" already exists.`);
  process.exit(1);
}

const token = randomBytes(24).toString("hex");
agents[agentId] = token;
await Bun.write(AGENTS_PATH, `${JSON.stringify(agents, null, 2)}\n`);

console.log(`Added "${agentId}" to packages/ingest/agents.json.`);
console.log("Restart the ingest server so it reads the new list.");
console.log("");
console.log("On the new machine, as root, with the binary next to the script:");
console.log("");
console.log(
  `  bash install-agent.sh ${agentId} ws://SERVER-ADDRESS:7070/agent ${token}`,
);
