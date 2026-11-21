import { describe, expect, it } from "vitest";
import { Temporal } from "@js-temporal/polyfill";
import { nextAlarmOccurrence } from "../src/core/time/time-service";

describe("nextAlarmOccurrence", () => {
  it("keeps a London recurring alarm at 07:00 local across the summer transition", () => {
    const now = Temporal.Instant.from("2026-03-28T23:00:00Z");
    const next = Temporal.Instant.from(nextAlarmOccurrence({ hour: 7, minute: 0, timeZone: "Europe/London", repeatDays: [0,1,2,3,4,5,6] }, now));
    expect(next.toZonedDateTimeISO("Europe/London").hour).toBe(7);
    expect(next.toZonedDateTimeISO("Europe/London").offset).toBe("+01:00");
  });

  it("calculates a city alarm independently of the device timezone", () => {
    const now = Temporal.Instant.from("2026-11-22T00:00:00Z");
    const next = Temporal.Instant.from(nextAlarmOccurrence({ hour: 7, minute: 0, timeZone: "Europe/London", repeatDays: [0,1,2,3,4,5,6] }, now));
    expect(next.toZonedDateTimeISO("Europe/London").hour).toBe(7);
  });

  it("supports a DST gap using compatible disambiguation", () => {
    const now = Temporal.Instant.from("2026-03-28T23:59:00Z");
    const next = Temporal.Instant.from(nextAlarmOccurrence({ hour: 1, minute: 30, timeZone: "Europe/London", repeatDays: [0,1,2,3,4,5,6] }, now));
    expect(next.toZonedDateTimeISO("Europe/London").hour).toBe(2);
  });
});
