'use strict';

// Attendance rules shared by the attendance and face routes.
//
// A "class occurrence" is one routine slot on one calendar date. It is identified by
// `sessionKey = "<YYYY-MM-DD>|<routineId>"` and only ever opens for students of the slot's own
// semester, inside its own time window - so a class that has not started (or has ended) is never open.

const { ObjectId } = require('mongodb');
const { getCollections } = require('../config/db');
const cfg = require('../config/attendance');
const { getZonedParts, parseTimeSlot, buildWindows, evaluateWindow } = require('../utils/classTime');

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

class AttendanceError extends Error {
  constructor(code, message, status = 400, extra = {}) {
    super(message);
    this.name = 'AttendanceError';
    this.code = code;
    this.status = status;
    this.extra = extra;
  }
}

const round = (value, digits = 1) => {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
};

const parseSemesterNum = (value) => {
  const match = String(value ?? '').match(/\d+/);
  const n = match ? parseInt(match[0], 10) : NaN;
  return Number.isFinite(n) && n >= 1 ? n : null;
};

function studentSemester(student) {
  const semester = parseSemesterNum(student?.semester);
  if (!semester) {
    throw new AttendanceError('SEMESTER_NOT_SET', 'Your semester is not set. Please update your profile first.', 409);
  }
  return semester;
}

const sessionKeyFor = (date, routineId) => `${date}|${routineId}`;

async function findRoutine(routineId) {
  if (typeof routineId !== 'string' || !/^[a-f0-9]{24}$/i.test(routineId)) return null;
  return getCollections().routines.findOne({ _id: new ObjectId(routineId) });
}

// A student's record for one occurrence. The second clause also finds records written before
// `sessionKey` existed, so nobody can check in twice across the upgrade.
function recordFilter({ student, userId, sessionKey, sessionDate, routine }) {
  return {
    $or: [
      { sessionKey, userId },
      {
        studentEmail: student.email,
        sessionDate,
        courseCode: routine.courseCode,
        timeSlot: routine.timeSlot,
      },
    ],
  };
}

/** The check-in window for one routine slot at `local` (see utils/classTime). */
function describeWindow({ routine, slot, session, local }) {
  const scheduledToday = routine.day === local.weekday;
  let windows = buildWindows({
    slot,
    session,
    today: local.date,
    windowMinutes: cfg.windowMinutes,
    devMode: cfg.devMode,
    timeZone: cfg.timezone,
  });
  // On another weekday only a dev-opened test window can exist.
  if (!scheduledToday) windows = windows.filter((w) => w.source === 'dev');
  if (windows.length === 0) {
    return { state: 'not_today', source: null, secondsToOpen: 0, secondsLeft: 0 };
  }
  return evaluateWindow(windows, local.minutes);
}

/**
 * Everything the check-in rules need to know about one class for one student.
 * Throws CLASS_NOT_FOUND / NOT_YOUR_CLASS; the caller decides what to do with the window state.
 */
async function resolveClass({ student, userId, routineId, now = new Date() }) {
  const { attendanceSessions, attendanceRecords } = getCollections();

  const routine = await findRoutine(routineId);
  if (!routine) throw new AttendanceError('CLASS_NOT_FOUND', 'That class was not found.', 404);

  const semester = studentSemester(student);
  if (Number(routine.semester) !== semester) {
    throw new AttendanceError('NOT_YOUR_CLASS', 'That class is not scheduled for your semester.', 403);
  }

  const slot = parseTimeSlot(routine.timeSlot);
  if (!slot) throw new AttendanceError('CLASS_NOT_FOUND', 'That class has no valid time slot.', 409);

  const local = getZonedParts(now, cfg.timezone);
  const sessionKey = sessionKeyFor(local.date, routine._id);
  const session = await attendanceSessions.findOne({ sessionKey });
  const window = describeWindow({ routine, slot, session, local });
  const record = await attendanceRecords.findOne(
    recordFilter({ student, userId, sessionKey, sessionDate: local.date, routine })
  );

  return { routine, slot, semester, local, now, sessionKey, session, window, record };
}

/** Enforce "this class is open right now and the student has not checked in yet". */
function assertCanCheckIn(ctx) {
  const { record, window, slot, routine } = ctx;
  if (record) {
    throw new AttendanceError('ALREADY_MARKED', 'Attendance is already recorded for this class.', 409);
  }
  const course = routine.courseCode || 'This class';
  switch (window.state) {
    case 'open':
      return;
    case 'upcoming':
      throw new AttendanceError(
        'WINDOW_NOT_OPEN',
        `${course} has not started yet. Attendance opens at ${slot.startLabel} and stays open for ${cfg.windowMinutes} minutes.`,
        409,
        { secondsToOpen: window.secondsToOpen }
      );
    case 'not_today':
      throw new AttendanceError('CLASS_NOT_TODAY', `${course} is not scheduled today.`, 409);
    default:
      throw new AttendanceError(
        'WINDOW_CLOSED',
        `Attendance for ${course} is closed. It is only open for the first ${cfg.windowMinutes} minutes of the class.`,
        409
      );
  }
}

