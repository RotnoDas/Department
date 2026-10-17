'use strict';

// Face verification for attendance.
//
// The Python service (ml/face-service) is stateless: it analyses a burst of camera frames, checks
// liveness (head turns + blink) and returns a 128-d face embedding. This module is the policy layer
// around it:
//   * issues single-use, short-lived, randomly ordered liveness challenges
//   * limits repeated failed attempts
//   * rejects camera frames that were already submitted before (replay)
//   * decides whether an embedding is accepted as the enrolled student

const crypto = require('crypto');
const { getCollections } = require('../config/db');
const { face: cfg } = require('../config/attendance');

// OpenCV's published SFace cosine-similarity threshold. Whatever FACE_MATCH_THRESHOLD the service is
// configured with, a match below this floor is never accepted.
const SIMILARITY_FLOOR = 0.363;
const EMBEDDING_DIM = 128;
const ACTIVE_STEPS = ['left', 'right', 'blink'];

// Outcomes that look like an attack or a failed liveness test and therefore use up the attempt budget.
// Plain capture-quality problems (no face, too far, not frontal) do not.
const COUNTED_FAILURES = new Set([
  'TURN_NOT_DETECTED',
  'BLINK_NOT_DETECTED',
  'IDENTITY_SWITCH',
  'MULTIPLE_FACES',
  'FACE_MISMATCH',
  'REPLAYED_FRAMES',
]);

class FaceError extends Error {
  constructor(code, message, status = 422, extra = {}) {
    super(message);
    this.name = 'FaceError';
    this.code = code;
    this.status = status;
    this.extra = extra;
  }
}

// ── Face service client ──────────────────────────────────────────────────────────────────────────
function unavailable() {
  return new FaceError(
    'FACE_SERVICE_UNAVAILABLE',
    'Face verification is temporarily unavailable. Please try again in a moment.',
    503
  );
}

async function callAnalyze({ steps, frames, reference }) {
  const headers = { 'Content-Type': 'application/json' };
  if (cfg.secret) headers['x-internal-secret'] = cfg.secret;

  let response;
  try {
    response = await fetch(`${cfg.url}/analyze`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ steps, frames, ...(reference ? { reference } : {}) }),
      signal: AbortSignal.timeout(cfg.requestTimeoutMs),
    });
  } catch (err) {
    // The service closes the connection on a wrong secret before reading the (large) body, which
    // surfaces here as a reset rather than a 401.
    console.error(`[face] Could not reach the face service at ${cfg.url}: ${err.cause?.code || err.message}. ` +
      'Is it running, and does FACE_SERVICE_SECRET match on both sides?');
    throw unavailable();
  }

  if (response.status === 401) {
    console.error('[face] The face service rejected FACE_SERVICE_SECRET. Make sure both .env files use the same value.');
    throw unavailable();
  }
  if (!response.ok) {
    console.error(`[face] The face service responded with HTTP ${response.status}.`);
    throw unavailable();
  }

  try {
    return await response.json();
  } catch (err) {
    console.error('[face] The face service returned a non-JSON response.');
    throw unavailable();
  }
}

let healthCache = { at: 0, ok: false };

/** Cheap liveness probe (cached for a few seconds) so students are not asked to scan into a dead service. */
async function isServiceOnline() {
  if (Date.now() - healthCache.at < 5000) return healthCache.ok;
  let ok = false;
  try {
    const res = await fetch(`${cfg.url}/health`, { signal: AbortSignal.timeout(2000) });
    ok = res.ok;
  } catch {
    ok = false;
  }
  healthCache = { at: Date.now(), ok };
  return ok;
}

