'use strict';

// Time helpers for class-attendance windows.
//
// All "is this class open right now?" decisions are made in the department's time zone
// (CLASS_TIMEZONE, default Asia/Dhaka) instead of the server's local zone, so the rules behave
// the same on a laptop and on a UTC-configured host.

const formatterCache = new Map();

function getFormatter(timeZone) {
  let fmt = formatterCache.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'long',
    });
    formatterCache.set(timeZone, fmt);
  }
  return fmt;
}

/**
 * Wall-clock parts of an instant in `timeZone`.
 * `minutes` is fractional minutes since local midnight (e.g. 09:10:30 -> 550.5).
 */
function getZonedParts(date, timeZone) {
  const parts = {};
  for (const p of getFormatter(timeZone).formatToParts(date)) parts[p.type] = p.value;
  const hour = parseInt(parts.hour, 10) % 24;
  const minutes =
    hour * 60 +
    parseInt(parts.minute, 10) +
    parseInt(parts.second, 10) / 60 +
    date.getUTCMilliseconds() / 60000;
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    weekday: parts.weekday,
    minutes,
  };
}

const SLOT_RE =
  /^\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*[-\u2013\u2014]\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*$/i;

function toMinutes(hourStr, minuteStr, meridiem) {
  let hours = parseInt(hourStr, 10);
  const minutes = parseInt(minuteStr || '0', 10);
  if (minutes > 59 || hours > 23) return null;
  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    hours = hours % 12;
    if (meridiem.toLowerCase() === 'pm') hours += 12;
  } else if (hours >= 1 && hours <= 7) {
    // The routine writes afternoon slots without a meridiem ("01:00 - 02:00" ... "04:00 - 05:00").
    // Classes never start before 8 AM, so 1-7 means PM; "12:00" stays noon.
    hours += 12;
  }
  return hours * 60 + minutes;
}

/**
 * Parse a routine slot such as "09:00 - 10:00", "12:00 - 01:00" or "4:00 - 5:00".
 * Returns null for anything that is not a valid forward-running slot.
 */
function parseTimeSlot(slot) {
  if (typeof slot !== 'string') return null;
  const m = slot.match(SLOT_RE);
  if (!m) return null;
  const startMin = toMinutes(m[1], m[2], m[3]);
  const endMin = toMinutes(m[4], m[5], m[6]);
  if (startMin === null || endMin === null || endMin <= startMin) return null;
  const pad = (h, mm) => `${String(h).padStart(2, '0')}:${String(mm || '00').padStart(2, '0')}`;
  return {
    startMin,
    endMin,
    startLabel: pad(m[1], m[2]),
    endLabel: pad(m[4], m[5]),
  };
}

/**
 * Check-in windows that exist for one class occurrence today, in minutes since local midnight.
 *   schedule - opens at the class start time and stays open for `windowMinutes`
 *   teacher  - the teacher pressed "start" during the class: `windowMinutes` from that moment,
 *              but never past the end of the class
 *   dev      - local testing only (devMode): `windowMinutes` from the moment it was opened
 */
function buildWindows({ slot, session, today, windowMinutes, devMode, timeZone }) {
  const windows = [];

  if (slot && Number.isFinite(slot.startMin) && Number.isFinite(slot.endMin)) {
    windows.push({
      source: 'schedule',
      startMin: slot.startMin,
      endMin: Math.min(slot.startMin + windowMinutes, slot.endMin),
    });
  }

  const isSessionActive = session?.status === 'active';
  const startedAt = isSessionActive && session?.startedAt ? new Date(session.startedAt) : null;
  if (startedAt && !Number.isNaN(startedAt.getTime())) {
    const started = getZonedParts(startedAt, timeZone);
    if (started.date === today) {
      windows.push({
        source: 'teacher',
        startMin: started.minutes,
        endMin: Math.min(started.minutes + windowMinutes, slot ? slot.endMin : started.minutes + windowMinutes),
      });
    }
  }

  const devOpenedAt = devMode && session?.devOpenedAt ? new Date(session.devOpenedAt) : null;
  if (devOpenedAt && !Number.isNaN(devOpenedAt.getTime())) {
    const opened = getZonedParts(devOpenedAt, timeZone);
    if (opened.date === today) {
      windows.push({ source: 'dev', startMin: opened.minutes, endMin: opened.minutes + windowMinutes });
    }
  }

  return windows;
}

/**
 * Decide whether check-in is open at `nowMin` (fractional minutes since local midnight).
 * Returns { state: 'upcoming' | 'open' | 'closed', source, secondsToOpen, secondsLeft }.
 */
function evaluateWindow(windows, nowMin) {
  const open = windows.filter((w) => nowMin >= w.startMin && nowMin < w.endMin);
  if (open.length > 0) {
    const best = open.reduce((a, b) => (b.endMin > a.endMin ? b : a));
    return {
      state: 'open',
      source: best.source,
      secondsToOpen: 0,
      secondsLeft: Math.max(1, Math.ceil((best.endMin - nowMin) * 60)),
    };
  }

  const upcoming = windows.filter((w) => w.startMin > nowMin);
  if (upcoming.length > 0) {
    const next = upcoming.reduce((a, b) => (b.startMin < a.startMin ? b : a));
    return {
      state: 'upcoming',
      source: next.source,
      secondsToOpen: Math.max(1, Math.ceil((next.startMin - nowMin) * 60)),
      secondsLeft: 0,
    };
  }

  return { state: 'closed', source: null, secondsToOpen: 0, secondsLeft: 0 };
}

module.exports = {
  getZonedParts,
  parseTimeSlot,
  buildWindows,
  evaluateWindow,
};
