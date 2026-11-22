import { Temporal } from "@js-temporal/polyfill";
import type { Weekday } from "../domain/types";

export type DstDisambiguation = "earlier" | "later" | "compatible" | "reject";
export type AlarmTimeInput = { hour: number; minute: number; timeZone: string; repeatDays: readonly Weekday[] };

const jsDay = (dayOfWeek: number): Weekday => (dayOfWeek % 7) as Weekday;

function zonedCandidate(date: Temporal.PlainDate, hour: number, minute: number, timeZone: string, disambiguation: DstDisambiguation) {
  return Temporal.ZonedDateTime.from({
    timeZone,
    year: date.year,
    month: date.month,
    day: date.day,
    hour,
    minute,
    second: 0,
    millisecond: 0
  }, { disambiguation });
}

export function nextAlarmOccurrence(input: AlarmTimeInput, now: Temporal.Instant = Temporal.Now.instant(), disambiguation: DstDisambiguation = "compatible"): string {
  if (!Number.isInteger(input.hour) || input.hour < 0 || input.hour > 23) throw new RangeError("Hour must be between 0 and 23.");
  if (!Number.isInteger(input.minute) || input.minute < 0 || input.minute > 59) throw new RangeError("Minute must be between 0 and 59.");
  // Validate the IANA zone before searching.
  const localNow = now.toZonedDateTimeISO(input.timeZone);
  const days = input.repeatDays.length ? new Set(input.repeatDays) : null;

  for (let offset = 0; offset <= 8; offset += 1) {
    const date = localNow.toPlainDate().add({ days: offset });
    const weekday = jsDay(date.dayOfWeek);
    if (days && !days.has(weekday)) continue;
    const candidate = zonedCandidate(date, input.hour, input.minute, input.timeZone, disambiguation);
    if (candidate.epochNanoseconds > now.epochNanoseconds) return candidate.toInstant().toString();
    if (!days) continue; // A non-repeating alarm is only eligible on its creation-day date.
  }
  if (!days) {
    const tomorrow = localNow.toPlainDate().add({ days: 1 });
    return zonedCandidate(tomorrow, input.hour, input.minute, input.timeZone, disambiguation).toInstant().toString();
  }
  throw new Error("Could not calculate the next alarm occurrence.");
}

export const TimeService = {
  now(timeZone = Temporal.Now.timeZoneId()): string {
    return Temporal.Now.zonedDateTimeISO(timeZone).toString();
  },
  formatInstant(instant: string, timeZone: string, timeFormat: "12h" | "24h" = "12h"): string {
    return new Intl.DateTimeFormat(undefined, {
      timeZone, weekday: "short", hour: "numeric", minute: "2-digit", hour12: timeFormat === "12h", month: "short", day: "numeric"
    }).format(new Date(instant));
  },
  previewAlarm(input: AlarmTimeInput, now: Temporal.Instant = Temporal.Now.instant(), timeFormat: "12h" | "24h" = "12h") {
    try {
      const nextOccurrence = nextAlarmOccurrence(input, now);
      return {
        ok: true as const,
        value: {
          targetTime: TimeService.formatInstant(nextOccurrence, input.timeZone, timeFormat),
          deviceTime: TimeService.formatInstant(nextOccurrence, Temporal.Now.timeZoneId(), timeFormat),
          nextOccurrence
        }
      };
    } catch (error) {
      return { ok: false as const, error: { code: "INVALID_ALARM_TIME", message: error instanceof Error ? error.message : "Unable to calculate this alarm." } };
    }
  }
};
