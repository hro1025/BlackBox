"use client";

import { MetricSchema } from "@blackbox/shared";
import { useState } from "react";
import { MetricChart } from "@/components/metric-chart";
import { useAgents } from "../shell";

const MINUTE_MS = 60 * 1000;
const RANGES = [
  { title: "15 minutes", lengthMs: 15 * MINUTE_MS },
  { title: "1 hour", lengthMs: 60 * MINUTE_MS },
  { title: "6 hours", lengthMs: 360 * MINUTE_MS },
  { title: "24 hours", lengthMs: 1440 * MINUTE_MS },
];

export default function MetricsPage() {
  const { agents, selected } = useAgents();
  const [lengthMs, setLengthMs] = useState(60 * MINUTE_MS);

  if (agents === undefined) {
    return <p className="text-sm text-muted">Loading...</p>;
  }

  if (selected === undefined) {
    return (
      <p className="text-sm text-muted">
        No agent has connected yet. Start one and it shows up here.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className="flex w-fit gap-1 rounded-lg border border-line bg-raised p-1"
        role="group"
        aria-label="Time span"
      >
        {RANGES.map((range) => (
          <button
            key={range.lengthMs}
            type="button"
            aria-pressed={range.lengthMs === lengthMs}
            onClick={() => {
              setLengthMs(range.lengthMs);
            }}
            className={
              range.lengthMs === lengthMs
                ? "rounded-md bg-panel px-3 py-1.5 text-sm font-medium"
                : "rounded-md px-3 py-1.5 text-sm text-muted hover:text-ink"
            }
          >
            {range.title}
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {MetricSchema.options.map((metric) => (
          <MetricChart
            key={metric}
            agentId={selected.agentId}
            metric={metric}
            window={{ type: "live", lengthMs }}
          />
        ))}
      </div>
    </div>
  );
}
