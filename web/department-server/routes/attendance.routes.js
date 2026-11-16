'use strict';

// /api/attendance
//
// Rules enforced here (never by the client):
//   1. A class is open for check-in only while its own window is open: from its start time for 10
//      minutes. Every other class - not started yet, or already past its window - is closed.
//   2. The student must be within 10 m of the classroom (GPS fix must also be accurate enough).
//   3. The student's live face must match the face they enrolled, with a liveness challenge.
//
// Who the student is comes from the verified login token, never from the request.

const express = require('express');
const { getCollections } = require('../config/db');
const cfg = require('../config/attendance');
const { verifyToken } = require('../middleware/auth');
const { requireStudent, requireTeacher, noStore } = require('../middleware/roles');
const { sendError } = require('../utils/httpErrors');
const { getZonedParts, parseTimeSlot } = require('../utils/classTime');
const { evaluateGeofence } = require('../utils/geo');
const face = require('../services/face.service');
const {
  AttendanceError,
  round,
  findRoutine,
  describeWindow,
  resolveClass,
  assertCanCheckIn,
  ensureSession,
  teacherOwnsRoutine,
  studentSemester,
  listDaySessions,
  computeStats,
  listHistory,
} = require('../services/attendance.service');

const router = express.Router();
router.use(noStore);

// ── GET /api/attendance/student/active-sessions ──────────────────────────────────────────────────
// Today's classes for the signed-in student with the live check-in state of each one.
// ?targetDay=<Weekday> previews another day's timetable (never markable).
router.get('/student/active-sessions', verifyToken, requireStudent(), async (req, res) => {
  try {
    const now = new Date();
    const { local, queryDay, isToday, isPastDay, isFutureDay, semester, sessions } = await listDaySessions({
      student: req.student,
      userId: req.userId,
      queryDay: req.query.targetDay,
      now,
    });
    const profile = await face.getProfile(req.userId);

    res.json({
      success: true,
      serverTime: now.toISOString(),
      timezone: cfg.timezone,
      currentDay: local.weekday,
      currentDate: local.date,
      queryDay,
      isToday,
      isPastDay,
      isFutureDay,
      semester,
      student: {
        name: req.student.name,
        studentId: req.student.studentId,
        email: req.student.email,
        status: req.student.status || 'approved',
      },
      rules: {
        windowMinutes: cfg.windowMinutes,
        radiusMeters: cfg.radiusMeters,
        maxGpsAccuracyMeters: cfg.maxGpsAccuracyMeters,
      },
      locations: cfg.locations.map(({ id, name, lat, lon }) => ({ id, name, lat, lon })),
      devMode: cfg.devMode,
      face: { enrolled: Boolean(profile), enrolledAt: profile?.enrolledAt || null },
      sessions,
    });
  } catch (err) {
    sendError(res, err, 'Failed to load attendance sessions.');
  }
});

// ── POST /api/attendance/student/mark ────────────────────────────────────────────────────────────
router.post('/student/mark', verifyToken, requireStudent({ approved: true }), async (req, res) => {
  try {
    const { routineId, challengeId, frames, latitude, longitude, accuracy } = req.body || {};
    const now = new Date();

    // 1. Face must be enrolled before anything else is worth checking.
    const profile = await face.getProfile(req.userId);
    if (!profile) {
      throw new AttendanceError('FACE_NOT_ENROLLED', 'Enroll your face first, then give attendance.', 409);
    }

    // 2. Which class is this, and is it open? Any class other than a currently open one is refused.
    const ctx = await resolveClass({ student: req.student, userId: req.userId, routineId, now });
    if (ctx.record) assertCanCheckIn(ctx); // already marked

    if (ctx.window.state !== 'open') {
      // A face scan that began while the window was open may finish a moment after it closes (it
      // must still be inside the challenge's short lifetime). Anything else is refused.
      const inFlight = await face.hasLiveChallenge({
        userId: req.userId,
        scopeKey: ctx.sessionKey,
        challengeId,
      });
      if (!inFlight) assertCanCheckIn(ctx);
    }

    // 3. Location: within the radius of the classroom.
    const geo = evaluateGeofence({
      latitude,
      longitude,
      accuracy,
      locations: cfg.locations,
      radiusMeters: cfg.radiusMeters,
      maxAccuracyMeters: cfg.maxGpsAccuracyMeters,
      relaxed: cfg.devMode,
    });
    if (!geo.ok) {
      const status = geo.code === 'LOCATION_OUT_OF_RANGE' ? 403 : 422;
      throw new AttendanceError(geo.code, geo.message, status, {
        ...(Number.isFinite(geo.distance) ? { distance: round(geo.distance) } : {}),
        allowedRadius: cfg.radiusMeters,
        ...(geo.location ? { closestLocation: geo.location.name } : {}),
      });
    }

    // 4. Face: single-use challenge + liveness + identity match against the enrolled template.
    const result = await face.runFaceCheck({
      userId: req.userId,
      purpose: 'verify',
      scopeKey: ctx.sessionKey,
      challengeId,
      frames,
      reference: profile.embedding,
    });

    // 5. Record it. The unique (sessionKey, userId) index makes a double submit impossible.
    const session = await ensureSession({ routine: ctx.routine, slot: ctx.slot, local: ctx.local, now });
    const student = req.student;
    const record = {
      userId: req.userId,
      sessionKey: ctx.sessionKey,
      sessionId: String(session._id),
      routineId: String(ctx.routine._id),
      sessionDate: ctx.local.date,
      timeSlot: ctx.routine.timeSlot,
      courseCode: ctx.routine.courseCode,
      courseTitle: ctx.routine.courseTitle,
      semester: ctx.semester,
      studentId: student.studentId,
      studentEmail: student.email,
      studentName: student.name,
      status: 'present',
      latitude: geo.latitude,
      longitude: geo.longitude,
      accuracy: geo.accuracy,
      distanceMeters: round(geo.distance),
      distanceFromCampusMeters: round(geo.distance),
      closestLocationName: geo.location.name,
      faceVerified: true,
      faceSimilarity: round(Number(result.similarity), 3),
      windowSource: ctx.window.source,
      devMode: cfg.devMode,
      markedAt: now,
      createdAt: now,
    };

    let insertedId;
    try {
      ({ insertedId } = await getCollections().attendanceRecords.insertOne(record));
    } catch (err) {
      if (err?.code === 11000) {
        throw new AttendanceError('ALREADY_MARKED', 'Attendance is already recorded for this class.', 409);
      }
      throw err;
    }

    res.json({
      success: true,
      message: `Attendance recorded for ${record.courseCode}.${cfg.devMode ? ' (Dev mode: location check relaxed.)' : ''}`,
      status: 'present',
      recordId: String(insertedId),
      courseCode: record.courseCode,
      markedAt: record.markedAt,
      distance: record.distanceMeters,
      allowedRadius: cfg.radiusMeters,
      faceSimilarity: record.faceSimilarity,
    });
  } catch (err) {
    sendError(res, err, 'Failed to record attendance.');
  }
});

