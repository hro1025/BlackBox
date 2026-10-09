import { timingSafeEqual } from "node:crypto";
import { MessageSchema } from "@blackbox/shared";
import type { WelcomeMessage } from "@blackbox/shared";
import { api } from "./api";
import { liveTopic, toLivePoints } from "./live";
import { checkMemory } from "./rules/memory";
import { noteHeard } from "./rules/silence";
import { checkSkew } from "./rules/skew";
import {
  endRuleEvent,
  insertEvent,
  insertRuleEvent,
  insertSample,
  readLastSequence,
  recordAgentSeen,
} from "./storage/db";

type ConnectionState = "authenticating" | "streaming" | "closed";

type AgentConnection = {
  role: "agent";
  state: ConnectionState;
  agentId: string | undefined;
};

type ViewerConnection = {
  role: "viewer";
  agentId: string;
};

type ConnectionData = AgentConnection | ViewerConnection;

const HELLO_TIMEOUT_MS = 5000;
const IDLE_TIMEOUT_SECONDS = 30;

const AGENTS_PATH = `${import.meta.dir}/../agents.json`;

const agentTokens = (await Bun.file(AGENTS_PATH).json()) as Record<
  string,
  string
>;

function isValidToken(agentId: string, token: string): boolean {
  const expected = agentTokens[agentId];
  if (expected === undefined) {
    return false;
  }

  const expectedBytes = Buffer.from(expected);
  const tokenBytes = Buffer.from(token);
  if (expectedBytes.length !== tokenBytes.length) {
    return false;
  }

  return timingSafeEqual(expectedBytes, tokenBytes);
}

