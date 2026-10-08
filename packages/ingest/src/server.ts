import { timingSafeEqual } from "node:crypto";
import { MessageSchema } from "@blackbox/shared";
import type { WelcomeMessage } from "@blackbox/shared";
import {
  insertEvent,
  insertSample,
  readLastSequence,
  recordAgentSeen,
} from "./storage/db";

type ConnectionState = "authenticating" | "streaming" | "closed";

type ConnectionData = {
  state: ConnectionState;
  agentId: string | undefined;
};

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
  fetch(request, server): Response | undefined {
    const url = new URL(request.url);

    if (url.pathname === "/agent") {
      const upgraded = server.upgrade(request, {
        data: { state: "authenticating", agentId: undefined },
      });
      if (upgraded) {
        return undefined;
      }
      return new Response("WebSocket upgrade failed", { status: 400 });
    }

    return new Response("Not found", { status: 404 });
  },
  websocket: {
    data: {} as ConnectionData,
    idleTimeout: IDLE_TIMEOUT_SECONDS,
    sendPings: true,
    open(ws) {
      console.log(`open ${ws.remoteAddress} ${ws.data.state}`);

      setTimeout(() => {
        if (ws.data.state === "authenticating") {
          console.log(`hello timeout ${ws.remoteAddress}`);
          ws.close(1008, "Hello timeout");
        }
      }, HELLO_TIMEOUT_MS);
    },
    message(ws, message) {
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
          } catch (error) {
            if (error instanceof Error) {
              console.error(`Failed to store message: ${error.message}`);
            } else {
              console.error("Failed to store message:", error);
            }
          }
        }
      }
    },
    close(ws, code, reason) {
      ws.data.state = "closed";
      console.log(`close ${ws.remoteAddress} code=${code} reason=${reason}`);
    },
  },
});

console.log(`Listening on ${server.url.href}`);
