"use client";

import { MetricSchema, TimelineSchema } from "@blackbox/shared";
import Link from "next/link";
import { EventList } from "@/components/event-list";
import { MetricChart } from "@/components/metric-chart";
import type { TimeWindow } from "@/components/metric-chart";
import { RecorderStrip } from "@/components/recorder-strip";
import { usePoll } from "@/lib/use-poll";
import { useAgents } from "./shell";

const LAST_HOUR: TimeWindow = { type: "live", lengthMs: 60 * 60 * 1000 };
const REFRESH_INTERVAL_MS = 5000;
const LATEST_EVENTS = 5;

export default function OverviewPage() {
  const { agents, selected } = useAgents();
  const events = usePoll(
    selected === undefined
      ? undefined
      : `/api/agents/${encodeURIComponent(selected.agentId)}/events`,
    TimelineSchema,
    REFRESH_INTERVAL_MS,
  );

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
      <RecorderStrip agentId={selected.agentId} />

      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {MetricSchema.options.map((metric) => (
          <MetricChart
            key={metric}
            agentId={selected.agentId}
            metric={metric}
            window={LAST_HOUR}
          />
        ))}

        <section className="rounded-lg border border-line bg-raised p-4">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-sm font-medium">Latest events</h2>
            <Link href="/events" className="text-sm text-muted underline">
              All events
            </Link>
          </div>
          <div className="mt-3">
            <EventList events={(events.data ?? []).slice(0, LATEST_EVENTS)} />
          </div>
        </section>
      </div>
    </div>
  );
}