/** Create (or fetch) the stored session document for a class occurrence. Safe under concurrent calls. */
async function ensureSession({ routine, slot, local, now = new Date() }) {
  const { attendanceSessions } = getCollections();
  const sessionKey = sessionKeyFor(local.date, routine._id);
  try {
    await attendanceSessions.updateOne(
      { sessionKey },
      {
        $setOnInsert: {
          sessionKey,
          routineId: String(routine._id),
          courseCode: routine.courseCode,
          courseTitle: routine.courseTitle,
          semester: Number(routine.semester),
          teacherId: routine.teacherId ?? null,
          teacherName: routine.teacherName ?? null,
          room: routine.room ?? null,
          day: routine.day,
          timeSlot: routine.timeSlot,
          sessionDate: local.date,
          startTime: slot.startLabel,
          endTime: slot.endLabel,
          status: 'scheduled',
          createdAt: now,
        },
        $set: { updatedAt: now },
      },
      { upsert: true }
    );
  } catch (err) {
    if (err?.code !== 11000) throw err; // another request created it first
  }
  return attendanceSessions.findOne({ sessionKey });
}

const normalizeName = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

/** True when the routine slot is taught by this teacher (matched by teacher id, else by name). */
function teacherOwnsRoutine(teacher, routine) {
  const ids = [teacher.teacherId, teacher._id && String(teacher._id), teacher.userId]
    .filter(Boolean)
    .map(String);
  if (routine.teacherId && ids.includes(String(routine.teacherId))) return true;
  return Boolean(routine.teacherName) && normalizeName(routine.teacherName) === normalizeName(teacher.name);
}

/**
 * The student's classes for one weekday with the live check-in state of each.
 * `queryDay` other than today is a read-only preview of that day's timetable.
 */
async function listDaySessions({ student, userId, queryDay, now = new Date() }) {
  const { routines, attendanceSessions, attendanceRecords } = getCollections();
  const semester = studentSemester(student);
  const local = getZonedParts(now, cfg.timezone);
  const day = WEEKDAYS.includes(queryDay) ? queryDay : local.weekday;

  const routineDocs = await routines.find({ day, semester }).toArray();
  const slots = routineDocs
    .map((routine) => ({ routine, slot: parseTimeSlot(routine.timeSlot) }))
    .filter((x) => x.slot)
    .sort((a, b) => a.slot.startMin - b.slot.startMin);

  const isToday = day === local.weekday;
  const keys = slots.map(({ routine }) => sessionKeyFor(local.date, routine._id));
  const sessionDocs = keys.length
    ? await attendanceSessions.find({ sessionKey: { $in: keys } }).toArray()
    : [];
  const recordDocs = keys.length
    ? await attendanceRecords
        .find({
          $or: [
            { userId, sessionKey: { $in: keys } },
            { studentEmail: student.email, sessionDate: local.date },
          ],
        })
        .toArray()
    : [];

  const sessionByKey = new Map(sessionDocs.map((s) => [s.sessionKey, s]));

  const sessions = slots.map(({ routine, slot }) => {
    const sessionKey = sessionKeyFor(local.date, routine._id);
    const session = sessionByKey.get(sessionKey) || null;
    const record =
      recordDocs.find((r) => r.sessionKey === sessionKey && r.userId === userId) ||
      recordDocs.find(
        (r) =>
          !r.sessionKey &&
          r.sessionDate === local.date &&
          r.courseCode === routine.courseCode &&
          r.timeSlot === routine.timeSlot
      ) ||
      null;

    const window = describeWindow({ routine, slot, session, local });
    let state;
    if (record) state = 'marked';
    else if (window.state === 'open') state = 'open';
    else if (window.state === 'upcoming') state = 'upcoming';
    else if (window.state === 'closed') state = 'closed';
    else state = 'scheduled';

    return {
      routineId: String(routine._id),
      sessionId: session ? String(session._id) : null,
      sessionDate: isToday ? local.date : null,
      day: routine.day,
      timeSlot: routine.timeSlot,
      startTime: slot.startLabel,
      endTime: slot.endLabel,
      courseCode: routine.courseCode,
      courseTitle: routine.courseTitle,
      teacherName: routine.teacherName || null,
      room: routine.room || null,
      semester,
      state,
      isOpen: window.state === 'open',
      isMarkable: window.state === 'open' && !record,
      windowSource: window.source,
      secondsToOpen: window.secondsToOpen,
      secondsLeft: window.secondsLeft,
      attendance: record
        ? {
            id: String(record._id),
            status: record.status,
            markedAt: record.markedAt || record.createdAt || null,
            distance: record.distanceMeters ?? record.distanceFromCampusMeters ?? null,
            faceVerified: Boolean(record.faceVerified),
          }
        : null,
    };
  });

  return { local, queryDay: day, isToday, semester, sessions };
}

