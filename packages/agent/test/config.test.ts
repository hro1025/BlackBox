import { expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "../src/config";

const VALID = {
  serverUrl: "ws://localhost:7070/agent",
  agentId: "config-agent",
  tokenPath: "agent.token",
  sampleIntervalMs: 1000,
};

async function writeConfig(config: unknown, token?: string): Promise<string> {
  const folder = await mkdtemp(join(tmpdir(), "blackbox-config-"));
  const path = join(folder, "agent.config.json");

  await Bun.write(path, JSON.stringify(config));
  if (token !== undefined) {
    await Bun.write(join(folder, "agent.token"), token);
  }

  return path;
}

test("14.1 a valid config is loaded with its token", async () => {
  const path = await writeConfig(VALID, "secret\n");

  expect(await loadConfig(path)).toEqual({
    serverUrl: "ws://localhost:7070/agent",
    agentId: "config-agent",
    token: "secret",
    sampleIntervalMs: 1000,
  });
});

test("14.1 a missing config file is reported by its path", async () => {
  await expect(loadConfig("/nonexistent/agent.config.json")).rejects.toThrow(
    "Config file not found",
  );
});

test("14.1 a config with a missing field names the field", async () => {
  const path = await writeConfig(
    {
      serverUrl: VALID.serverUrl,
      tokenPath: "agent.token",
      sampleIntervalMs: 1000,
    },
    "secret",
  );

  await expect(loadConfig(path)).rejects.toThrow("agentId");
});

test("14.1 a server address that is not a WebSocket address is rejected", async () => {
  const path = await writeConfig(
    { ...VALID, serverUrl: "http://localhost:7070/agent" },
    "secret",
  );

  await expect(loadConfig(path)).rejects.toThrow("serverUrl must start with");
});

test("14.1 a missing or empty token file is rejected", async () => {
  const withoutToken = await writeConfig(VALID);
  const emptyToken = await writeConfig(VALID, "  \n");

  await expect(loadConfig(withoutToken)).rejects.toThrow(
    "Token file not found",
  );
  await expect(loadConfig(emptyToken)).rejects.toThrow("Token file is empty");
});
