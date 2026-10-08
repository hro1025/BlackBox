import { MessageSchema } from "@blackbox/shared";
import type {
  EventMessage,
  HelloMessage,
  SampleMessage,
} from "@blackbox/shared";
import { readSamplesAfter } from "../storage/db";
import { reconnectDelayMs } from "./backoff";

const SERVER_URL = "ws://localhost:7070/agent";
const AGENT_ID = "test-agent";
const TOKEN = "secret";
const PROTOCOL_VERSION = 1;
const PING_INTERVAL_MS = 5000;
const DEAD_AFTER_MS = 15000;
const SEND_BATCH_SIZE = 1000;
const MAX_BUFFERED_BYTES = 1_000_000;

let activeSocket: WebSocket | undefined;
let lastSentSequence: number | undefined;
let reconnectAttempt = 0;

export function connect(bootId: string): void {
  const socket = new WebSocket(SERVER_URL);
  activeSocket = socket;
  let lastHeardAtMs = Date.now();

  const heartbeat = setInterval(() => {
    if (Date.now() - lastHeardAtMs > DEAD_AFTER_MS) {
      console.log("Connection is dead: nothing heard from server");
      socket.terminate();
      return;
    }

    if (socket.readyState === WebSocket.OPEN) {
      socket.ping();
    }
  }, PING_INTERVAL_MS);

  socket.addEventListener("open", () => {
    console.log(`Connected to ${SERVER_URL}`);
    lastHeardAtMs = Date.now();

    const hello: HelloMessage = {
      type: "hello",
      agentId: AGENT_ID,
      token: TOKEN,
      protocolVersion: PROTOCOL_VERSION,
      bootId: bootId,
    };

    socket.send(JSON.stringify(hello));
  });

  socket.addEventListener("pong", () => {
    lastHeardAtMs = Date.now();
  });

  socket.addEventListener("message", (event) => {
    lastHeardAtMs = Date.now();

    let raw: unknown;
    try {
      raw = JSON.parse(String(event.data));
    } catch {
      console.log("Invalid message from server: not JSON");
      return;
    }

    const result = MessageSchema.safeParse(raw);
    if (!result.success) {
      console.log("Invalid message from server: unknown shape");
      return;
    }

    const incoming = result.data;

    if (incoming.type === "welcome") {
      console.log(`Welcome from server, lastSeq ${incoming.lastSeq}`);
      reconnectAttempt = 0;
      lastSentSequence = incoming.lastSeq;
    }
  });

  socket.addEventListener("close", (event) => {
    console.log(`Connection closed: ${event.code} ${event.reason}`);
    clearInterval(heartbeat);
    activeSocket = undefined;
    lastSentSequence = undefined;

    const delayMs = reconnectDelayMs(reconnectAttempt, Math.random());
    reconnectAttempt += 1;
    console.log(`Reconnecting in ${Math.round(delayMs)} ms`);

    setTimeout(() => {
      connect(bootId);
    }, delayMs);
  });

  socket.addEventListener("error", () => {
    console.error("Connection error");
  });
}

export function sendPending(): void {
  if (activeSocket === undefined || lastSentSequence === undefined) {
    return;
  }

  if (activeSocket.bufferedAmount > MAX_BUFFERED_BYTES) {
    console.log(`Send paused: ${activeSocket.bufferedAmount} bytes waiting`);
    return;
  }

  try {
    const rows = readSamplesAfter(lastSentSequence, SEND_BATCH_SIZE);

    for (const row of rows) {
      if (row.kind === "lifecycle") {
        const message: EventMessage = {
          type: "event",
          seq: row.sequence,
          kind: row.kind,
          sampledAtMs: row.sampledAtMs,
          detail: row.payload,
        };
        activeSocket.send(JSON.stringify(message));
      } else {
        const message: SampleMessage = {
          type: "sample",
          seq: row.sequence,
          kind: row.kind,
          sampledAtMs: row.sampledAtMs,
          data: row.payload,
        };
        activeSocket.send(JSON.stringify(message));
      }

      lastSentSequence = row.sequence;
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Failed to send samples: ${error.message}`);
    } else {
      console.error("Failed to send samples:", error);
    }
  }
}
