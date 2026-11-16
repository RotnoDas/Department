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
const ROUTINE_WEEK_DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

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

const escapeRegex = (str) => (str ? String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '');

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
  const or = [];
  if (sessionKey && userId) or.push({ sessionKey, userId });
  if (sessionKey && student?.email) {
    or.push({ sessionKey, studentEmail: student.email });
    or.push({ sessionKey, studentEmail: { $regex: new RegExp(`^${escapeRegex(student.email.trim())}$`, 'i') } });
  }
  if (sessionKey && student?.studentId) {
    or.push({ sessionKey, studentId: String(student.studentId) });
  }
  if (student?.email && sessionDate && routine) {
    or.push({
      studentEmail: { $regex: new RegExp(`^${escapeRegex(student.email.trim())}$`, 'i') },
      sessionDate,
      courseCode: routine.courseCode,
      timeSlot: routine.timeSlot,
    });
  }
  if (student?.studentId && sessionDate && routine) {
    or.push({
      studentId: String(student.studentId),
      sessionDate,
      courseCode: routine.courseCode,
      timeSlot: routine.timeSlot,
    });
  }
  return { $or: or.length ? or : [{ sessionKey, userId }] };
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

  // If not scheduled today, only an actively opened window (dev or teacher) can exist
  if (!scheduledToday) {
    windows = windows.filter((w) => w.source === 'dev' || w.source === 'teacher');
    if (windows.length === 0) {
      return { state: 'not_today', source: null, secondsToOpen: 0, secondsLeft: 0 };
    }
  }

  if (windows.length === 0) {
    if (scheduledToday) {
      // Slot has ended: class time is finished
      if (slot && local.minutes >= slot.endMin) {
        return { state: 'closed', source: null, secondsToOpen: 0, secondsLeft: 0 };
      }
      // If session was completed or expired:
      if (session?.status === 'completed' || session?.status === 'expired' || (session?.startedAt && !session?.status)) {
        return { state: 'closed', source: null, secondsToOpen: 0, secondsLeft: 0 };
      }
      // Before class slot begins (more than 5 mins prior):
      if (slot && local.minutes < slot.startMin - 5) {
        return {
          state: 'upcoming',
          source: null,
          secondsToOpen: Math.max(1, Math.ceil((slot.startMin - local.minutes) * 60)),
          secondsLeft: 0,
        };
      }
      // Scheduled today and currently ongoing: waiting for teacher to start attendance:
      if (slot && local.minutes >= slot.startMin - 5 && local.minutes < slot.endMin) {
        return {
          state: 'waiting_teacher',
          source: null,
          secondsToOpen: 0,
          secondsLeft: 0,
        };
      }
      return { state: 'closed', source: null, secondsToOpen: 0, secondsLeft: 0 };
    }
    return { state: 'not_today', source: null, secondsToOpen: 0, secondsLeft: 0 };
  }

  return evaluateWindow(windows, local.minutes, slot);
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
    case 'waiting_teacher':
      throw new AttendanceError(
        'WAITING_TEACHER',
        `Attendance for ${course} has not been started by the course teacher yet. Please wait for your teacher to start attendance.`,
        409
      );
    case 'not_today':
      throw new AttendanceError('CLASS_NOT_TODAY', `${course} is not scheduled today.`, 409);
    default:
      throw new AttendanceError(
        'WINDOW_CLOSED',
        `Attendance for ${course} is closed. The 10-minute check-in window has passed.`,
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
  if (teacher?.role === 'admin') return true;
  const ids = [teacher.teacherId, teacher._id && String(teacher._id), teacher.userId]
    .filter(Boolean)
    .map(String);
  if (routine.teacherId && ids.includes(String(routine.teacherId))) return true;
  if (routine.teacherEmail && teacher.email && routine.teacherEmail.toLowerCase() === teacher.email.toLowerCase()) return true;
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
  const day = ROUTINE_WEEK_DAYS.includes(queryDay) || WEEKDAYS.includes(queryDay) ? queryDay : local.weekday;

  const isToday = day === local.weekday;
  
  // Calculate signed day offset from today's weekday (-3 to +3)
  // Positive = future / next days (e.g. on Friday, Saturday is +1, Sunday is +2)
  // Negative = past days (e.g. on Friday, Thursday is -1, Wednesday is -2)
  const tIdx = WEEKDAYS.indexOf(local.weekday);
  const dIdx = WEEKDAYS.indexOf(day);
  let dayOffset = 0;
  if (tIdx !== -1 && dIdx !== -1) {
    dayOffset = dIdx - tIdx;
    if (dayOffset < -3) dayOffset += 7;
    if (dayOffset > 3) dayOffset -= 7;
  }

  const isPastDay = !isToday && dayOffset < 0;
  const isFutureDay = !isToday && dayOffset > 0;

  // Compute the calendar date for the target weekday
  const targetDateObj = new Date(now);
  targetDateObj.setDate(targetDateObj.getDate() + dayOffset);
  const targetDate = isToday ? local.date : getZonedParts(targetDateObj, cfg.timezone).date;

  // Auto-complete any active sessions whose 10-minute window has passed
  try {
    await attendanceSessions.updateMany(
      { status: 'active', expiresAt: { $lt: now } },
      { $set: { status: 'completed', updatedAt: now } }
    );
  } catch (_) {}

  // Strictly load only classes scheduled on this routine day for this semester
  const routineDocs = await routines.find({ day, semester }).toArray();

  const slots = routineDocs
    .map((routine) => ({ routine, slot: parseTimeSlot(routine.timeSlot) }))
    .filter((x) => x.slot)
    .sort((a, b) => a.slot.startMin - b.slot.startMin);

  const keys = slots.map(({ routine }) => sessionKeyFor(targetDate, routine._id));
  const todayKeys = isToday ? keys : slots.map(({ routine }) => sessionKeyFor(local.date, routine._id));
  const allKeys = Array.from(new Set([...keys, ...todayKeys]));

  const sessionDocs = allKeys.length
    ? await attendanceSessions
        .find({
          $or: [
            { sessionKey: { $in: allKeys } },
            { sessionDate: targetDate, routineId: { $in: slots.map((s) => String(s.routine._id)) } },
          ],
        })
        .toArray()
    : [];

  const studentOr = [];
  if (userId) studentOr.push({ userId });
  if (student?.email) {
    studentOr.push({ studentEmail: student.email });
    studentOr.push({ studentEmail: { $regex: new RegExp(`^${escapeRegex(student.email.trim())}$`, 'i') } });
  }
  if (student?.studentId) {
    studentOr.push({ studentId: String(student.studentId) });
  }

  const recordDocs = slots.length && studentOr.length
    ? await attendanceRecords
        .find({
          $and: [
            { $or: studentOr },
            {
              $or: [
                { sessionDate: targetDate },
                { sessionDate: local.date },
                { sessionKey: { $in: allKeys } },
              ],
            },
          ],
        })
        .toArray()
    : [];

  const sessionByKey = new Map();
  sessionDocs.forEach((s) => {
    if (s.sessionKey) sessionByKey.set(s.sessionKey, s);
    if (s.routineId) sessionByKey.set(`${targetDate}|${s.routineId}`, s);
  });

  const isStudentMatch = (r) => {
    if (!r) return false;
    if (userId && r.userId && String(r.userId) === String(userId)) return true;
    if (student?.email && r.studentEmail && r.studentEmail.toLowerCase() === student.email.toLowerCase()) return true;
    if (student?.studentId && r.studentId && String(r.studentId) === String(student.studentId)) return true;
    return false;
  };

  let activeOpenFound = false;
  const sessions = slots.map(({ routine, slot }) => {
    const sessionKey = sessionKeyFor(targetDate, routine._id);
    const session = sessionByKey.get(sessionKey) || null;

    // Robust matching for student's record for this slot:
    const record =
      recordDocs.find((r) => {
        if (!isStudentMatch(r)) return false;
        if (r.sessionKey === sessionKey) return true;
        if (r.routineId && String(r.routineId) === String(routine._id)) return true;
        const sameCourse = r.courseCode && r.courseCode.toUpperCase() === routine.courseCode.toUpperCase();
        const sameSlot = !r.timeSlot || r.timeSlot === routine.timeSlot;
        return sameCourse && sameSlot;
      }) || null;

    const window = isToday
      ? describeWindow({ routine, slot, session, local })
      : { state: 'scheduled', source: null, secondsToOpen: 0, secondsLeft: 0 };

    let state;
    let isOpen = isToday && window.state === 'open';
    let isMarkable = isOpen && !record;
    let secondsLeft = window.secondsLeft || 0;

    // 1. If attendance is already recorded for this slot, it stays marked!
    if (record) {
      state = 'marked';
      isOpen = false;
      isMarkable = false;
    }
    // 2. Any other day of the routine (Tuesday, Wednesday, Thursday, Saturday, Sunday, etc.)
    // is a timetable schedule preview: never missed and never waiting for teacher.
    else if (!isToday) {
      state = 'scheduled';
      isOpen = false;
      isMarkable = false;
    }
    // 3. Today: class time slot has finished without attendance -> closed (missed)
    else if (isToday && slot && local.minutes >= slot.endMin) {
      state = 'closed';
      isOpen = false;
      isMarkable = false;
    }
    // 4. Today: check-in window is open
    else if (isOpen) {
      // Enforce single active class: never allow multiple classes to be open simultaneously
      if (activeOpenFound) {
        isOpen = false;
        isMarkable = false;
        secondsLeft = 0;
        state = 'closed';
      } else {
        activeOpenFound = true;
        state = 'open';
      }
    }
    // 5. Today: before class slot begins
    else if (window.state === 'upcoming' || (isToday && slot && local.minutes < slot.startMin - 5)) {
      state = 'upcoming';
    }
    // 6. Today: ongoing right now, waiting for teacher to start attendance
    else if (
      isToday &&
      slot &&
      local.minutes >= slot.startMin - 5 &&
      local.minutes < slot.endMin &&
      (window.state === 'waiting_teacher' || !session || session.status === 'scheduled')
    ) {
      state = 'waiting_teacher';
    } else {
      state = 'closed';
    }

    const isSlotFinishedToday = Boolean(isToday && slot && local.minutes >= slot.endMin);
    const isPast = !record && isToday && (state === 'closed' || isSlotFinishedToday);

    return {
      routineId: String(routine._id),
      sessionId: session ? String(session._id) : null,
      sessionDate: targetDate,
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
      isOpen,
      isActive: isOpen,
      isMarkable,
      isPast,
      isFinished: isSlotFinishedToday,
      attendanceId: record ? String(record._id) : null,
      windowSource: window.source,
      secondsToOpen: window.secondsToOpen || 0,
      secondsLeft,
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

  return { local, queryDay: day, isToday, isPastDay, isFutureDay, semester, sessions };
}

// ── Stats & history ──────────────────────────────────────────────────────────────────────────────
const isLabCourse = (title) => /sessional|lab/i.test(title || '');
const normCode = (code) => String(code || '').replace(/[\s\-_]+/g, '').toUpperCase();

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

  const studentOr = [];
  if (userId) studentOr.push({ userId });
  if (student?.email) {
    studentOr.push({ studentEmail: student.email });
    studentOr.push({ studentEmail: { $regex: new RegExp(`^${escapeRegex(student.email.trim())}$`, 'i') } });
  }
  if (student?.studentId) {
    studentOr.push({ studentId: String(student.studentId) });
  }

  const myRecords = await attendanceRecords
    .find({ $or: studentOr.length ? studentOr : [{ userId }] })
    .toArray();
  const attendedByCourse = new Map();
  for (const r of myRecords) {
    const key = normCode(r.courseCode);
    if (!attendedByCourse.has(key)) attendedByCourse.set(key, new Map());
    attendedByCourse.get(key).set(`${r.sessionDate}|${r.timeSlot}`, r.status);
  }

  // Merge courses by normCode to ensure we always retain the latest totalClasses
  const courseMap = new Map();
  for (const c of semesterCourses) {
    const key = normCode(c.code);
    if (!courseMap.has(key)) {
      courseMap.set(key, c);
    } else {
      const existing = courseMap.get(key);
      if ((existing.totalClasses === undefined || existing.totalClasses === null) && c.totalClasses !== undefined && c.totalClasses !== null) {
        existing.totalClasses = c.totalClasses;
      }
    }
  }

  // Also include any course where student has records but wasn't in semesterCourses
  for (const codeKey of attendedByCourse.keys()) {
    if (!courseMap.has(codeKey)) {
      const extra = await courses.findOne({
        $or: [
          { code: codeKey },
          { code: { $regex: `^${codeKey}$`, $options: 'i' } }
        ]
      });
      if (extra) courseMap.set(codeKey, extra);
    }
  }

  // If any course in courseMap still has null totalClasses, check if there's any document in DB with totalClasses
  for (const [key, c] of courseMap.entries()) {
    if (c.totalClasses === undefined || c.totalClasses === null) {
      const docWithTotal = await courses.findOne({
        $or: [
          { code: c.code },
          { code: key },
          { code: { $regex: key, $options: 'i' } }
        ],
        totalClasses: { $ne: null, $gt: 0 }
      });
      if (docWithTotal && docWithTotal.totalClasses) {
        c.totalClasses = docWithTotal.totalClasses;
      }
    }
  }

  const finalCourseList = Array.from(courseMap.values());

  const stats = finalCourseList.map((course) => {
    const key = normCode(course.code);
    const mine = attendedByCourse.get(key) || new Map();
    const statuses = [...mine.values()];
    const presentCount = statuses.filter((s) => s === 'present').length;
    const lateCount = statuses.filter((s) => s === 'late').length;
    const attendedSessions = presentCount + lateCount;
    const conductedSessions = Math.max(conductedByCourse.get(key)?.size || 0, attendedSessions);
    const targetSessions = course.totalClasses !== undefined && course.totalClasses !== null && Number(course.totalClasses) > 0
      ? Number(course.totalClasses)
      : null;
    const baseTotal = targetSessions && targetSessions > 0 ? targetSessions : conductedSessions;
    const percentage =
      baseTotal > 0 ? Math.min(100, Math.round((attendedSessions / baseTotal) * 100)) : 0;
    const conductedPercentage =
      conductedSessions > 0 ? Math.min(100, Math.round((attendedSessions / conductedSessions) * 100)) : 0;
    const lab = isLabCourse(course.title);

    return {
      courseCode: course.code,
      courseName: course.title,
      courseTitle: course.title,
      credits: course.credits ?? (lab ? 1.5 : 3),
      targetSessions,
      conductedSessions,
      totalSessions: targetSessions || conductedSessions,
      totalPlannedClasses: targetSessions,
      attendedSessions,
      presentCount,
      lateCount,
      percentage,
      conductedPercentage,
      hasData: conductedSessions > 0 || (targetSessions !== null && targetSessions > 0),
      status: (conductedSessions === 0 && !targetSessions) ? 'No classes yet' : percentage >= 75 ? 'Good Standing' : 'Low Attendance (< 75%)',
    };
  });

  const totalConducted = stats.reduce((sum, s) => sum + s.conductedSessions, 0);
  const totalAttended = stats.reduce((sum, s) => sum + s.attendedSessions, 0);
  const totalTarget = stats.reduce((sum, s) => sum + (s.targetSessions || s.conductedSessions), 0);

  return {
    semester,
    stats,
    totalConducted,
    totalAttended,
    totalTarget: totalTarget > 0 ? totalTarget : null,
    overallPercentage: totalTarget > 0
      ? Math.round((totalAttended / totalTarget) * 100)
      : (totalConducted > 0 ? Math.round((totalAttended / totalConducted) * 100) : 0),
    conductedOverallPercentage: totalConducted > 0 ? Math.round((totalAttended / totalConducted) * 100) : 0,
  };
}

async function listHistory({ student, userId, limit = 50 }) {
  const { attendanceRecords } = getCollections();
  const studentOr = [];
  if (userId) studentOr.push({ userId });
  if (student?.email) {
    studentOr.push({ studentEmail: student.email });
    studentOr.push({ studentEmail: { $regex: new RegExp(`^${escapeRegex(student.email.trim())}$`, 'i') } });
  }
  if (student?.studentId) {
    studentOr.push({ studentId: String(student.studentId) });
  }

  const records = await attendanceRecords
    .find({ $or: studentOr.length ? studentOr : [{ userId }] })
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
