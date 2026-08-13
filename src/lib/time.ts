import { DateTime } from "luxon";

/**
 * All gameweek deadlines are defined as wall-clock times in Europe/London
 * and must be converted to UTC for storage — correctly, across the
 * BST/GMT boundary. Never derive "now" from anything but the server clock.
 */
export const LONDON_ZONE = "Europe/London";

/** Build a UTC Date from a London wall-clock date + time. Handles BST/GMT automatically. */
export function londonWallTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second = 0,
): Date {
  const dt = DateTime.fromObject(
    { year, month, day, hour, minute, second },
    { zone: LONDON_ZONE },
  );
  if (!dt.isValid) {
    throw new Error(`Invalid London wall-clock time: ${dt.invalidReason} ${dt.invalidExplanation}`);
  }
  return dt.toUTC().toJSDate();
}

/**
 * Given a gameweek's kick-off date (any day of the week — fixtures aren't
 * always a Saturday), derive its three deadlines (all as UTC Dates): picks
 * open the day before at 12:00, the pick deadline is that same day at
 * 23:59, and the slip deadline / kick-off is 15:00 on the kick-off date
 * itself — all Europe/London.
 */
export function computeGameweekDeadlines(kickoffYear: number, kickoffMonth: number, kickoffDay: number) {
  const kickoff = DateTime.fromObject(
    { year: kickoffYear, month: kickoffMonth, day: kickoffDay },
    { zone: LONDON_ZONE },
  );
  if (!kickoff.isValid) {
    throw new Error(`Invalid kick-off date: ${kickoff.invalidReason} ${kickoff.invalidExplanation}`);
  }
  const dayBefore = kickoff.minus({ days: 1 });

  return {
    picksOpenAt: dayBefore.set({ hour: 12, minute: 0, second: 0, millisecond: 0 }).toUTC().toJSDate(),
    pickDeadlineAt: dayBefore.set({ hour: 23, minute: 59, second: 0, millisecond: 0 }).toUTC().toJSDate(),
    slipDeadlineAt: kickoff.set({ hour: 15, minute: 0, second: 0, millisecond: 0 }).toUTC().toJSDate(),
  };
}

/**
 * Parse an HTML `datetime-local` input value ("YYYY-MM-DDTHH:mm") as a
 * Europe/London wall-clock time. `datetime-local` carries no timezone of
 * its own — when an admin types a kick-off time they mean London time, not
 * whatever timezone the server or their browser happens to be in.
 */
export function parseLondonDatetimeLocal(value: string): Date {
  const dt = DateTime.fromISO(value, { zone: LONDON_ZONE });
  if (!dt.isValid) {
    throw new Error(`Invalid datetime-local value: ${value}`);
  }
  return dt.toUTC().toJSDate();
}

/** Format a UTC instant for editing in an HTML `datetime-local` input, in Europe/London. */
export function toLondonDatetimeLocal(date: Date): string {
  return DateTime.fromJSDate(date).setZone(LONDON_ZONE).toFormat("yyyy-MM-dd'T'HH:mm");
}

/** Format a UTC instant for display in Europe/London. */
export function formatLondon(date: Date, fmt = "EEE d MMM, HH:mm"): string {
  return DateTime.fromJSDate(date).setZone(LONDON_ZONE).toFormat(fmt);
}

/**
 * Is `now` within [opensAt, closesAt)? Picks/slips are hard-blocked outside
 * their window — there's no "late but not yet locked" grace period.
 */
export function isWithinWindow(now: Date, opensAt: Date, closesAt: Date): boolean {
  return now.getTime() >= opensAt.getTime() && now.getTime() < closesAt.getTime();
}

export function isBefore(now: Date, deadline: Date): boolean {
  return now.getTime() < deadline.getTime();
}

/** Is this instant exactly 15:00 in Europe/London? Used to filter imported fixtures down to the pickable 3pm kick-off slot. */
export function isThreePmLondon(date: Date): boolean {
  const dt = DateTime.fromJSDate(date).setZone(LONDON_ZONE);
  return dt.hour === 15 && dt.minute === 0;
}
