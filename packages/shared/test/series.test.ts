import { expect, test } from "bun:test";
import { breakAtGaps, downsampleMax } from "../src/series";

test("13.4 a short series is returned unchanged", () => {
  const points = [
    { atMs: 0, value: 10 },
    { atMs: 1000, value: 20 },
  ];

  expect(downsampleMax(points, 0, 10000, 5)).toEqual(points);
});

test("13.4 a long series keeps the highest point of each slot", () => {
  const points = [
    { atMs: 0, value: 10 },
    { atMs: 1000, value: 30 },
    { atMs: 2000, value: 20 },
    { atMs: 5000, value: 50 },
    { atMs: 6000, value: 40 },
    { atMs: 9000, value: 5 },
  ];

  expect(downsampleMax(points, 0, 10000, 2)).toEqual([
    { atMs: 1000, value: 30 },
    { atMs: 5000, value: 50 },
  ]);
});

test("13.4 a series without holes gets no gap markers", () => {
  const points = [
    { atMs: 0, value: 10 },
    { atMs: 1000, value: 20 },
  ];

  expect(breakAtGaps(points, 5000)).toEqual(points);
});

test("13.4 a hole in the series gets a gap marker right after its start", () => {
  const points = [
    { atMs: 0, value: 10 },
    { atMs: 1000, value: 20 },
    { atMs: 60000, value: 30 },
  ];

  expect(breakAtGaps(points, 5000)).toEqual([
    { atMs: 0, value: 10 },
    { atMs: 1000, value: 20 },
    { atMs: 1001, value: undefined },
    { atMs: 60000, value: 30 },
  ]);
});
