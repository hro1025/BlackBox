import { dirname, isAbsolute, join } from "node:path";
import { AgentConfigSchema } from "@blackbox/shared";

const DEFAULT_CONFIG_PATH = `${import.meta.dir}/../agent.config.json`;

export type AgentSettings = {
  serverUrl: string;
  agentId: string;
  token: string;
  sampleIntervalMs: number;
};

export async function loadConfig(
  path: string = process.env.BLACKBOX_CONFIG ?? DEFAULT_CONFIG_PATH,
): Promise<AgentSettings> {
  const file = Bun.file(path);
  if (!(await file.exists())) {
    throw new Error(`Config file not found: ${path}`);
  }

  let raw: unknown;
  try {
    raw = await file.json();
  } catch {
    throw new Error(`Config file is not valid JSON: ${path}`);
  }

  const config = AgentConfigSchema.safeParse(raw);
  if (!config.success) {
    const problems = config.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");

    throw new Error(`Config file ${path} has problems: ${problems}`);
  }

  if (!/^wss?:\/\//.test(config.data.serverUrl)) {
    throw new Error(`serverUrl must start with ws:// or wss:// in ${path}`);
  }

  const tokenPath = isAbsolute(config.data.tokenPath)
    ? config.data.tokenPath
    : join(dirname(path), config.data.tokenPath);
  const tokenFile = Bun.file(tokenPath);
  if (!(await tokenFile.exists())) {
    throw new Error(`Token file not found: ${tokenPath}`);
  }

  const token = (await tokenFile.text()).trim();
  if (token === "") {
    throw new Error(`Token file is empty: ${tokenPath}`);
  }

  return {
    serverUrl: config.data.serverUrl,
    agentId: config.data.agentId,
    token,
    sampleIntervalMs: config.data.sampleIntervalMs,
  };
}
