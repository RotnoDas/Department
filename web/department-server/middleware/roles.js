'use strict';

// Role guards for the attendance and face endpoints.
//
// They run after `verifyToken`. The caller is identified from the *verified* token (user id / email)
// and the real profile is then loaded from the database, so nothing the client sends in the request
// body or query string is ever trusted to say who the user is.

const { getCollections } = require('../config/db');
const { adminEmails } = require('../config/attendance');

const BLOCKED_STATUSES = new Set(['pending', 'rejected']);

async function findProfile(collection, tokenUser) {
  const userId = tokenUser?.sub ? String(tokenUser.sub) : null;
  const email = typeof tokenUser?.email === 'string' ? tokenUser.email.trim() : '';

  if (userId) {
    const byId = await collection.findOne({ userId });
    if (byId) return byId;
  }
  if (email) {
    return collection.findOne({ email: { $in: [email, email.toLowerCase()] } });
  }
  return null;
}

/** Attach `req.student`. With `{ approved: true }`, pending/rejected accounts are refused. */
const requireStudent =
  ({ approved = false } = {}) =>
  async (req, res, next) => {
    try {
      const { students } = getCollections();
      const student = await findProfile(students, req.user);
      if (!student) {
        return res.status(403).json({
          error: 'No student profile is linked to this account.',
          code: 'NOT_A_STUDENT',
        });
      }
      if (approved && BLOCKED_STATUSES.has(student.status)) {
        return res.status(403).json({
          error: 'Your account is awaiting approval by the department administrator.',
          code: 'ACCOUNT_NOT_APPROVED',
        });
      }
      req.student = student;
      // The id the rest of the attendance code keys on: the better-auth user id from the token.
      req.userId = String(student.userId || req.user.sub);
      return next();
    } catch (err) {
      console.error('[requireStudent]', err);
      return res.status(500).json({ error: 'Failed to load student profile.' });
    }
  };

/** Attach `req.teacher`. Pending/rejected faculty are refused. */
const requireTeacher = async (req, res, next) => {
  try {
    const { teachers } = getCollections();
    const teacher = await findProfile(teachers, req.user);
    if (!teacher) {
      return res.status(403).json({ error: 'No faculty profile is linked to this account.', code: 'NOT_A_TEACHER' });
    }
    if (BLOCKED_STATUSES.has(teacher.status)) {
      return res.status(403).json({
        error: 'Your faculty account is awaiting approval by the department administrator.',
        code: 'ACCOUNT_NOT_APPROVED',
      });
    }
    req.teacher = teacher;
    req.userId = String(teacher.userId || req.user.sub);
    return next();
  } catch (err) {
    console.error('[requireTeacher]', err);
    return res.status(500).json({ error: 'Failed to load faculty profile.' });
  }
};

/**
 * Administrators only. The token must say role=admin AND the e-mail must be on the ADMIN_EMAILS
 * allow-list (default: admin@cse.edu), because self-service sign-up can request any role.
 */
const requireAdmin = (req, res, next) => {
  const email = String(req.user?.email || '').trim().toLowerCase();
  if (req.user?.role === 'admin' && adminEmails.includes(email)) return next();
  return res.status(403).json({ error: 'Administrator access required.', code: 'NOT_AN_ADMIN' });
};

/** These responses are personal and time-sensitive; never let a browser or proxy cache them. */
const noStore = (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
};

module.exports = { requireStudent, requireTeacher, requireAdmin, noStore };
