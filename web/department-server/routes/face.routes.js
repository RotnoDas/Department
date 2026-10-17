'use strict';

// /api/face - face enrollment and liveness challenges.
//
//   GET  /status        has the signed-in student enrolled a face?
//   POST /challenge     start a liveness challenge ("enroll", or "verify" for one open class)
//   POST /enroll        submit the challenge frames and store the student's face template
//   POST /admin/reset   administrator removes a student's template so they can enroll again
//
// Only a numeric face template is stored (never a photo), and no endpoint returns it.

const express = require('express');
const { getCollections } = require('../config/db');
const cfg = require('../config/attendance');
const { verifyToken } = require('../middleware/auth');
const { requireStudent, requireAdmin, noStore } = require('../middleware/roles');
const { sendError } = require('../utils/httpErrors');
const face = require('../services/face.service');
const { AttendanceError, resolveClass, assertCanCheckIn } = require('../services/attendance.service');

const router = express.Router();
router.use(noStore);

router.get('/status', verifyToken, requireStudent(), async (req, res) => {
  try {
    const profile = await face.getProfile(req.userId);
    res.json({
      success: true,
      enrolled: Boolean(profile),
      enrolledAt: profile?.enrolledAt || null,
      serviceOnline: await face.isServiceOnline(),
    });
  } catch (err) {
    sendError(res, err, 'Failed to read face enrollment status.');
  }
});

router.post('/challenge', verifyToken, requireStudent({ approved: true }), async (req, res) => {
  try {
    const { purpose, routineId } = req.body || {};
    const profile = await face.getProfile(req.userId);
    let scopeKey;

    if (purpose === 'enroll') {
      if (profile) {
        throw new face.FaceError('ALREADY_ENROLLED', 'A face is already enrolled for this account. Ask an administrator to reset it first.', 409);
      }
      scopeKey = 'enroll';
    } else if (purpose === 'verify') {
      if (!profile) {
        throw new face.FaceError('FACE_NOT_ENROLLED', 'Enroll your face first, then give attendance.', 409);
      }
      // Only start a face scan for a class that is actually open for this student right now.
      const ctx = await resolveClass({ student: req.student, userId: req.userId, routineId });
      assertCanCheckIn(ctx);
      scopeKey = ctx.sessionKey;
    } else {
      throw new AttendanceError('BAD_REQUEST', 'purpose must be "enroll" or "verify".', 400);
    }

    await face.assertAttemptBudget({ userId: req.userId, scopeKey });
    if (!(await face.isServiceOnline())) {
      throw new face.FaceError(
        'FACE_SERVICE_UNAVAILABLE',
        'Face verification is temporarily unavailable. Please try again in a moment.',
        503
      );
    }

    const challenge = await face.issueChallenge({ userId: req.userId, purpose, scopeKey });
    res.json({
      success: true,
      challengeId: challenge._id,
      steps: challenge.steps,
      expiresAt: challenge.expiresAt,
      expiresInSeconds: cfg.face.challengeTtlSeconds,
    });
  } catch (err) {
    sendError(res, err, 'Failed to start the face check.');
  }
});

router.post('/enroll', verifyToken, requireStudent({ approved: true }), async (req, res) => {
  try {
    const { challengeId, frames } = req.body || {};

    if (await face.getProfile(req.userId)) {
      throw new face.FaceError('ALREADY_ENROLLED', 'A face is already enrolled for this account. Ask an administrator to reset it first.', 409);
    }

    const result = await face.runFaceCheck({
      userId: req.userId,
      purpose: 'enroll',
      scopeKey: 'enroll',
      challengeId,
      frames,
    });

    const enrolledAt = await face.saveProfile({
      userId: req.userId,
      email: req.student.email,
      studentId: req.student.studentId,
      embedding: result.embedding,
      metrics: result.metrics,
    });

    res.json({
      success: true,
      message: 'Your face is enrolled. You can now give attendance.',
      enrolled: true,
      enrolledAt,
    });
  } catch (err) {
    sendError(res, err, 'Failed to enroll your face.');
  }
});

router.post('/admin/reset', verifyToken, requireAdmin, async (req, res) => {
  try {
    const identifier = String(req.body?.identifier || '').trim();
    if (!identifier) throw new AttendanceError('BAD_REQUEST', 'identifier (email, student ID or user ID) is required.', 400);

    const { students } = getCollections();
    const student = await students.findOne({
      $or: [{ email: identifier }, { email: identifier.toLowerCase() }, { studentId: identifier }, { userId: identifier }],
    });
    if (!student?.userId) throw new AttendanceError('STUDENT_NOT_FOUND', 'No student matches that identifier.', 404);

    const removed = await face.deleteProfile(String(student.userId));
    console.log(`[face] Admin ${req.user.email} reset the face enrollment of ${student.email} (removed=${removed}).`);
    res.json({
      success: true,
      reset: removed,
      message: removed
        ? `Face enrollment removed for ${student.name || student.email}. They can enroll again.`
        : `${student.name || student.email} had no face enrollment.`,
    });
  } catch (err) {
    sendError(res, err, 'Failed to reset the face enrollment.');
  }
});

module.exports = router;