export const server = Bun.serve({
  port: 7070,
  fetch(request, server): Response | Promise<Response> | undefined {
    const url = new URL(request.url);

    if (url.pathname === "/agent") {
      const upgraded = server.upgrade(request, {
        data: { role: "agent", state: "authenticating", agentId: undefined },
      });
      if (upgraded) {
        return undefined;
      }
      return new Response("WebSocket upgrade failed", { status: 400 });
    }

    if (url.pathname === "/live") {
      const agentId = url.searchParams.get("agentId");
      if (agentId === null || agentId === "") {
        return new Response("agentId is required", { status: 400 });
      }

      const upgraded = server.upgrade(request, {
        data: { role: "viewer", agentId: agentId },
      });
      if (upgraded) {
        return undefined;
      }
      return new Response("WebSocket upgrade failed", { status: 400 });
    }

    return api.fetch(request);
  },
  websocket: {
    data: {} as ConnectionData,
    idleTimeout: IDLE_TIMEOUT_SECONDS,
    sendPings: true,
    open(ws) {
      const connection = ws.data;

      if (connection.role === "viewer") {
        ws.subscribe(liveTopic(connection.agentId));
        console.log(`viewer open ${ws.remoteAddress} ${connection.agentId}`);
        return;
      }

      console.log(`open ${ws.remoteAddress} ${connection.state}`);

      setTimeout(() => {
        if (connection.state === "authenticating") {
          console.log(`hello timeout ${ws.remoteAddress}`);
          ws.close(1008, "Hello timeout");
        }
      }, HELLO_TIMEOUT_MS);
    },
    message(ws, message) {
      if (ws.data.role === "viewer") {
        return;
      }

      let raw: unknown;
      try {
        raw = JSON.parse(String(message));
      } catch {
        console.log(`invalid message from ${ws.remoteAddress}: not JSON`);
        return;
      }

      const result = MessageSchema.safeParse(raw);
      if (!result.success) {
        console.log(`invalid message from ${ws.remoteAddress}: unknown shape`);
        return;
      }

      const incoming = result.data;

      if (ws.data.state === "authenticating") {
        if (incoming.type !== "hello") {
          ws.close(1008, "Expected hello");
          return;
        }

        if (!isValidToken(incoming.agentId, incoming.token)) {
          console.log(
            `auth failed for ${incoming.agentId} from ${ws.remoteAddress}`,
          );
          ws.close(1008, "Invalid credentials");
          return;
        }

        let lastSeq: number;
        try {
          recordAgentSeen(incoming.agentId, incoming.bootId);
          lastSeq = readLastSequence(incoming.agentId);
        } catch (error) {
          if (error instanceof Error) {
            console.error(`Failed to read storage: ${error.message}`);
          } else {
            console.error("Failed to read storage:", error);
          }
          ws.close(1011, "Storage error");
          return;
        }

        ws.data.state = "streaming";
        ws.data.agentId = incoming.agentId;
        console.log(`authenticated ${incoming.agentId}`);

        const welcome: WelcomeMessage = {
          type: "welcome",
          lastSeq: lastSeq,
        };
        ws.send(JSON.stringify(welcome));
        console.log(`welcome ${incoming.agentId} lastSeq=${lastSeq}`);
        return;
      }

      if (ws.data.state === "streaming" && ws.data.agentId !== undefined) {
        if (incoming.type === "sample" || incoming.type === "event") {
          try {
            const nowMs = Date.now();
            if (noteHeard(ws.data.agentId, nowMs)) {
              endRuleEvent(ws.data.agentId, "silence", nowMs);
              console.log(`cleared silence agent=${ws.data.agentId}`);
            }

            const skew = checkSkew(
              ws.data.agentId,
              incoming.sampledAtMs,
              nowMs,
            );
            if (skew.raise) {
              const id = insertRuleEvent({
                agentId: ws.data.agentId,
                kind: "clock-skew",
                startedAtMs: nowMs,
                detail: { aheadMs: skew.aheadMs },
              });
              console.log(
                `raised clock-skew id=${id} agent=${ws.data.agentId} ahead=${Math.round(skew.aheadMs / 1000)}s`,
              );
            }
            if (skew.clear) {
              endRuleEvent(ws.data.agentId, "clock-skew", nowMs);
              console.log(`cleared clock-skew agent=${ws.data.agentId}`);
            }

            let stored: boolean;
            if (incoming.type === "sample") {
              stored = insertSample({
                agentId: ws.data.agentId,
                sequence: incoming.seq,
                kind: incoming.kind,
                sampledAtMs: incoming.sampledAtMs,
                payload: incoming.data,
              });
            } else {
              stored = insertEvent({
                agentId: ws.data.agentId,
                sequence: incoming.seq,
                kind: incoming.kind,
                sampledAtMs: incoming.sampledAtMs,
                detail: incoming.detail,
              });
            }

            if (stored) {
              console.log(
                `${incoming.type} seq=${incoming.seq} kind=${incoming.kind}`,
              );
            } else {
              console.log(`duplicate seq=${incoming.seq} ignored`);
            }

            if (stored && incoming.type === "sample") {
              const points = toLivePoints(ws.data.agentId, {
                sequence: incoming.seq,
                kind: incoming.kind,
                sampledAtMs: incoming.sampledAtMs,
                payload: incoming.data,
              });

              for (const point of points) {
                ws.publish(liveTopic(ws.data.agentId), JSON.stringify(point));
              }
            }

            if (
              stored &&
              incoming.type === "sample" &&
              incoming.kind === "memory"
            ) {
              const check = checkMemory(
                ws.data.agentId,
                incoming.sampledAtMs,
                incoming.data,
              );
              const used = check.usedPercent.toFixed(1);

              if (check.raise) {
                const id = insertRuleEvent({
                  agentId: ws.data.agentId,
                  kind: "memory-high",
                  startedAtMs: incoming.sampledAtMs,
                  detail: { usedPercent: check.usedPercent },
                });
                console.log(
                  `raised memory-high id=${id} agent=${ws.data.agentId} used=${used}%`,
                );
              }

              if (check.clear) {
                endRuleEvent(
                  ws.data.agentId,
                  "memory-high",
                  incoming.sampledAtMs,
                );
                console.log(
                  `cleared memory-high agent=${ws.data.agentId} used=${used}%`,
                );
              }
            }
          } catch (error) {
            if (error instanceof Error) {
              console.error(`Failed to handle message: ${error.message}`);
            } else {
              console.error("Failed to handle message:", error);
            }
          }
        }
      }
    },
    close(ws, code, reason) {
      if (ws.data.role === "viewer") {
        console.log(`viewer close ${ws.remoteAddress} code=${code}`);
        return;
      }

      ws.data.state = "closed";
      console.log(`close ${ws.remoteAddress} code=${code} reason=${reason}`);
    },
  },
});

console.log(`Listening on ${server.url.href}`);
