"use client";

import { MetricSchema, TimelineSchema } from "@blackbox/shared";
import { useState } from "react";
import { EventList, eventKey } from "@/components/event-list";
import { MetricChart } from "@/components/metric-chart";
import {
  describeEvent,
  eventLength,
  eventNote,
  formatDateTime,
} from "@/lib/format";
import { usePoll } from "@/lib/use-poll";
import { useAgents } from "../shell";

const REFRESH_INTERVAL_MS = 5000;
const BEFORE_MS = 5 * 60 * 1000;
const AFTER_MS = 60 * 1000;
const SHOWN_EVENTS = 40;

export default function EventsPage() {
  const { agents, selected } = useAgents();
  const [chosenKey, setChosenKey] = useState<string | undefined>(undefined);
  const timeline = usePoll(
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

  if (timeline.data === undefined) {
    return <p className="text-sm text-muted">Loading...</p>;
  }

  const events = timeline.data.slice(0, SHOWN_EVENTS);
  const event =
    events.find((candidate) => eventKey(candidate) === chosenKey) ?? events[0];

  if (event === undefined) {
    return (
      <p className="text-sm text-muted">
        Nothing has happened to this agent yet.
      </p>
    );
  }

  const note = eventNote(event);
  const length = eventLength(event);

  return (
    <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
      <div className="lg:max-h-[calc(100vh-10rem)] lg:overflow-y-auto lg:pr-2">
        <EventList
          events={events}
          selectedKey={eventKey(event)}
          onSelect={(picked) => {
            setChosenKey(eventKey(picked));
          }}
        />
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            {describeEvent(event)}
          </h2>
          <p className="mt-1 text-sm text-muted tabular-nums">
            {formatDateTime(event.startedAtMs)}
            {length !== undefined && `, ${length}`}
            {note !== undefined && `, ${note}`}
          </p>
          <p className="mt-3 flex items-center gap-2 text-sm text-muted">
            <span aria-hidden="true" className="h-4 w-0.5 bg-accent" />
            The orange line marks the event. Each graph shows the five minutes
            before it and one minute after.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {MetricSchema.options.map((metric) => (
            <MetricChart
              key={metric}
              agentId={selected.agentId}
              metric={metric}
              window={{
                type: "fixed",
                fromMs: event.startedAtMs - BEFORE_MS,
                toMs: event.startedAtMs + AFTER_MS,
              }}
              markAtMs={event.startedAtMs}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