// ── GET /api/attendance/student/stats ────────────────────────────────────────────────────────────
router.get('/student/stats', verifyToken, requireStudent(), async (req, res) => {
  try {
    const data = await computeStats({ student: req.student, userId: req.userId });
    res.json({
      success: true,
      studentName: req.student.name,
      studentId: req.student.studentId,
      ...data,
    });
  } catch (err) {
    sendError(res, err, 'Failed to compute attendance statistics.');
  }
});

// ── GET /api/attendance/student/history ──────────────────────────────────────────────────────────
router.get('/student/history', verifyToken, requireStudent(), async (req, res) => {
  try {
    const history = await listHistory({ student: req.student, userId: req.userId });
    res.json({ success: true, count: history.length, history });
  } catch (err) {
    sendError(res, err, 'Failed to load attendance history.');
  }
});

// ── POST /api/attendance/session/start (teacher) ─────────────────────────────────────────────────
// When a teacher presses the button, an active attendance session starts immediately and runs for
// 10 minutes from this moment, allowing enrolled students to give attendance.
router.post('/session/start', verifyToken, requireTeacher, async (req, res) => {
  try {
    const now = new Date();
    const local = getZonedParts(now, cfg.timezone);
    const { routines, courses, attendanceSessions } = getCollections();

    let routine = null;
    const routineId = req.body?.routineId || req.body?.id;
    if (routineId) {
      routine = await findRoutine(routineId);
    }

    const courseCode = req.body?.courseCode || req.body?.code;
    if (!routine && courseCode) {
      const normCode = String(courseCode).trim().toUpperCase();
      const codeRegex = new RegExp(`^${normCode}$`, 'i');
      const candidates = await routines.find({ courseCode: codeRegex }).toArray();
      // Match teacher and today's weekday if possible
      routine =
        candidates.find((r) => teacherOwnsRoutine(req.teacher, r) && r.day === local.weekday) ||
        candidates.find((r) => teacherOwnsRoutine(req.teacher, r)) ||
        candidates.find((r) => r.day === local.weekday) ||
        candidates[0] ||
        null;

      if (!routine) {
        // If course exists in courses collection, auto-create a routine slot so teacher can conduct attendance
        const courseDoc = await courses.findOne({
          $or: [{ code: codeRegex }, { code: normCode }],
        });
        if (courseDoc) {
          const insertRes = await routines.insertOne({
            courseCode: courseDoc.code,
            courseTitle: courseDoc.title,
            semester: Number(courseDoc.semesterNum || courseDoc.semester || req.body?.semester || 1),
            teacherId: req.teacher.teacherId || null,
            teacherName: req.teacher.name || null,
            teacherEmail: req.teacher.email || null,
            room: req.body?.room || 'Room 401',
            day: local.weekday,
            timeSlot: req.body?.timeSlot || '09:00 - 10:00',
            createdAt: now,
          });
          routine = await routines.findOne({ _id: insertRes.insertedId });
        }
      }
    }

    if (!routine) throw new AttendanceError('CLASS_NOT_FOUND', 'That class was not found in the academic routine.', 404);
    if (!teacherOwnsRoutine(req.teacher, routine)) {
      throw new AttendanceError('NOT_YOUR_CLASS', 'You can only start attendance for your own classes.', 403);
    }

    // Criterion 1: Routine Scheduled Day
    if (routine.day !== local.weekday && !cfg.devMode) {
      throw new AttendanceError(
        'CLASS_NOT_TODAY',
        `${routine.courseCode} is scheduled on ${routine.day}, not today (${local.weekday}). Attendance can only be taken on the routine scheduled day.`,
        400
      );
    }

    // Criterion 2: Routine Scheduled Class Hours
    const slot = parseTimeSlot(routine.timeSlot);
    if (!slot) {
      throw new AttendanceError('CLASS_NOT_FOUND', 'That class has no valid time slot.', 400);
    }

    // Teacher can start attendance from 5 minutes before scheduled start time until the class ends
    if (local.minutes < slot.startMin - 5 && !cfg.devMode) {
      throw new AttendanceError(
        'CLASS_NOT_STARTED',
        `${routine.courseCode} class starts at ${slot.startLabel}. Attendance cannot be started before class time.`,
        400
      );
    }

    if (local.minutes >= slot.endMin && !cfg.devMode) {
      throw new AttendanceError(
        'CLASS_ALREADY_ENDED',
        `${routine.courseCode} class ended at ${slot.endLabel}. Attendance cannot be taken after scheduled class hours.`,
        400
      );
    }

    // Criterion 3: Cohort Single Active Class
    // Auto-complete any other active session for this semester today so multiple classes are NEVER open simultaneously
    await attendanceSessions.updateMany(
      {
        sessionDate: local.date,
        semester: Number(routine.semester),
        status: 'active',
        sessionKey: { $ne: `${local.date}|${routine._id}` },
      },
      {
        $set: {
          status: 'completed',
          closedReason: 'superseded',
          updatedAt: now,
        },
      }
    );

    let session = await ensureSession({ routine, slot, local, now });
    let window = describeWindow({ routine, slot, session, local });

    // If window is already open and teacher did not explicitly request force restart
    if (window.state === 'open' && !req.body?.force) {
      return res.json({
        success: true,
        alreadyOpen: true,
        message: `Check-in for ${routine.courseCode} is already open (${Math.ceil(window.secondsLeft / 60)} min left).`,
        secondsLeft: window.secondsLeft,
        session: {
          id: String(session._id),
          routineId: String(routine._id),
          courseCode: session.courseCode,
          timeSlot: session.timeSlot,
          sessionDate: session.sessionDate,
          startedAt: session.startedAt,
        },
      });
    }

    // Dynamic 10-minute window capped by class end time
    const remainingMinutesInClass = Math.max(1, Math.ceil(slot.endMin - local.minutes));
    const effectiveWindowMinutes = Math.min(cfg.windowMinutes, remainingMinutesInClass);
    const expiresAt = new Date(now.getTime() + effectiveWindowMinutes * 60 * 1000);

    session = await attendanceSessions.findOneAndUpdate(
      { sessionKey: session.sessionKey },
      {
        $set: {
          status: 'active',
          startedAt: now,
          expiresAt,
          startedBy: req.userId,
          updatedAt: now,
        },
      },
      { returnDocument: 'after' }
    );
    window = describeWindow({ routine, slot, session, local });

    res.json({
      success: true,
      alreadyOpen: false,
      message: `Check-in for ${routine.courseCode} is open for ${Math.ceil(window.secondsLeft / 60)} minute(s).`,
      secondsLeft: window.secondsLeft || effectiveWindowMinutes * 60,
      session: {
        id: String(session._id),
        routineId: String(routine._id),
        courseCode: session.courseCode,
        timeSlot: session.timeSlot,
        sessionDate: session.sessionDate,
        startedAt: session.startedAt,
        expiresAt: session.expiresAt,
      },
    });
  } catch (err) {
    sendError(res, err, 'Failed to start the attendance session.');
  }
});

