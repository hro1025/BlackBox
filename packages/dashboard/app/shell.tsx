"use client";

import { AgentListSchema } from "@blackbox/shared";
import type { AgentInfo } from "@blackbox/shared";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { StatusBadge } from "@/components/status-badge";
import { ONLINE_WITHIN_MS } from "@/lib/format";
import { subscribeLive } from "@/lib/live";
import { useNow } from "@/lib/use-now";
import { usePoll } from "@/lib/use-poll";

const REFRESH_INTERVAL_MS = 5000;

const PAGES = [
  { href: "/", title: "Overview" },
  { href: "/agents", title: "Agents" },
  { href: "/metrics", title: "Metrics" },
  { href: "/events", title: "Events" },
];

type AgentsState = {
  agents: AgentInfo[] | undefined;
  selected: AgentInfo | undefined;
  error: string | undefined;
  select: (agentId: string) => void;
  lastSeenAtMs: (agent: AgentInfo) => number;
};

const AgentsContext = createContext<AgentsState | undefined>(undefined);

export function useAgents(): AgentsState {
  const state = useContext(AgentsContext);
  if (state === undefined) {
    throw new Error("useAgents must be used inside the Shell");
  }

  return state;
}

export function isOnline(lastSeenAtMs: number, nowMs: number): boolean {
  return nowMs - lastSeenAtMs < ONLINE_WITHIN_MS;
}

function SelectedStatus({ agent }: { agent: AgentInfo }) {
  const { lastSeenAtMs } = useAgents();
  const nowMs = useNow(1000);

  return <StatusBadge online={isOnline(lastSeenAtMs(agent), nowMs)} />;
}

function BrandMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
      <rect width="28" height="28" rx="7" fill="var(--accent)" />
      <path
        d="M-2 20 L20 -2 M8 30 L30 8"
        stroke="var(--ink)"
        strokeWidth="4"
        opacity="0.9"
      />
    </svg>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [chosenAgentId, setChosenAgentId] = useState<string | undefined>(
    undefined,
  );
  const { data, error } = usePoll(
    "/api/agents",
    AgentListSchema,
    REFRESH_INTERVAL_MS,
  );
  const heardLive = useRef(new Map<string, number>());
  const agentIds = (data ?? []).map((agent) => agent.agentId).join("\n");

  useEffect(() => {
    if (agentIds === "") {
      return;
    }

    const stops = agentIds.split("\n").map((agentId) =>
      subscribeLive(agentId, () => {
        heardLive.current.set(agentId, Date.now());
      }),
    );

    return () => {
      for (const stop of stops) {
        stop();
      }
    };
  }, [agentIds]);

  const lastSeenAtMs = useCallback((agent: AgentInfo): number => {
    return Math.max(
      agent.lastSeenAtMs,
      heardLive.current.get(agent.agentId) ?? 0,
    );
  }, []);

  const selected =
    data?.find((agent) => agent.agentId === chosenAgentId) ?? data?.[0];
  const title = PAGES.find((page) => page.href === pathname)?.title ?? "";

  return (
    <AgentsContext.Provider
      value={{
        agents: data,
        selected,
        error,
        select: setChosenAgentId,
        lastSeenAtMs,
      }}
    >
      <div className="flex min-h-screen flex-col gap-3 p-3 lg:flex-row">
        <aside className="flex shrink-0 flex-col rounded-xl border border-line bg-panel p-4 lg:w-56">
          <div className="flex items-center gap-3">
            <BrandMark />
            <span className="text-lg font-semibold tracking-tight">
              BlackBox
            </span>
          </div>

          <nav className="mt-6 flex gap-1 lg:flex-col" aria-label="Pages">
            {PAGES.map((page) => {
              const active = page.href === pathname;

              return (
                <Link
                  key={page.href}
                  href={page.href}
                  aria-current={active ? "page" : undefined}
                  className={
                    active
                      ? "rounded-lg border-l-2 border-accent bg-raised px-3 py-2 text-sm font-medium"
                      : "rounded-lg border-l-2 border-transparent px-3 py-2 text-sm text-muted hover:bg-raised hover:text-ink"
                  }
                >
                  {page.title}
                </Link>
              );
            })}
          </nav>

          <p className="mt-auto hidden pt-6 text-xs text-muted lg:block">
            {error === undefined
              ? "Connected to the ingest server"
              : "The ingest server is not answering"}
          </p>
        </aside>

        <div className="min-w-0 flex-1 rounded-xl border border-line bg-panel">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-6 py-4">
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>

            {selected !== undefined && data !== undefined && (
              <div className="flex items-center gap-4">
                <SelectedStatus agent={selected} />
                <label className="flex items-center gap-2 text-sm text-muted">
                  Agent
                  <select
                    value={selected.agentId}
                    onChange={(event) => {
                      setChosenAgentId(event.target.value);
                    }}
                    className="rounded-lg border border-line bg-raised px-3 py-1.5 text-sm text-ink"
                  >
                    {data.map((agent) => (
                      <option key={agent.agentId} value={agent.agentId}>
                        {agent.agentId}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </header>

          <main className="p-6">{children}</main>
        </div>
      </div>
    </AgentsContext.Provider>
  );
}