// ── Stats & history ──────────────────────────────────────────────────────────────────────────────
const isLabCourse = (title) => /sessional|lab/i.test(title || '');
const normCode = (code) => String(code || '').trim().toUpperCase();

/**
 * Per-course attendance for a student.
 *
 * "Conducted" counts class occurrences that really happened: at least one student checked in, or the
 * teacher started the session. A cancelled class or a holiday therefore never counts against anyone,
 * and nothing is invented for classes that left no trace.
 */
async function computeStats({ student, userId }) {
  const { courses, attendanceRecords, attendanceSessions } = getCollections();
  const semester = studentSemester(student);

  const semesterCourses = await courses
    .find({
      $or: [
        { semesterNum: semester },
        { semester },
        { semester: String(semester) },
        { semester: { $regex: `^${semester}(st|nd|rd|th)`, $options: 'i' } },
      ],
    })
    .sort({ code: 1 })
    .toArray();

  const conductedRows = await attendanceRecords
    .aggregate([
      { $match: { semester } },
      { $group: { _id: { c: '$courseCode', d: '$sessionDate', t: '$timeSlot' } } },
    ])
    .toArray();
  const startedRows = await attendanceSessions
    .find({ semester, startedAt: { $type: 'date' } }, { projection: { courseCode: 1, sessionDate: 1, timeSlot: 1 } })
    .toArray();

  const conductedByCourse = new Map();
  const markConducted = (code, date, slot) => {
    const key = normCode(code);
    if (!conductedByCourse.has(key)) conductedByCourse.set(key, new Set());
    conductedByCourse.get(key).add(`${date}|${slot}`);
  };
  conductedRows.forEach((r) => markConducted(r._id.c, r._id.d, r._id.t));
  startedRows.forEach((s) => markConducted(s.courseCode, s.sessionDate, s.timeSlot));

  const myRecords = await attendanceRecords
    .find({ $or: [{ userId }, { studentEmail: student.email }] })
    .toArray();
  const attendedByCourse = new Map();
  for (const r of myRecords) {
    const key = normCode(r.courseCode);
    if (!attendedByCourse.has(key)) attendedByCourse.set(key, new Map());
    attendedByCourse.get(key).set(`${r.sessionDate}|${r.timeSlot}`, r.status);
  }

  const stats = semesterCourses.map((course) => {
    const key = normCode(course.code);
    const mine = attendedByCourse.get(key) || new Map();
    const statuses = [...mine.values()];
    const presentCount = statuses.filter((s) => s === 'present').length;
    const lateCount = statuses.filter((s) => s === 'late').length;
    const attendedSessions = presentCount + lateCount;
    const conductedSessions = Math.max(conductedByCourse.get(key)?.size || 0, attendedSessions);
    const percentage =
      conductedSessions > 0 ? Math.min(100, Math.round((attendedSessions / conductedSessions) * 100)) : 0;
    const lab = isLabCourse(course.title);

    return {
      courseCode: course.code,
      courseName: course.title,
      courseTitle: course.title,
      credits: course.credits ?? (lab ? 1.5 : 3),
      targetSessions: lab ? 10 : 14,
      conductedSessions,
      totalSessions: conductedSessions,
      attendedSessions,
      presentCount,
      lateCount,
      percentage,
      hasData: conductedSessions > 0,
      status: conductedSessions === 0 ? 'No classes yet' : percentage >= 75 ? 'Good Standing' : 'Low Attendance (< 75%)',
    };
  });

  const totalConducted = stats.reduce((sum, s) => sum + s.conductedSessions, 0);
  const totalAttended = stats.reduce((sum, s) => sum + s.attendedSessions, 0);
  const totalTarget = stats.reduce((sum, s) => sum + s.targetSessions, 0);

  return {
    semester,
    stats,
    totalConducted,
    totalAttended,
    totalTarget,
    overallPercentage: totalConducted > 0 ? Math.round((totalAttended / totalConducted) * 100) : 0,
  };
}

async function listHistory({ student, userId, limit = 50 }) {
  const { attendanceRecords } = getCollections();
  const records = await attendanceRecords
    .find({ $or: [{ userId }, { studentEmail: student.email }] })
    .sort({ markedAt: -1, createdAt: -1 })
    .limit(limit)
    .toArray();

  return records.map((r) => ({
    id: String(r._id),
    courseCode: r.courseCode,
    courseTitle: r.courseTitle,
    sessionDate: r.sessionDate,
    timeSlot: r.timeSlot,
    status: r.status,
    markedAt: r.markedAt || r.createdAt || null,
    distance: r.distanceMeters ?? r.distanceFromCampusMeters ?? null,
    faceVerified: Boolean(r.faceVerified),
  }));
}

module.exports = {
  AttendanceError,
  WEEKDAYS,
  round,
  parseSemesterNum,
  studentSemester,
  sessionKeyFor,
  recordFilter,
  findRoutine,
  describeWindow,
  resolveClass,
  assertCanCheckIn,
  ensureSession,
  teacherOwnsRoutine,
  listDaySessions,
  computeStats,
  listHistory,
};