// ── GET /api/attendance/teacher/active-sessions ─────────────────────────────────────────────────
// Returns list of currently active sessions for today for this teacher
router.get('/teacher/active-sessions', verifyToken, requireTeacher, async (req, res) => {
  try {
    const now = new Date();
    const local = getZonedParts(now, cfg.timezone);
    const { attendanceSessions } = getCollections();

    const query = { sessionDate: local.date };
    if (req.teacher.role !== 'admin') {
      const ids = [req.teacher.teacherId, req.teacher._id && String(req.teacher._id), req.teacher.userId].filter(Boolean);
      query.$or = [
        { teacherId: { $in: ids } },
        { teacherName: req.teacher.name },
        { startedBy: req.userId },
      ];
    }

    const sessions = await attendanceSessions.find(query).toArray();
    const result = [];

    for (const s of sessions) {
      let routine = null;
      if (s.routineId) {
        routine = await findRoutine(s.routineId);
      }
      if (!routine) {
        routine = {
          _id: s.routineId,
          courseCode: s.courseCode,
          courseTitle: s.courseTitle,
          semester: s.semester,
          day: s.day,
          timeSlot: s.timeSlot,
        };
      }
      const slot = parseTimeSlot(s.timeSlot || routine?.timeSlot);
      const window = describeWindow({ routine, slot, session: s, local });

      result.push({
        sessionId: String(s._id),
        routineId: s.routineId ? String(s.routineId) : null,
        courseCode: s.courseCode,
        courseTitle: s.courseTitle,
        semester: s.semester,
        timeSlot: s.timeSlot,
        room: s.room,
        startedAt: s.startedAt,
        status: s.status,
        state: window.state,
        isOpen: window.state === 'open',
        secondsLeft: window.secondsLeft || 0,
      });
    }

    res.json({
      success: true,
      serverTime: now.toISOString(),
      sessions: result,
    });
  } catch (err) {
    sendError(res, err, 'Failed to fetch active teacher sessions.');
  }
});

