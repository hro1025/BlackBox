import { downsampleMax, MetricSchema } from "@blackbox/shared";
import { Hono } from "hono";
import { SAMPLE_KIND, toSeries } from "./metrics";
import { readAgents, readSamplesBetween, readTimeline } from "./storage/db";

const DEFAULT_SERIES_POINTS = 300;
const MAX_SERIES_POINTS = 2000;

export const api = new Hono();

api.get("/api/agents", (c) => {
  return c.json(readAgents());
});

api.get("/api/agents/:agentId/samples", (c) => {
  const fromMs = Number(c.req.query("fromMs"));
  const toMs = Number(c.req.query("toMs"));

  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) {
    return c.json({ error: "fromMs and toMs must be numbers" }, 400);
  }

  const samples = readSamplesBetween(
    c.req.param("agentId"),
    fromMs,
    toMs,
    c.req.query("kind"),
  );

  return c.json(samples);
});

api.get("/api/agents/:agentId/series", (c) => {
  const fromMs = Number(c.req.query("fromMs"));
  const toMs = Number(c.req.query("toMs"));
  const requestedPoints = Number(
    c.req.query("points") ?? DEFAULT_SERIES_POINTS,
  );

  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || toMs <= fromMs) {
    return c.json({ error: "fromMs and toMs must be a valid range" }, 400);
  }

  if (
    !Number.isInteger(requestedPoints) ||
    requestedPoints < 2 ||
    requestedPoints > MAX_SERIES_POINTS
  ) {
    return c.json({ error: "points must be a whole number, 2 to 2000" }, 400);
  }

  const metric = MetricSchema.safeParse(c.req.query("metric"));
  if (!metric.success) {
    return c.json(
      { error: `metric must be one of ${MetricSchema.options.join(", ")}` },
      400,
    );
  }

  const samples = readSamplesBetween(
    c.req.param("agentId"),
    fromMs,
    toMs,
    SAMPLE_KIND[metric.data],
  );
  const points = toSeries(metric.data, samples);

  return c.json(downsampleMax(points, fromMs, toMs, requestedPoints));
});

api.get("/api/agents/:agentId/events", (c) => {
  return c.json(readTimeline(c.req.param("agentId")));
});

api.onError((error, c) => {
  console.error(`Failed to answer ${c.req.path}: ${error.message}`);

  return c.json({ error: "Internal error" }, 500);
});
