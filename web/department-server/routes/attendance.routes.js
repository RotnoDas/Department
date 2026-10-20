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
    const { local, queryDay, isToday, semester, sessions } = await listDaySessions({
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
// A teacher can (re)open check-in for THEIR OWN class, but only while that class is in session:
// the window then runs for 10 minutes from this moment, never past the end of the class.
router.post('/session/start', verifyToken, requireTeacher, async (req, res) => {
  try {
    const now = new Date();
    const local = getZonedParts(now, cfg.timezone);

    const routine = await findRoutine(req.body?.routineId);
    if (!routine) throw new AttendanceError('CLASS_NOT_FOUND', 'That class was not found.', 404);
    if (!teacherOwnsRoutine(req.teacher, routine)) {
      throw new AttendanceError('NOT_YOUR_CLASS', 'You can only start attendance for your own classes.', 403);
    }
    if (routine.day !== local.weekday) {
      throw new AttendanceError('CLASS_NOT_TODAY', `${routine.courseCode} is scheduled on ${routine.day}, not today.`, 409);
    }
    const slot = parseTimeSlot(routine.timeSlot);
    if (!slot) throw new AttendanceError('CLASS_NOT_FOUND', 'That class has no valid time slot.', 409);
    if (local.minutes < slot.startMin || local.minutes >= slot.endMin) {
      throw new AttendanceError(
        'OUTSIDE_CLASS_TIME',
        `You can only start attendance while the class is in session (${slot.startLabel} - ${slot.endLabel}).`,
        409
      );
    }

    let session = await ensureSession({ routine, slot, local, now });
    let window = describeWindow({ routine, slot, session, local });

    if (window.state === 'open') {
      return res.json({
        success: true,
        alreadyOpen: true,
        message: `Check-in for ${routine.courseCode} is already open.`,
        secondsLeft: window.secondsLeft,
      });
    }

    session = await getCollections().attendanceSessions.findOneAndUpdate(
      { sessionKey: session.sessionKey },
      { $set: { status: 'active', startedAt: now, startedBy: req.userId, updatedAt: now } },
      { returnDocument: 'after' }
    );
    window = describeWindow({ routine, slot, session, local });

    res.json({
      success: true,
      alreadyOpen: false,
      message: `Check-in for ${routine.courseCode} is open for ${Math.ceil(window.secondsLeft / 60)} minute(s).`,
      secondsLeft: window.secondsLeft,
      session: {
        id: String(session._id),
        courseCode: session.courseCode,
        timeSlot: session.timeSlot,
        sessionDate: session.sessionDate,
        startedAt: session.startedAt,
      },
    });
  } catch (err) {
    sendError(res, err, 'Failed to start the attendance session.');
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
    const { students, attendanceSessions, attendanceRecords } = getCollections();
    const { courseCode, semester } = req.query;

    const sessionQuery = {
      status: { $ne: 'scheduled' },
    };
    if (courseCode && courseCode !== 'all') {
      sessionQuery.courseCode = { $regex: `^${courseCode.trim()}$`, $options: 'i' };
    }

    // Find all sessions held or announced for this course
    const sessions = await attendanceSessions
      .find(sessionQuery)
      .sort({ sessionDate: -1, timeSlot: 1 })
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

    // Map records for quick lookup: sessionKey -> Set of student emails
    const sessionKeys = sessions.map((s) => s.sessionKey).filter(Boolean);
    const records = await attendanceRecords
      .find({ sessionKey: { $in: sessionKeys } })
      .toArray();

    const recordMap = new Map(); // key: `${sessionKey}_${studentEmail}` -> record
    records.forEach((r) => {
      const email = (r.studentEmail || '').toLowerCase();
      if (r.sessionKey && email) {
        recordMap.set(`${r.sessionKey}_${email}`, r);
      }
    });

    const totalSessions = sessions.length;

    let courseDoc = null;
    if (courseCode) {
      const { courses } = getCollections();
      const rawCode = String(courseCode).trim();
      const cleanCode = rawCode.replace(/[\s-]/g, '');
      courseDoc = await courses.findOne({
        $or: [
          { code: { $regex: `^${rawCode}$`, $options: 'i' } },
          { code: { $regex: cleanCode, $options: 'i' } },
          { code: rawCode }
        ]
      });
    }
    const totalPlannedClasses = courseDoc?.totalClasses !== undefined && courseDoc?.totalClasses !== null
      ? Number(courseDoc.totalClasses)
      : null;

    const roster = studentList.map((stu) => {
      const email = (stu.email || '').toLowerCase();
      let attendedCount = 0;
      const history = sessions.map((s) => {
        const rec = recordMap.get(`${s.sessionKey}_${email}`);
        const present = Boolean(rec);
        if (present) attendedCount++;
        return {
          sessionKey: s.sessionKey,
          date: s.sessionDate,
          timeSlot: s.timeSlot,
          topic: s.topic || '',
          status: present ? 'present' : 'absent',
          method: rec?.method || s.method || 'announced_session',
          markedAt: rec?.markedAt || null,
          distance: rec?.distanceMeters || null,
        };
      });

      const percentage = totalSessions > 0 ? Math.round((attendedCount / totalSessions) * 100) : (totalSessions === 0 ? null : 0);
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
        hasAttendance: totalSessions > 0,
        isAtRisk: totalSessions > 0 && percentage !== null && percentage < 75,
        remainingClasses,
        neededFromRemaining,
        canReach75: neededFromRemaining <= remainingClasses,
        history,
      };
    });

    res.json({
      success: true,
      courseCode: courseCode || 'All Courses',
      totalSessions,
      totalPlannedClasses,
      studentCount: roster.length,
      sessions: sessions.map((s) => {
        const attendees = records.filter((r) => r.sessionKey === s.sessionKey && r.status === 'present');
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
          attendedCount: attendees.length,
          totalStudents: roster.length,
          turnoutPct: roster.length > 0 ? Math.round((attendees.length / roster.length) * 100) : 0,
          announcedAt: s.announcedAt || s.createdAt || null,
        };
      }),
      roster,
    });
  } catch (err) {
    console.error('Error fetching roster report:', err);
    res.status(500).json({ error: 'Failed to fetch attendance roster report' });
  }
});