// ── POST /api/attendance/dev/open-window (development only) ──────────────────────────────────────
// Lets a developer open a 10-minute check-in window for one of their own classes at any time so the
// flow can be tested outside class hours. Does not exist unless ATTENDANCE_DEV_MODE=true.
router.post(
  '/dev/open-window',
  (req, res, next) => (cfg.devMode ? next() : res.status(404).json({ error: 'Not found' })),
  verifyToken,
  requireStudent({ approved: true }),
  async (req, res) => {
    try {
      const now = new Date();
      const local = getZonedParts(now, cfg.timezone);
      const routine = await findRoutine(req.body?.routineId);
      if (!routine) throw new AttendanceError('CLASS_NOT_FOUND', 'That class was not found.', 404);
      if (Number(routine.semester) !== studentSemester(req.student)) {
        throw new AttendanceError('NOT_YOUR_CLASS', 'That class is not scheduled for your semester.', 403);
      }
      const slot = parseTimeSlot(routine.timeSlot);
      if (!slot) throw new AttendanceError('CLASS_NOT_FOUND', 'That class has no valid time slot.', 409);

      const session = await ensureSession({ routine, slot, local, now });
      await getCollections().attendanceSessions.updateOne(
        { sessionKey: session.sessionKey },
        { $set: { devOpenedAt: now, updatedAt: now } }
      );
      res.json({
        success: true,
        message: `[Dev] ${routine.courseCode} is open for ${cfg.windowMinutes} minutes.`,
        secondsLeft: cfg.windowMinutes * 60,
      });
    } catch (err) {
      sendError(res, err, 'Failed to open the test window.');
    }
  }
);

