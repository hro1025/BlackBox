"use client";

import { StatusBadge } from "@/components/status-badge";
import { formatDateTime, formatDuration } from "@/lib/format";
import { useNow } from "@/lib/use-now";
import { isOnline, useAgents } from "../shell";

export default function AgentsPage() {
  const { agents, selected, select, lastSeenAtMs } = useAgents();
  const nowMs = useNow(1000);

  if (agents === undefined) {
    return <p className="text-sm text-muted">Loading...</p>;
  }

  if (agents.length === 0) {
    return (
      <p className="text-sm text-muted">
        No agent has connected yet. Start one and it shows up here.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-raised">
      <table className="w-full text-left text-sm">
        <thead className="text-muted">
          <tr className="border-b border-line">
            <th className="px-4 py-3 font-medium">Agent</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Last heard from</th>
            <th className="px-4 py-3 font-medium">First connected</th>
            <th className="px-4 py-3 font-medium">Boot</th>
          </tr>
        </thead>
        <tbody>
          {agents.map((agent) => {
            const seenAtMs = lastSeenAtMs(agent);

            return (
              <tr
                key={agent.agentId}
                className="border-b border-line last:border-b-0"
              >
                <td className="px-4 py-3">
                  <button
                    type="button"
                    aria-pressed={agent.agentId === selected?.agentId}
                    onClick={() => {
                      select(agent.agentId);
                    }}
                    className={
                      agent.agentId === selected?.agentId
                        ? "font-semibold underline"
                        : "underline"
                    }
                  >
                    {agent.agentId}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge online={isOnline(seenAtMs, nowMs)} />
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {formatDateTime(seenAtMs)}
                  <span className="text-muted">
                    {", "}
                    {formatDuration(nowMs - seenAtMs)} ago
                  </span>
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {formatDateTime(agent.firstSeenAtMs)}
                </td>
                <td className="px-4 py-3 text-muted">
                  {agent.lastBootId.slice(0, 8)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
