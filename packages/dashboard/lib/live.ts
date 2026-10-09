"use client";

import { LivePointSchema } from "@blackbox/shared";
import type { LivePoint } from "@blackbox/shared";

const INGEST_PORT = 7070;
const RECONNECT_MS = 3000;

type Listener = (point: LivePoint) => void;

type Channel = {
  socket: WebSocket | undefined;
  listeners: Set<Listener>;
  retry: ReturnType<typeof setTimeout> | undefined;
  closed: boolean;
};

const channels = new Map<string, Channel>();

function connect(agentId: string, channel: Channel): void {
  const scheme = window.location.protocol === "https:" ? "wss" : "ws";
  const socket = new WebSocket(
    `${scheme}://${window.location.hostname}:${INGEST_PORT}/live?agentId=${encodeURIComponent(agentId)}`,
  );
  channel.socket = socket;

  socket.addEventListener("message", (event) => {
    let raw: unknown;
    try {
      raw = JSON.parse(String(event.data));
    } catch {
      return;
    }

    const point = LivePointSchema.safeParse(raw);
    if (!point.success) {
      return;
    }

    for (const listener of channel.listeners) {
      listener(point.data);
    }
  });

  socket.addEventListener("close", () => {
    if (!channel.closed) {
      channel.retry = setTimeout(() => {
        connect(agentId, channel);
      }, RECONNECT_MS);
    }
  });
}

export function subscribeLive(agentId: string, listener: Listener): () => void {
  let channel = channels.get(agentId);

  if (channel === undefined) {
    channel = {
      socket: undefined,
      listeners: new Set(),
      retry: undefined,
      closed: false,
    };
    channels.set(agentId, channel);
    connect(agentId, channel);
  }

  const active = channel;
  active.listeners.add(listener);

  return () => {
    active.listeners.delete(listener);

    if (active.listeners.size === 0) {
      active.closed = true;
      clearTimeout(active.retry);
      active.socket?.close();
      channels.delete(agentId);
    }
  };
}