// ── Challenges ───────────────────────────────────────────────────────────────────────────────────
function shuffled(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Issue a liveness challenge: look straight first (identity anchor), then the remaining steps in a
 * random order. `scopeKey` ties it to one purpose, e.g. "enroll" or "2026-10-17|<routineId>".
 * Any earlier unused challenge for the same user and scope is revoked, so only one is live at a time.
 */
async function issueChallenge({ userId, purpose, scopeKey }) {
  const { faceChallenges } = getCollections();
  const now = new Date();
  await faceChallenges.updateMany({ userId, scopeKey, usedAt: null }, { $set: { usedAt: now } });

  const challenge = {
    _id: crypto.randomBytes(24).toString('hex'),
    userId,
    purpose,
    scopeKey,
    steps: ['center', ...shuffled(ACTIVE_STEPS)],
    createdAt: now,
    expiresAt: new Date(now.getTime() + cfg.challengeTtlSeconds * 1000),
    usedAt: null,
  };
  await faceChallenges.insertOne(challenge);
  return challenge;
}

/** Read-only: does this user hold a live (unused, unexpired) challenge for this scope? */
async function hasLiveChallenge({ userId, scopeKey, challengeId, purpose = 'verify' }) {
  if (typeof challengeId !== 'string' || challengeId.length > 100) return false;
  const { faceChallenges } = getCollections();
  const found = await faceChallenges.findOne(
    { _id: challengeId, userId, purpose, scopeKey, usedAt: null, expiresAt: { $gt: new Date() } },
    { projection: { _id: 1 } }
  );
  return Boolean(found);
}

// ── Payload checks ───────────────────────────────────────────────────────────────────────────────
function validateFrames(frames, steps) {
  if (!Array.isArray(frames) || frames.length === 0) {
    throw new FaceError('BAD_FRAMES', 'No camera frames were received.', 400);
  }
  if (frames.length > cfg.maxFrames) {
    throw new FaceError('BAD_FRAMES', 'Too many camera frames were sent.', 400);
  }

  const seen = new Set();
  const clean = [];
  for (const frame of frames) {
    if (!frame || typeof frame.step !== 'string' || typeof frame.image !== 'string') {
      throw new FaceError('BAD_FRAMES', 'A camera frame was malformed.', 400);
    }
    if (!steps.includes(frame.step)) {
      throw new FaceError('BAD_FRAMES', `A camera frame did not belong to this challenge ("${frame.step}").`, 400);
    }
    if (frame.image.length < 500 || frame.image.length > cfg.maxFrameChars) {
      throw new FaceError('BAD_FRAMES', 'A camera frame had an invalid size.', 400);
    }
    seen.add(frame.step);
    clean.push({ step: frame.step, image: frame.image });
  }

  for (const step of steps) {
    if (!seen.has(step)) {
      throw new FaceError('MISSING_STEP', `Camera frames for the "${step}" step are missing.`, 422, { step });
    }
  }
  return clean;
}

/** SHA-256 of each frame's decoded bytes (so a data: prefix or base64 padding tweak does not change it). */
function hashFrames(frames) {
  return frames.map((f) => {
    const b64 = f.image.startsWith('data:') ? f.image.slice(f.image.indexOf(',') + 1) : f.image;
    return crypto.createHash('sha256').update(Buffer.from(b64, 'base64')).digest('hex');
  });
}

async function assertAttemptBudget({ userId, scopeKey }) {
  const { attendanceAttempts } = getCollections();
  const since = new Date(Date.now() - cfg.attemptWindowMinutes * 60 * 1000);
  const failures = await attendanceAttempts.countDocuments({ userId, scopeKey, counted: true, at: { $gte: since } });
  if (failures >= cfg.maxFailedAttempts) {
    throw new FaceError(
      'TOO_MANY_ATTEMPTS',
      `Too many failed face checks. Please wait about ${cfg.attemptWindowMinutes} minutes, or ask your teacher for help.`,
      429
    );
  }
}

// ── The check itself ─────────────────────────────────────────────────────────────────────────────
/**
 * Verify a liveness burst. With `reference` (the enrolled embedding) the face must also match it;
 * without it (enrollment) the freshly computed embedding is returned.
 *
 * Throws FaceError on any failure. Returns the face service result on success.
 */
async function runFaceCheck({ userId, purpose, scopeKey, challengeId, frames, reference = null }) {
  const { attendanceAttempts, faceChallenges } = getCollections();

  await assertAttemptBudget({ userId, scopeKey });

  // Single use: whoever flips `usedAt` first owns the challenge. Concurrent or repeated submissions lose.
  const now = new Date();
  const challenge =
    typeof challengeId === 'string' && challengeId.length <= 100
      ? await faceChallenges.findOneAndUpdate(
          { _id: challengeId, userId, purpose, scopeKey, usedAt: null, expiresAt: { $gt: now } },
          { $set: { usedAt: now } },
          { returnDocument: 'before' }
        )
      : null;
  if (!challenge) {
    throw new FaceError('CHALLENGE_INVALID', 'This face check expired or was already used. Please start again.', 409);
  }

  let hashes = [];
  const record = (fields) =>
    attendanceAttempts
      .insertOne({ userId, scopeKey, purpose, challengeId, frameHashes: hashes, at: new Date(), ...fields })
      .catch((err) => console.error('[face] Could not store attempt log:', err.message));

  let clean;
  try {
    clean = validateFrames(frames, challenge.steps);
    hashes = hashFrames(clean);
  } catch (err) {
    if (err instanceof FaceError) await record({ ok: false, code: err.code, counted: false });
    throw err;
  }

  const replayed = await attendanceAttempts.findOne({ frameHashes: { $in: hashes } }, { projection: { _id: 1 } });
  if (replayed) {
    await record({ ok: false, code: 'REPLAYED_FRAMES', counted: true });
    throw new FaceError('REPLAYED_FRAMES', 'These camera images were already used. Please use your live camera.', 403);
  }

  let result;
  try {
    result = await callAnalyze({ steps: challenge.steps, frames: clean, reference });
  } catch (err) {
    // Not the student's fault: give the challenge back so they can retry immediately.
    await faceChallenges.updateOne({ _id: challenge._id }, { $set: { usedAt: null } }).catch(() => {});
    throw err;
  }

  if (reference) {
    const similarity = Number(result?.similarity);
    if (result?.ok && !(result.match === true && Number.isFinite(similarity) && similarity >= SIMILARITY_FLOOR)) {
      result = { ...result, ok: false, code: 'FACE_MISMATCH', reason: 'Face does not match the registered student.' };
    }
  }

  if (!result?.ok) {
    let code = result?.code || 'FACE_CHECK_FAILED';
    let status = code === 'FACE_MISMATCH' ? 403 : 422;
    let message = result?.reason || 'Face verification failed. Please try again.';
    if (code === 'BAD_REFERENCE') {
      code = 'FACE_PROFILE_INVALID';
      status = 409;
      message = 'Your enrolled face data is invalid. Ask an administrator to reset it, then enroll again.';
    }
    await record({
      ok: false,
      code,
      step: result?.step || null,
      similarity: result?.similarity ?? null,
      metrics: result?.metrics ?? null,
      counted: COUNTED_FAILURES.has(code),
    });
    throw new FaceError(code, message, status, { step: result?.step || null });
  }

  if (!reference) {
    const e = result.embedding;
    const valid = Array.isArray(e) && e.length === EMBEDDING_DIM && e.every((v) => Number.isFinite(v));
    if (!valid) {
      console.error('[face] The face service returned an unusable embedding.');
      throw unavailable();
    }
  }

  await record({
    ok: true,
    code: 'OK',
    similarity: result.similarity ?? null,
    metrics: result.metrics ?? null,
    counted: false,
  });
  return result;
}

// ── Enrolled profiles ────────────────────────────────────────────────────────────────────────────
async function getProfile(userId) {
  const { faceProfiles } = getCollections();
  return faceProfiles.findOne({ userId });
}

function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? dot / denom : 0;
}

