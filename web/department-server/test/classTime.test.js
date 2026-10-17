'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getZonedParts, parseTimeSlot, buildWindows, evaluateWindow } = require('../utils/classTime');

const TZ = 'Asia/Dhaka'; // UTC+6, no DST
const WINDOW = 10;

// Build an instant from a Dhaka wall-clock time.
const dhaka = (isoLocal) => new Date(`${isoLocal}+06:00`);

const slot = parseTimeSlot('09:00 - 10:00');

function stateAt(isoLocal, session = null, devMode = false) {
  const now = dhaka(isoLocal);
  const parts = getZonedParts(now, TZ);
  const windows = buildWindows({
    slot,
    session,
    today: parts.date,
    windowMinutes: WINDOW,
    devMode,
    timeZone: TZ,
  });
  return evaluateWindow(windows, parts.minutes);
}

test('parseTimeSlot reads the routine slot formats used by the department', () => {
  assert.deepEqual(parseTimeSlot('09:00 - 10:00'), { startMin: 540, endMin: 600, startLabel: '09:00', endLabel: '10:00' });
  assert.equal(parseTimeSlot('9:00 - 10:00').startMin, 540);
  assert.equal(parseTimeSlot('12:00 - 01:00').startMin, 720, 'noon stays noon');
  assert.equal(parseTimeSlot('12:00 - 01:00').endMin, 780, '01:00 after noon is 13:00');
  assert.equal(parseTimeSlot('02:00 - 03:00').startMin, 14 * 60);
  assert.equal(parseTimeSlot('04:00 - 05:00').endMin, 17 * 60);
  assert.equal(parseTimeSlot('9:00 AM - 10:00 AM').startMin, 540);
  assert.equal(parseTimeSlot('1:00 PM - 2:00 PM').startMin, 13 * 60);
});

test('parseTimeSlot rejects garbage and backwards slots', () => {
  for (const bad of [null, undefined, '', 'Saturday', '10:00 - 09:00', '25:00 - 26:00', '09:70 - 10:00', 42]) {
    assert.equal(parseTimeSlot(bad), null, String(bad));
  }
});

test('getZonedParts uses the department time zone, not the server zone', () => {
  // 2026-10-17 03:30 UTC is 09:30 in Dhaka, same calendar day.
  const a = getZonedParts(new Date('2026-10-17T03:30:00Z'), TZ);
  assert.equal(a.date, '2026-10-17');
  assert.equal(a.weekday, 'Saturday');
  assert.equal(a.minutes, 9 * 60 + 30);

  // 2026-10-16 20:00 UTC is already 02:00 on the 17th in Dhaka.
  const b = getZonedParts(new Date('2026-10-16T20:00:00Z'), TZ);
  assert.equal(b.date, '2026-10-17');
  assert.equal(b.minutes, 120);

  // Same instant, a zone far from Dhaka, gives a different wall clock.
  const c = getZonedParts(new Date('2026-10-17T03:30:00Z'), 'America/New_York');
  assert.equal(c.date, '2026-10-16');
  assert.equal(c.weekday, 'Friday');
});

test('class is NOT open before it starts', () => {
  const s = stateAt('2026-10-17T08:59:59');
  assert.equal(s.state, 'upcoming');
  assert.equal(s.secondsToOpen, 1);
});

test('check-in opens exactly when the class starts', () => {
  const s = stateAt('2026-10-17T09:00:00');
  assert.equal(s.state, 'open');
  assert.equal(s.source, 'schedule');
  assert.equal(s.secondsLeft, 600);
});

test('check-in stays open for 10 minutes then closes', () => {
  assert.equal(stateAt('2026-10-17T09:09:59').state, 'open');
  assert.equal(stateAt('2026-10-17T09:09:59').secondsLeft, 1);
  assert.equal(stateAt('2026-10-17T09:10:00').state, 'closed', 'closed at exactly 10:00 elapsed');
  assert.equal(stateAt('2026-10-17T09:10:01').state, 'closed');
  assert.equal(stateAt('2026-10-17T09:45:00').state, 'closed', 'stays closed for the rest of the class');
  assert.equal(stateAt('2026-10-17T10:30:00').state, 'closed');
});

test('a class that has not started never reports an open window (other classes are not open)', () => {
  const later = parseTimeSlot('11:00 - 12:00');
  const now = dhaka('2026-10-17T09:05:00');
  const parts = getZonedParts(now, TZ);
  const windows = buildWindows({ slot: later, session: null, today: parts.date, windowMinutes: WINDOW, devMode: false, timeZone: TZ });
  assert.equal(evaluateWindow(windows, parts.minutes).state, 'upcoming');
});

test('teacher start re-opens a 10 minute window, but only inside the class slot', () => {
  // Before the teacher presses start, the scheduled window has already closed.
  assert.equal(stateAt('2026-10-17T09:24:00', null).state, 'closed');
  const session = { startedAt: dhaka('2026-10-17T09:25:00') };
  assert.equal(stateAt('2026-10-17T09:25:00', session).state, 'open');
  const open = stateAt('2026-10-17T09:30:00', session);
  assert.equal(open.state, 'open');
  assert.equal(open.source, 'teacher');
  assert.equal(open.secondsLeft, 5 * 60);
  assert.equal(stateAt('2026-10-17T09:35:00', session).state, 'closed');
});

test('teacher window is clamped to the end of the class', () => {
  const session = { startedAt: dhaka('2026-10-17T09:55:00') };
  assert.equal(stateAt('2026-10-17T09:59:59', session).state, 'open');
  assert.equal(stateAt('2026-10-17T10:00:00', session).state, 'closed');
});

test('a "start" recorded outside the class slot or on another day opens nothing', () => {
  const early = { startedAt: dhaka('2026-10-17T08:00:00') };
  assert.equal(stateAt('2026-10-17T08:05:00', early).state, 'upcoming');
  const yesterday = { startedAt: dhaka('2026-10-16T09:20:00') };
  assert.equal(stateAt('2026-10-17T09:25:00', yesterday).state, 'closed');
});

test('dev windows are honoured only when dev mode is on', () => {
  const session = { devOpenedAt: dhaka('2026-10-17T14:00:00') };
  const wallClock = '2026-10-17T14:03:00';
  const now = getZonedParts(dhaka(wallClock), TZ);
  const prod = evaluateWindow(
    buildWindows({ slot, session, today: now.date, windowMinutes: WINDOW, devMode: false, timeZone: TZ }),
    now.minutes
  );
  assert.notEqual(prod.state, 'open');
  const dev = evaluateWindow(
    buildWindows({ slot, session, today: now.date, windowMinutes: WINDOW, devMode: true, timeZone: TZ }),
    now.minutes
  );
  assert.equal(dev.state, 'open');
  assert.equal(dev.source, 'dev');
});
