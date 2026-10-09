"use client";

import type { TimelineEvent } from "@blackbox/shared";
import { describeEvent, eventLength, formatDateTime } from "@/lib/format";

export function eventKey(event: TimelineEvent): string {
  return `${event.source}-${event.kind}-${event.startedAtMs}`;
}

export function EventList({
  events,
  selectedKey,
  onSelect,
}: {
  events: TimelineEvent[];
  selectedKey?: string;
  onSelect?: (event: TimelineEvent) => void;
}) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-muted">
        Nothing has happened to this agent yet.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-1">
      {events.map((event) => {
        const key = eventKey(event);
        const length = eventLength(event);
        const body = (
          <>
            <span className="block text-sm font-medium">
              {describeEvent(event)}
            </span>
            <span className="block text-xs text-muted tabular-nums">
              {formatDateTime(event.startedAtMs)}
              {length !== undefined && `, ${length}`}
            </span>
          </>
        );

        return (
          <li key={key}>
            {onSelect === undefined ? (
              <div className="border-l-2 border-line px-3 py-2">{body}</div>
            ) : (
              <button
                type="button"
                aria-pressed={key === selectedKey}
                onClick={() => {
                  onSelect(event);
                }}
                className={
                  key === selectedKey
                    ? "w-full rounded-r-lg border-l-2 border-accent bg-raised px-3 py-2 text-left"
                    : "w-full rounded-r-lg border-l-2 border-line px-3 py-2 text-left hover:bg-raised"
                }
              >
                {body}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