async function saveProfile({ userId, email, studentId, embedding, metrics }) {
  const { faceProfiles } = getCollections();
  const now = new Date();

  // Cross-account duplicate check: guarantee 1 physical face = 1 student
  const existingProfiles = await faceProfiles.find({}, { projection: { userId: 1, embedding: 1, email: 1 } }).toArray();
  for (const other of existingProfiles) {
    if (other.userId !== userId && Array.isArray(other.embedding)) {
      const sim = cosineSimilarity(embedding, other.embedding);
      if (sim >= SIMILARITY_FLOOR) {
        throw new FaceError(
          'FACE_ALREADY_REGISTERED',
          'This face is already registered to another student account. Impersonation is not permitted.',
          409
        );
      }
    }
  }

  try {
    await faceProfiles.insertOne({
      userId,
      email,
      studentId: studentId || null,
      embedding,
      model: 'sface_2021dec',
      enrollMetrics: metrics ?? null,
      enrolledAt: now,
      updatedAt: now,
    });
  } catch (err) {
    if (err?.code === 11000) {
      throw new FaceError('ALREADY_ENROLLED', 'A face is already enrolled for this account. Ask an administrator to reset it first.', 409);
    }
    throw err;
  }
  return now;
}

async function deleteProfile(userId) {
  const { faceProfiles } = getCollections();
  const { deletedCount } = await faceProfiles.deleteOne({ userId });
  return deletedCount > 0;
}

module.exports = {
  FaceError,
  SIMILARITY_FLOOR,
  isServiceOnline,
  issueChallenge,
  hasLiveChallenge,
  assertAttemptBudget,
  runFaceCheck,
  getProfile,
  saveProfile,
  deleteProfile,
};