// ── GET /api/attendance/teacher/roster-report ──────────────────────────────────────────
// Detailed course-wise student attendance roster with attendance percentage & session logs
router.get('/teacher/roster-report', async (req, res) => {
  try {
    const { students, attendanceSessions, attendanceRecords, courses } = getCollections();
    const { courseCode, semester } = req.query;

    const rawCourse = String(courseCode || '').trim();
    const cleanCourse = rawCourse.replace(/[\s\-_]+/g, '');
    const letters = cleanCourse.replace(/[^A-Za-z]/g, '');
    const digits = cleanCourse.replace(/\D/g, '');
    const courseRegex = (letters && digits)
      ? new RegExp(`^${letters}\\s*[-_]?\\s*${digits}$`, 'i')
      : new RegExp(`^${rawCourse.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');

    const sessionQuery = {
      status: { $ne: 'scheduled' },
    };
    if (courseCode && courseCode !== 'all') {
      sessionQuery.courseCode = courseRegex;
    }

    // Find all sessions held or announced for this course
    const dbSessions = await attendanceSessions
      .find(sessionQuery)
      .sort({ sessionDate: -1, timeSlot: 1 })
      .toArray();

    // Query records for this course
    const recordQuery = (courseCode && courseCode !== 'all') ? { courseCode: courseRegex } : {};
    const allRecords = await attendanceRecords
      .find(recordQuery)
      .sort({ sessionDate: -1, markedAt: -1, createdAt: -1 })
      .toArray();

    // Student filter (approved students in this semester if provided)
    const studentQuery = { status: { $ne: 'rejected' } };
    if (semester && semester !== 'all') {
      const semNum = String(semester).replace(/[^0-9]/g, '');
      studentQuery.$or = [
        { semester: semester },
        { semester: semNum },
        { semester: `${semNum}th Semester` },
      ];
    }

    const studentList = await students.find(studentQuery).sort({ studentId: 1 }).toArray();

    // Combine and deduplicate sessions from attendanceSessions and attendanceRecords
    // Canonical occurrence key is date + normalized courseCode + normalized timeSlot
    const cleanNormCode = (code) => String(code || '').replace(/[\s\-_]+/g, '').toUpperCase();
    const occurrenceMap = new Map();

    const registerSession = (s, fallbackMethod) => {
      const cCode = s.courseCode || rawCourse;
      const cNorm = cleanNormCode(cCode);
      const slot = (s.timeSlot || 'Scheduled Slot').trim();
      const date = s.sessionDate || (s.markedAt ? new Date(s.markedAt).toISOString().split('T')[0] : 'Unknown Date');
      const occKey = `${date}|${cNorm}|${slot}`;

      const sessionKey = s.sessionKey || occKey;
      const existing = occurrenceMap.get(occKey);

      if (!existing) {
        occurrenceMap.set(occKey, {
          sessionKey,
          matchingKeys: [sessionKey],
          courseCode: cCode,
          sessionDate: date,
          date,
          timeSlot: slot,
          topic: s.topic || '',
          room: s.room || '',
          method: s.method || fallbackMethod || (s.faceVerified ? 'face_verified' : 'announced_session'),
          status: s.status || 'completed',
          teacherName: s.teacherName || '',
          notes: s.notes || '',
          announcedAt: s.announcedAt || s.createdAt || s.markedAt || null,
        });
      } else {
        if (!existing.matchingKeys.includes(sessionKey)) {
          existing.matchingKeys.push(sessionKey);
        }
        // Prefer routine-based or existing primary key
        if (s.sessionKey && s.sessionKey.includes('|') && s.sessionKey.split('|')[1]?.length === 24) {
          existing.sessionKey = s.sessionKey;
        }
        if (!existing.topic && s.topic) existing.topic = s.topic;
        if (!existing.room && s.room) existing.room = s.room;
        if (!existing.teacherName && s.teacherName) existing.teacherName = s.teacherName;
        if (s.method && s.method !== 'announced_session') existing.method = s.method;
        if (s.announcedAt && (!existing.announcedAt || s.announcedAt < existing.announcedAt)) {
          existing.announcedAt = s.announcedAt;
        }
      }
    };

    dbSessions.forEach((s) => registerSession(s, 'announced_session'));
    allRecords.forEach((r) => registerSession(r, r.faceVerified ? 'face_verified' : 'manual'));

    const sessions = Array.from(occurrenceMap.values()).sort((a, b) => {
      const dateA = a.sessionDate || '';
      const dateB = b.sessionDate || '';
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      return (b.timeSlot || '').localeCompare(a.timeSlot || '');
    });

    // Map records for quick lookup:
    // Support lookup by key_email, by date|slot_email, and by date_email
    const recordMap = new Map();
    allRecords.forEach((r) => {
      const email = (r.studentEmail || '').toLowerCase();
      if (!email) return;
      if (r.sessionKey) {
        recordMap.set(`${r.sessionKey}_${email}`, r);
      }
      if (r.sessionDate && r.timeSlot) {
        recordMap.set(`${r.sessionDate}|${r.timeSlot.trim()}_${email}`, r);
      }
      if (r.sessionDate && !recordMap.has(`${r.sessionDate}_${email}`)) {
        recordMap.set(`${r.sessionDate}_${email}`, r);
      }
    });

    const totalSessions = sessions.length;

    let courseDoc = null;
    if (courseCode && courseCode !== 'all') {
      const or = [
        { code: rawCourse },
        { code: rawCourse.toUpperCase() },
        { code: cleanCourse },
        { code: cleanCourse.toUpperCase() },
        { code: { $regex: `^${rawCourse.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } },
        { code: { $regex: `^${cleanCourse.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } },
      ];
      if (letters && digits) {
        or.push({ code: { $regex: `^${letters}\\s*[-_]?\\s*${digits}$`, $options: 'i' } });
      }
      courseDoc = await courses.findOne({ $or: or });
    }
    const totalPlannedClasses = courseDoc?.totalClasses !== undefined && courseDoc?.totalClasses !== null
      ? Number(courseDoc.totalClasses)
      : null;

    const roster = studentList.map((stu) => {
      const email = (stu.email || '').toLowerCase();
      let attendedCount = 0;
      let latestRecord = null;

      const history = sessions.map((s) => {
        let rec = null;
        if (s.matchingKeys && Array.isArray(s.matchingKeys)) {
          for (const k of s.matchingKeys) {
            rec = recordMap.get(`${k}_${email}`);
            if (rec) break;
          }
        }
        if (!rec) {
          rec = recordMap.get(`${s.sessionKey}_${email}`) ||
                recordMap.get(`${s.sessionDate}|${(s.timeSlot || '').trim()}_${email}`) ||
                recordMap.get(`${s.sessionDate}_${email}`);
        }
        const present = Boolean(rec && rec.status !== 'absent');
        if (present) {
          attendedCount++;
          if (!latestRecord && rec?.markedAt) {
            latestRecord = {
              date: s.sessionDate,
              timeSlot: s.timeSlot,
              markedAt: rec.markedAt,
              method: rec.method || (rec.faceVerified ? 'face_verified' : 'manual'),
              faceVerified: Boolean(rec.faceVerified),
              distanceMeters: rec.distanceMeters ?? null,
            };
          }
        }
        return {
          sessionKey: s.sessionKey,
          date: s.sessionDate,
          sessionDate: s.sessionDate,
          timeSlot: s.timeSlot,
          topic: s.topic || '',
          status: present ? 'present' : 'absent',
          method: rec?.method || (rec?.faceVerified ? 'face_verified' : s.method) || 'session',
          markedAt: rec?.markedAt || rec?.createdAt || null,
          distance: rec?.distanceMeters ?? null,
          distanceMeters: rec?.distanceMeters ?? null,
          faceVerified: Boolean(rec?.faceVerified),
          faceSimilarity: rec?.faceSimilarity ?? null,
          closestLocationName: rec?.closestLocationName || null,
          devMode: Boolean(rec?.devMode),
        };
      });

      const baseTotal = (totalPlannedClasses !== null && totalPlannedClasses > 0)
        ? totalPlannedClasses
        : totalSessions;
      const percentage = baseTotal > 0
        ? Math.min(100, Math.round((attendedCount / baseTotal) * 100))
        : (totalSessions === 0 && !totalPlannedClasses ? null : 0);
      const remainingClasses = totalPlannedClasses !== null ? Math.max(0, totalPlannedClasses - totalSessions) : null;
      const minRequired75 = totalPlannedClasses !== null ? Math.ceil(0.75 * totalPlannedClasses) : null;
      const neededFromRemaining = minRequired75 !== null ? Math.max(0, minRequired75 - attendedCount) : null;

      return {
        id: stu._id,
        studentId: stu.studentId || 'N/A',
        name: stu.name,
        email: stu.email,
        semester: stu.semester,
        batch: stu.batch,
        attendedCount,
        totalSessions,
        totalPlannedClasses,
        percentage: percentage ?? 0,
        hasAttendance: totalSessions > 0 || (totalPlannedClasses !== null && totalPlannedClasses > 0),
        isAtRisk: (totalSessions > 0 || (totalPlannedClasses !== null && totalPlannedClasses > 0)) && percentage !== null && percentage < 75,
        remainingClasses,
        neededFromRemaining,
        canReach75: totalPlannedClasses !== null ? (neededFromRemaining !== null && neededFromRemaining <= remainingClasses) : (percentage >= 75),
        latestRecord,
        history,
      };
    });

    // Detailed chronological session records
    const formattedRecords = allRecords.map((r) => ({
      id: String(r._id),
      sessionKey: r.sessionKey,
      sessionDate: r.sessionDate || (r.markedAt ? new Date(r.markedAt).toISOString().split('T')[0] : 'Unknown Date'),
      date: r.sessionDate || (r.markedAt ? new Date(r.markedAt).toISOString().split('T')[0] : 'Unknown Date'),
      timeSlot: r.timeSlot || 'Routine Slot',
      courseCode: r.courseCode,
      courseTitle: r.courseTitle || '',
      studentId: r.studentId,
      studentName: r.studentName,
      studentEmail: r.studentEmail,
      status: r.status || 'present',
      method: r.method || (r.faceVerified ? 'face_verified' : 'manual'),
      markedAt: r.markedAt || r.createdAt || null,
      faceVerified: Boolean(r.faceVerified),
      faceSimilarity: r.faceSimilarity ?? null,
      distanceMeters: r.distanceMeters ?? null,
      closestLocationName: r.closestLocationName || null,
    }));

    res.json({
      success: true,
      courseCode: courseCode || 'All Courses',
      totalSessions,
      totalPlannedClasses,
      studentCount: roster.length,
      sessions: sessions.map((s) => {
        const attendeeEmails = new Set();
        allRecords.forEach((r) => {
          if (r.status === 'present') {
            const matchesKey = s.matchingKeys ? s.matchingKeys.includes(r.sessionKey) : r.sessionKey === s.sessionKey;
            const matchesDateSlot = (r.sessionDate === s.sessionDate && (r.timeSlot || '').trim() === (s.timeSlot || '').trim());
            if (matchesKey || matchesDateSlot) {
              attendeeEmails.add((r.studentEmail || '').toLowerCase());
            }
          }
        });
        const attendedCount = attendeeEmails.size;
        return {
          sessionKey: s.sessionKey,
          courseCode: s.courseCode,
          date: s.sessionDate,
          timeSlot: s.timeSlot,
          topic: s.topic || '',
          room: s.room || '',
          method: s.method || 'announced_session',
          status: s.status || 'completed',
          teacherName: s.teacherName || '',
          notes: s.notes || '',
          attendedCount,
          totalStudents: roster.length,
          turnoutPct: roster.length > 0 ? Math.round((attendedCount / roster.length) * 100) : 0,
          announcedAt: s.announcedAt || null,
        };
      }),
      roster,
      allRecords: formattedRecords,
    });
  } catch (err) {
    console.error('Error fetching roster report:', err);
    res.status(500).json({ error: 'Failed to fetch attendance roster report' });
  }
});


// ── POST /api/attendance/teacher/manual-session ────────────────────────
// Allows teacher to record a complete roll-call attendance session for a course
// Ensures single canonical session per class occurrence and prevents duplicate attendances in a day
router.post('/teacher/manual-session', async (req, res) => {
  try {
    const { attendanceSessions, attendanceRecords, students, routines } = getCollections();
    const { courseCode, semester, sessionDate, timeSlot, topic, records, teacherName, teacherEmail } = req.body || {};

    if (!courseCode || !sessionDate) {
      return res.status(400).json({ error: 'Course code and session date are required' });
    }

    const cleanCourse = courseCode.trim().toUpperCase();
    const cleanSlot = (timeSlot || '09:00 - 10:00').trim();
    const now = new Date();

    // 1. Resolve routine slot and canonical session key
    // Calculate weekday from sessionDate (e.g., 2026-11-16 -> 'Monday')
    const dateParts = sessionDate.split('-').map(Number);
    const dateObj = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2]));
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weekday = weekdays[dateObj.getUTCDay()];

    const letters = cleanCourse.replace(/[^A-Za-z]/g, '');
    const digits = cleanCourse.replace(/\D/g, '');
    const courseRegex = (letters && digits)
      ? new RegExp(`^${letters}\\s*[-_]?\\s*${digits}$`, 'i')
      : new RegExp(`^${cleanCourse.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');

    let routine = null;
    if (routines) {
      const candidates = await routines.find({
        $or: [{ courseCode: courseRegex }, { courseCode: cleanCourse }]
      }).toArray();

      routine = candidates.find(r => r.day?.toLowerCase() === weekday.toLowerCase() && (r.timeSlot === cleanSlot || r.timeSlot?.trim() === cleanSlot)) ||
                candidates.find(r => r.day?.toLowerCase() === weekday.toLowerCase()) ||
                candidates.find(r => r.timeSlot === cleanSlot || r.timeSlot?.trim() === cleanSlot) ||
                candidates[0] ||
                null;
    }

    let canonicalSessionKey = routine ? `${sessionDate}|${routine._id}` : `${sessionDate}|${cleanCourse}|${cleanSlot}`;

    // 2. Check if a session already exists for this date and course / routine
    const existingSession = await attendanceSessions.findOne({
      $or: [
        { sessionKey: canonicalSessionKey },
        { sessionKey: `${sessionDate}|${cleanCourse}|${cleanSlot}` },
        { sessionDate, courseCode: courseRegex, timeSlot: cleanSlot },
        ...(routine ? [{ sessionDate, routineId: String(routine._id) }] : [])
      ]
    });

    if (existingSession && existingSession.sessionKey) {
      canonicalSessionKey = existingSession.sessionKey;
    }

    // Upsert the single canonical attendance session (never create duplicates)
    await attendanceSessions.updateOne(
      { sessionKey: canonicalSessionKey },
      {
        $set: {
          sessionKey: canonicalSessionKey,
          routineId: routine ? String(routine._id) : (existingSession?.routineId || null),
          courseCode: cleanCourse,
          semester: Number(semester) || routine?.semester || existingSession?.semester || 1,
          sessionDate,
          timeSlot: cleanSlot,
          topic: topic || existingSession?.topic || '',
          teacherName: teacherName || existingSession?.teacherName || 'Course Instructor',
          teacherEmail: teacherEmail || existingSession?.teacherEmail || '',
          status: 'completed',
          updatedAt: now,
        },
        $setOnInsert: {
          method: 'manual_rollcall',
          createdAt: now,
        }
      },
      { upsert: true }
    );

    // 3. Process records: Idempotent and Deduplicated
    if (Array.isArray(records)) {
      for (const item of records) {
        const studentEmail = (item.studentEmail || '').toLowerCase().trim();
        if (!studentEmail) continue;

        // Find if this student already has a record for this class occurrence
        const existingRecord = await attendanceRecords.findOne({
          $or: [
            { sessionKey: canonicalSessionKey, studentEmail },
            { sessionDate, courseCode: courseRegex, timeSlot: cleanSlot, studentEmail },
            { sessionKey: `${sessionDate}|${cleanCourse}|${cleanSlot}`, studentEmail }
          ]
        });

        if (item.present) {
          if (existingRecord) {
            // Update to canonical key and present status, keeping face verification details intact
            await attendanceRecords.updateOne(
              { _id: existingRecord._id },
              {
                $set: {
                  sessionKey: canonicalSessionKey,
                  courseCode: cleanCourse,
                  sessionDate,
                  timeSlot: cleanSlot,
                  status: 'present',
                  updatedAt: now,
                }
              }
            );
          } else {
            // New record insertion
            const st = students ? await students.findOne({
              $or: [
                { email: studentEmail },
                ...(item.studentId ? [{ studentId: item.studentId }] : [])
              ]
            }) : null;

            await attendanceRecords.insertOne({
              sessionKey: canonicalSessionKey,
              userId: st ? String(st.userId || st._id) : item.userId || null,
              studentEmail,
              studentId: item.studentId || (st ? st.studentId : '') || '',
              studentName: item.studentName || (st ? st.name : '') || '',
              courseCode: cleanCourse,
              sessionDate,
              timeSlot: cleanSlot,
              status: 'present',
              method: 'manual',
              markedAt: now,
              createdAt: now,
              updatedAt: now,
            });
          }
        } else {
          // If marked absent in roll call:
          if (existingRecord) {
            await attendanceRecords.deleteOne({ _id: existingRecord._id });
          }
        }

        // Clean up any extra duplicate records for this student on this day/slot
        await attendanceRecords.deleteMany({
          sessionDate,
          courseCode: courseRegex,
          timeSlot: cleanSlot,
          studentEmail,
          sessionKey: { $ne: canonicalSessionKey }
        });
      }
    }

    // Clean up any orphan duplicate session documents for the same day/slot
    await attendanceSessions.deleteMany({
      sessionDate,
      courseCode: courseRegex,
      timeSlot: cleanSlot,
      sessionKey: { $ne: canonicalSessionKey }
    });

    res.json({
      success: true,
      message: `Class attendance successfully saved for ${cleanCourse} on ${sessionDate}!`,
      sessionKey: canonicalSessionKey
    });
  } catch (err) {
    console.error('Error saving manual attendance session:', err);
    res.status(500).json({ error: 'Failed to record attendance session' });
  }
});

// ── POST /api/attendance/teacher/toggle-student ────────────────────────
// Quick-toggle single student present/absent for a session
router.post('/teacher/toggle-student', async (req, res) => {
  try {
    const { attendanceRecords, students } = getCollections();
    const { sessionKey, studentEmail, studentId, studentName, courseCode, sessionDate, timeSlot, present } = req.body || {};

    if (!sessionKey || !studentEmail) {
      return res.status(400).json({ error: 'sessionKey and studentEmail are required' });
    }

    const email = studentEmail.toLowerCase().trim();
    const cleanCourse = (courseCode || '').toUpperCase().trim();
    const now = new Date();

    if (present) {
      const existing = await attendanceRecords.findOne({
        $or: [
          { sessionKey, studentEmail: email },
          ...(sessionDate && cleanCourse && timeSlot ? [{ sessionDate, courseCode: cleanCourse, timeSlot, studentEmail: email }] : [])
        ]
      });

      if (existing) {
        await attendanceRecords.updateOne(
          { _id: existing._id },
          {
            $set: {
              sessionKey,
              status: 'present',
              updatedAt: now,
            }
          }
        );
      } else {
        const st = students ? await students.findOne({
          $or: [
            { email: email },
            ...(studentId ? [{ studentId: String(studentId) }] : [])
          ]
        }) : null;

        await attendanceRecords.insertOne({
          sessionKey,
          userId: st ? String(st.userId || st._id) : req.body?.userId || null,
          studentEmail: email,
          studentId: studentId || (st ? st.studentId : '') || '',
          studentName: studentName || (st ? st.name : '') || '',
          courseCode: cleanCourse,
          sessionDate: sessionDate || '',
          timeSlot: timeSlot || '',
          status: 'present',
          method: 'manual_override',
          markedAt: now,
          createdAt: now,
          updatedAt: now,
        });
      }
    } else {
      await attendanceRecords.deleteMany({
        $or: [
          { sessionKey, studentEmail: email },
          ...(sessionDate && cleanCourse && timeSlot ? [{ sessionDate, courseCode: cleanCourse, timeSlot, studentEmail: email }] : [])
        ]
      });
    }

    res.json({ success: true, present: Boolean(present) });
  } catch (err) {
    console.error('Error toggling student attendance:', err);
    res.status(500).json({ error: 'Failed to toggle student attendance' });
  }
});

// ── DELETE /api/attendance/teacher/session/:sessionKey ─────────────────
router.delete('/teacher/session/:sessionKey', async (req, res) => {
  try {
    const { attendanceSessions, attendanceRecords } = getCollections();
    const sessionKey = decodeURIComponent(req.params.sessionKey);

    const session = await attendanceSessions.findOne({ sessionKey });
    if (session) {
      await attendanceRecords.deleteMany({
        $or: [
          { sessionKey },
          { sessionDate: session.sessionDate, courseCode: session.courseCode, timeSlot: session.timeSlot }
        ]
      });
      await attendanceSessions.deleteMany({
        $or: [
          { sessionKey },
          { sessionDate: session.sessionDate, courseCode: session.courseCode, timeSlot: session.timeSlot }
        ]
      });
    } else {
      await attendanceRecords.deleteMany({ sessionKey });
      await attendanceSessions.deleteOne({ sessionKey });
    }

    res.json({ success: true, message: 'Session deleted successfully' });
  } catch (err) {
    console.error('Error deleting attendance session:', err);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

module.exports = router;