// ── POST /api/attendance/teacher/session/announce ───────────────────────
// Teacher announces a class session for this course cohort
router.post('/teacher/session/announce', async (req, res) => {
  try {
    const { attendanceSessions, notices } = getCollections();
    const {
      courseCode,
      semester,
      sessionDate,
      timeSlot,
      room,
      topic,
      notes,
      actionType = 'announce_only', // 'announce_only' | 'start_live' | 'record_rollcall'
      notifyCohort = true,
      teacherName,
      teacherEmail,
    } = req.body || {};

    if (!courseCode || !sessionDate) {
      return res.status(400).json({ error: 'Course code and session date are required' });
    }

    const cleanCourse = courseCode.trim().toUpperCase();
    const cleanSlot = timeSlot || '09:00 - 10:00';
    const sessionKey = `${sessionDate}|${cleanCourse}|${cleanSlot}`;
    const now = new Date();

    const initialStatus = actionType === 'start_live' ? 'active' : (actionType === 'record_rollcall' ? 'active' : 'announced');
    const initialMethod = actionType === 'start_live' ? 'live_geofence' : (actionType === 'record_rollcall' ? 'manual_rollcall' : 'announced_session');

    await attendanceSessions.updateOne(
      { sessionKey },
      {
        $set: {
          sessionKey,
          courseCode: cleanCourse,
          semester: Number(semester) || 1,
          sessionDate,
          timeSlot: cleanSlot,
          room: room || 'Classroom',
          topic: topic ? topic.trim() : 'Scheduled Lecture Session',
          notes: notes ? notes.trim() : '',
          teacherName: teacherName || 'Course Instructor',
          teacherEmail: teacherEmail || '',
          method: initialMethod,
          status: initialStatus,
          announcedAt: now,
          updatedAt: now,
          ...(actionType === 'start_live' ? { startedAt: now } : {}),
        },
        $setOnInsert: {
          createdAt: now,
        }
      },
      { upsert: true }
    );

    let noticeDoc = null;
    if (notifyCohort) {
      const cleanTopic = topic ? topic.trim() : 'Class Lecture';
      const semLabel = semester ? `Semester ${semester}` : 'All Students';
      noticeDoc = {
        title: `Class Announcement: ${cleanCourse} - ${cleanTopic}`,
        category: 'Academic',
        audience: semLabel,
        courseCode: cleanCourse,
        content: `A class session for ${cleanCourse} (${cleanTopic}) has been announced by ${teacherName || 'Course Instructor'}.\n\n📅 Date: ${sessionDate}\n⏰ Time: ${cleanSlot}\n📍 Room: ${room || 'Assigned Room'}${notes ? `\n\n📝 Notes: ${notes.trim()}` : ''}`,
        priority: 'High',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        createdAt: now,
      };
      await notices.insertOne(noticeDoc);
    }

    res.json({
      success: true,
      message: `Class session announced for ${cleanCourse} on ${sessionDate}!`,
      sessionKey,
      session: {
        sessionKey,
        courseCode: cleanCourse,
        sessionDate,
        timeSlot: cleanSlot,
        room,
        topic,
        status: initialStatus,
        method: initialMethod,
      },
      noticeCreated: Boolean(noticeDoc),
    });
  } catch (err) {
    console.error('Error announcing class session:', err);
    res.status(500).json({ error: 'Failed to announce class session' });
  }
});

