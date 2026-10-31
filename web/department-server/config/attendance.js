'use strict';

// Single source of truth for the attendance rules.
//
// Defaults implement the department policy:
//   * check-in opens when a class starts and stays open for 10 minutes
//   * the student must be within 10 m of the classroom
//   * the student's face must match the face they enrolled (with a liveness challenge)
//
// Everything can be tuned through environment variables (see .env.example).

const DEFAULT_TIMEZONE = 'Asia/Dhaka';

// `devOnly` locations are only authorized (and only sent to clients) when ATTENDANCE_DEV_MODE is on,
// so a developer's personal test spot is never an accepted classroom in production.
const DEFAULT_LOCATIONS = [
  { id: 'campus', name: 'University Campus (PUST CSE Building)', lat: 24.01296, lon: 89.280835 },
  { id: 'authorized-test', name: 'Authorized Test Location (Me)', lat: 24.841355, lon: 89.381426, devOnly: true },
];

const numberFromEnv = (name, fallback, { min = 0, integer = false } = {}) => {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  const valid = Number.isFinite(value) && value >= min && (!integer || Number.isInteger(value));
  if (!valid) {
    console.warn(`[attendance] Ignoring invalid ${name}="${raw}", using ${fallback}`);
    return fallback;
  }
  return value;
};

const parseLocations = (raw, devMode) => {
  const defaults = DEFAULT_LOCATIONS.filter((l) => !l.devOnly || devMode);
  if (!raw) return defaults;
  try {
    const list = JSON.parse(raw);
    const valid = Array.isArray(list)
      ? list.filter(
          (l) =>
            l &&
            Number.isFinite(Number(l.lat)) &&
            Number.isFinite(Number(l.lon)) &&
            Math.abs(Number(l.lat)) <= 90 &&
            Math.abs(Number(l.lon)) <= 180
        )
      : [];
    if (valid.length === 0) throw new Error('no valid { name, lat, lon } entries');
    return valid.map((l, i) => ({
      id: String(l.id || `location-${i + 1}`),
      name: String(l.name || `Classroom ${i + 1}`),
      lat: Number(l.lat),
      lon: Number(l.lon),
    }));
  } catch (err) {
    console.error(`[attendance] ATTENDANCE_LOCATIONS is invalid (${err.message}); using the built-in locations.`);
    return defaults;
  }
};

const resolveTimezone = (raw) => {
  const zone = raw || DEFAULT_TIMEZONE;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return zone;
  } catch {
    console.error(`[attendance] CLASS_TIMEZONE="${zone}" is not a valid IANA time zone; using ${DEFAULT_TIMEZONE}.`);
    return DEFAULT_TIMEZONE;
  }
};

const isProduction = process.env.NODE_ENV === 'production';
const devRequested = String(process.env.ATTENDANCE_DEV_MODE || '').toLowerCase() === 'true';
if (devRequested && isProduction) {
  console.error('[attendance] ATTENDANCE_DEV_MODE is ignored because NODE_ENV=production.');
}

const devMode = devRequested && !isProduction;

const adminEmails = String(process.env.ADMIN_EMAILS || 'admin@cse.edu')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

module.exports = Object.freeze({
  windowMinutes: numberFromEnv('ATTENDANCE_WINDOW_MINUTES', 10, { min: 1 }),
  radiusMeters: numberFromEnv('ATTENDANCE_RADIUS_METERS', 200000, { min: 1 }),
  // GPS fixes worse than this are rejected: with a 10 m fence they cannot prove presence.
  maxGpsAccuracyMeters: numberFromEnv('ATTENDANCE_MAX_GPS_ACCURACY_METERS', 5000, { min: 1 }),
  timezone: resolveTimezone(process.env.CLASS_TIMEZONE),
  locations: Object.freeze(parseLocations(process.env.ATTENDANCE_LOCATIONS, devMode)),

  // Local testing only: opens test windows and relaxes the location check. Never skips face checks.
  devMode,

  adminEmails: Object.freeze(adminEmails),

  face: Object.freeze({
    url: String(process.env.FACE_SERVICE_URL || 'http://127.0.0.1:8001').replace(/\/+$/, ''),
    secret: process.env.FACE_SERVICE_SECRET || '',
    requestTimeoutMs: numberFromEnv('FACE_SERVICE_TIMEOUT_MS', 30000, { min: 1000, integer: true }),
    challengeTtlSeconds: numberFromEnv('FACE_CHALLENGE_TTL_SECONDS', 120, { min: 20, integer: true }),
    maxFailedAttempts: numberFromEnv('FACE_MAX_FAILED_ATTEMPTS', 5, { min: 1, integer: true }),
    attemptWindowMinutes: numberFromEnv('FACE_ATTEMPT_WINDOW_MINUTES', 15, { min: 1, integer: true }),
    maxFrames: 24,
    maxFrameChars: 2_000_000,
  }),
});