// ── POST /api/attendance/teacher/manual-session ────────────────────────
// Allows teacher to record a complete roll-call attendance session for a course
router.post('/teacher/manual-session', async (req, res) => {
  try {
    const { attendanceSessions, attendanceRecords } = getCollections();
    const { courseCode, semester, sessionDate, timeSlot, topic, records, teacherName, teacherEmail } = req.body || {};

    if (!courseCode || !sessionDate) {
      return res.status(400).json({ error: 'Course code and session date are required' });
    }

    const cleanCourse = courseCode.trim().toUpperCase();
    const cleanSlot = timeSlot || '09:00 - 10:00';
    const now = new Date();
    const sessionKey = `${sessionDate}|${cleanCourse}|${cleanSlot}`;

    // 1. Upsert attendance session
    await attendanceSessions.updateOne(
      { sessionKey },
      {
        $set: {
          sessionKey,
          courseCode: cleanCourse,
          semester: Number(semester) || 1,
          sessionDate,
          timeSlot: cleanSlot,
          topic: topic || '',
          teacherName: teacherName || 'Course Instructor',
          teacherEmail: teacherEmail || '',
          method: 'manual_rollcall',
          status: 'completed',
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        }
      },
      { upsert: true }
    );

    // 2. Process records array
    if (Array.isArray(records)) {
      for (const item of records) {
        const studentEmail = (item.studentEmail || '').toLowerCase();
        if (!studentEmail) continue;

        if (item.present) {
          await attendanceRecords.updateOne(
            { sessionKey, studentEmail },
            {
              $set: {
                sessionKey,
                studentEmail,
                studentId: item.studentId || '',
                studentName: item.studentName || '',
                courseCode: cleanCourse,
                sessionDate,
                timeSlot: cleanSlot,
                status: 'present',
                method: 'manual',
                markedAt: now,
                updatedAt: now,
              },
              $setOnInsert: {
                createdAt: now,
              }
            },
            { upsert: true }
          );
        } else {
          // If marked absent, remove any present record for this session
          await attendanceRecords.deleteOne({ sessionKey, studentEmail });
        }
      }
    }

    res.json({
      success: true,
      message: `Attendance recorded for ${cleanCourse} on ${sessionDate}!`,
      sessionKey
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
    const { attendanceRecords } = getCollections();
    const { sessionKey, studentEmail, studentId, studentName, courseCode, sessionDate, timeSlot, present } = req.body || {};

    if (!sessionKey || !studentEmail) {
      return res.status(400).json({ error: 'sessionKey and studentEmail are required' });
    }

    const email = studentEmail.toLowerCase();
    const now = new Date();

    if (present) {
      await attendanceRecords.updateOne(
        { sessionKey, studentEmail: email },
        {
          $set: {
            sessionKey,
            studentEmail: email,
            studentId: studentId || '',
            studentName: studentName || '',
            courseCode: (courseCode || '').toUpperCase(),
            sessionDate: sessionDate || '',
            timeSlot: timeSlot || '',
            status: 'present',
            method: 'manual_override',
            markedAt: now,
            updatedAt: now,
          },
          $setOnInsert: { createdAt: now }
        },
        { upsert: true }
      );
    } else {
      await attendanceRecords.deleteOne({ sessionKey, studentEmail: email });
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

    await attendanceRecords.deleteMany({ sessionKey });
    const result = await attendanceSessions.deleteOne({ sessionKey });

    res.json({ success: true, deleted: result.deletedCount > 0, message: 'Session deleted successfully' });
  } catch (err) {
    console.error('Error deleting attendance session:', err);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

module.exports = router;

